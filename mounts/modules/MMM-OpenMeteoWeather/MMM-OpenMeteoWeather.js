Module.register("MMM-OpenMeteoWeather", {
	defaults: {
		latitude: 34.8164,
		longitude: 135.5686,
		locationName: "大阪府茨木市",
		timezone: "Asia/Tokyo",
		forecastDays: 3,
		updateInterval: 15 * 60 * 1000,
		animationSpeed: 500
	},

	start() {
		this.weather = null;
		this.error = "";
		this.requestWeather();
		this.updateTimer = setInterval(() => this.requestWeather(), this.config.updateInterval);
	},

	getStyles() {
		return ["MMM-OpenMeteoWeather.css"];
	},

	getDom() {
		const wrapper = document.createElement("div");
		wrapper.className = "mmm-openmeteo-weather";

		const heading = document.createElement("div");
		heading.className = "openmeteo-heading";
		heading.textContent = this.config.locationName;
		wrapper.appendChild(heading);

		if (!this.weather) {
			const status = document.createElement("div");
			status.className = `openmeteo-status${this.error ? " is-error" : ""}`;
			status.textContent = this.error || "天気を取得しています…";
			wrapper.appendChild(status);
			return wrapper;
		}

		const forecast = document.createElement("div");
		forecast.className = "openmeteo-forecast";

		this.weather.days.forEach((day, index) => {
			forecast.appendChild(this.createDay(day, index));
		});
		wrapper.appendChild(forecast);

		const footer = document.createElement("div");
		footer.className = "openmeteo-footer";
		footer.textContent = this.error
			? "更新できないため、直前の予報を表示中"
			: `Open-Meteo ・ ${this.formatUpdatedAt(this.weather.fetchedAt)} 更新`;
		wrapper.appendChild(footer);

		return wrapper;
	},

	createDay(day, index) {
		const card = document.createElement("section");
		card.className = "openmeteo-day";

		const title = document.createElement("div");
		title.className = "openmeteo-day-title";
		title.textContent = `${this.getRelativeDayLabel(index)} (${this.formatMonthDay(day.date)})`;
		card.appendChild(title);

		const periods = document.createElement("div");
		periods.className = "openmeteo-periods";
		periods.appendChild(this.createPeriod("昼", day.daytime, false));
		periods.appendChild(this.createPeriod("夜", day.nighttime, true));
		card.appendChild(periods);

		return card;
	},

	createPeriod(label, period, isNight) {
		const element = document.createElement("div");
		element.className = "openmeteo-period";

		const periodLabel = document.createElement("div");
		periodLabel.className = "openmeteo-period-label";
		periodLabel.textContent = label;
		element.appendChild(periodLabel);

		const icon = document.createElement("div");
		icon.className = "openmeteo-icon";
		icon.textContent = this.getWeatherIcon(period.weatherCode, isNight);
		icon.title = this.getWeatherLabel(period.weatherCode);
		icon.setAttribute("aria-label", this.getWeatherLabel(period.weatherCode));
		element.appendChild(icon);

		const temperature = document.createElement("div");
		temperature.className = `openmeteo-temperature ${isNight ? "is-night" : "is-day"}`;
		temperature.textContent = `${Math.round(period.temperature)}°`;
		element.appendChild(temperature);

		const precipitation = document.createElement("div");
		precipitation.className = "openmeteo-precipitation";
		precipitation.textContent = `${Math.round(period.precipitationProbability)}%`;
		precipitation.title = "降水確率";
		element.appendChild(precipitation);

		return element;
	},

	requestWeather() {
		this.sendSocketNotification("OPENMETEO_FETCH", {
			identifier: this.identifier,
			latitude: this.config.latitude,
			longitude: this.config.longitude,
			timezone: this.config.timezone,
			forecastDays: this.config.forecastDays
		});
	},

	socketNotificationReceived(notification, payload) {
		if (payload.identifier !== this.identifier) {
			return;
		}

		if (notification === "OPENMETEO_WEATHER") {
			this.weather = payload.weather;
			this.error = "";
			this.updateDom(this.config.animationSpeed);
		}

		if (notification === "OPENMETEO_ERROR") {
			this.error = "天気を取得できませんでした";
			this.updateDom(this.config.animationSpeed);
		}
	},

	getRelativeDayLabel(index) {
		return ["今日", "明日", "明後日"][index] || `${index + 1}日後`;
	},

	formatMonthDay(dateText) {
		const [, month, day] = dateText.split("-");
		return `${Number(month)}/${Number(day)}`;
	},

	formatUpdatedAt(dateText) {
		return new Intl.DateTimeFormat("ja-JP", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
			timeZone: this.config.timezone
		}).format(new Date(dateText));
	},

	getWeatherIcon(code, isNight) {
		if (code === 0) return isNight ? "☾" : "☀";
		if ([1, 2].includes(code)) return isNight ? "☾" : "🌤";
		if (code === 3) return "☁";
		if ([45, 48].includes(code)) return "≋";
		if ([51, 53, 55, 56, 57, 80, 81, 82].includes(code)) return "🌦";
		if ([61, 63, 65, 66, 67].includes(code)) return "☂";
		if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄";
		if ([95, 96, 99].includes(code)) return "⚡";
		return "—";
	},

	getWeatherLabel(code) {
		if (code === 0) return "快晴";
		if ([1, 2].includes(code)) return "晴れ時々曇り";
		if (code === 3) return "曇り";
		if ([45, 48].includes(code)) return "霧";
		if ([51, 53, 55, 56, 57].includes(code)) return "霧雨";
		if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "雨";
		if ([71, 73, 75, 77, 85, 86].includes(code)) return "雪";
		if ([95, 96, 99].includes(code)) return "雷雨";
		return "天気不明";
	},

	suspend() {
		clearInterval(this.updateTimer);
	}
});
