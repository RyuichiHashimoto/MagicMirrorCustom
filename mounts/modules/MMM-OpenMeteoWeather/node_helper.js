const https = require("https");
const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({
	socketNotificationReceived(notification, payload) {
		if (notification !== "OPENMETEO_FETCH") {
			return;
		}

		this.fetchWeather(payload)
			.then((weather) => {
				this.sendSocketNotification("OPENMETEO_WEATHER", {
					identifier: payload.identifier,
					weather
				});
			})
			.catch((error) => {
				console.error(`[MMM-OpenMeteoWeather] Failed to fetch weather: ${error.message}`);
				this.sendSocketNotification("OPENMETEO_ERROR", {
					identifier: payload.identifier
				});
			});
	},

	async fetchWeather(payload) {
		const latitude = this.toCoordinate(payload.latitude, -90, 90, "latitude");
		const longitude = this.toCoordinate(payload.longitude, -180, 180, "longitude");
		const forecastDays = Math.min(7, Math.max(1, Number(payload.forecastDays) || 3));
		const timezone = typeof payload.timezone === "string" ? payload.timezone : "Asia/Tokyo";
		const url = new URL("https://api.open-meteo.com/v1/forecast");

		url.searchParams.set("latitude", latitude);
		url.searchParams.set("longitude", longitude);
		url.searchParams.set("hourly", "temperature_2m,precipitation_probability,weather_code");
		url.searchParams.set("timezone", timezone);
		url.searchParams.set("forecast_days", forecastDays);

		const response = await this.downloadJson(url);
		return this.normalize(response, forecastDays);
	},

	normalize(response, forecastDays) {
		const hourly = response.hourly;
		if (!hourly || !Array.isArray(hourly.time)) {
			throw new Error("Open-Meteo response did not include hourly data");
		}

		const rows = hourly.time.map((time, index) => ({
			time,
			temperature: hourly.temperature_2m[index],
			precipitationProbability: hourly.precipitation_probability[index],
			weatherCode: hourly.weather_code[index]
		}));
		const dates = [...new Set(rows.map((row) => row.time.slice(0, 10)))].slice(0, forecastDays);
		const days = dates.map((date) => ({
			date,
			daytime: this.findPeriod(rows, date, "12:00"),
			nighttime: this.findPeriod(rows, date, "21:00")
		}));

		if (!days.length) {
			throw new Error("Open-Meteo response contained no forecast days");
		}

		return {
			fetchedAt: new Date().toISOString(),
			days
		};
	},

	findPeriod(rows, date, time) {
		const row = rows.find((item) => item.time === `${date}T${time}`);
		if (!row || !Number.isFinite(row.temperature) || !Number.isFinite(row.weatherCode)) {
			throw new Error(`Missing forecast for ${date} ${time}`);
		}

		return {
			temperature: row.temperature,
			precipitationProbability: Number.isFinite(row.precipitationProbability)
				? row.precipitationProbability
				: 0,
			weatherCode: row.weatherCode
		};
	},

	toCoordinate(value, min, max, name) {
		const number = Number(value);
		if (!Number.isFinite(number) || number < min || number > max) {
			throw new Error(`Invalid ${name}`);
		}
		return String(number);
	},

	downloadJson(url) {
		return new Promise((resolve, reject) => {
			const request = https.get(url, { timeout: 10000 }, (response) => {
				if (response.statusCode !== 200) {
					reject(new Error(`HTTP ${response.statusCode}`));
					response.resume();
					return;
				}

				const chunks = [];
				response.setEncoding("utf8");
				response.on("data", (chunk) => chunks.push(chunk));
				response.on("end", () => {
					try {
						resolve(JSON.parse(chunks.join("")));
					} catch (error) {
						reject(new Error(`Invalid JSON: ${error.message}`));
					}
				});
			});

			request.on("timeout", () => request.destroy(new Error("Request timed out")));
			request.on("error", reject);
		});
	}
});
