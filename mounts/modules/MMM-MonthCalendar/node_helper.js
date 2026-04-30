const https = require("https");
const NodeHelper = require("node_helper");
const { TextDecoder } = require("util");

module.exports = NodeHelper.create({
	start() {
		this.cache = {};
	},

	socketNotificationReceived(notification, payload) {
		if (notification !== "FETCH_HOLIDAYS") {
			return;
		}

		this.fetchHolidays(payload)
			.then((holidays) => {
				this.sendSocketNotification("HOLIDAYS_LOADED", {
					identifier: payload.identifier,
					holidays
				});
			})
			.catch((error) => {
				console.error(`[MMM-MonthCalendar] Failed to fetch holidays: ${error.message}`);
				this.sendSocketNotification("HOLIDAYS_LOADED", {
					identifier: payload.identifier,
					holidays: []
				});
			});
	},

	async fetchHolidays(payload) {
		const cached = this.cache[payload.url];
		if (cached && Date.now() - cached.fetchedAt < payload.cacheTtl) {
			return cached.holidays;
		}

		const buffer = await this.download(payload.url);
		const text = this.decodeCsv(buffer);
		const holidays = this.parseCsv(text);
		this.cache[payload.url] = {
			fetchedAt: Date.now(),
			holidays
		};
		return holidays;
	},

	download(url) {
		return new Promise((resolve, reject) => {
			https
				.get(url, (response) => {
					if (response.statusCode !== 200) {
						reject(new Error(`HTTP ${response.statusCode}`));
						response.resume();
						return;
					}

					const chunks = [];
					response.on("data", (chunk) => chunks.push(chunk));
					response.on("end", () => resolve(Buffer.concat(chunks)));
				})
				.on("error", reject);
		});
	},

	decodeCsv(buffer) {
		return new TextDecoder("shift_jis").decode(buffer);
	},

	parseCsv(text) {
		return text
			.trim()
			.split(/\r?\n/)
			.slice(1)
			.map((line) => line.split(","))
			.map(([date, name]) => ({
				date: this.normalizeDate(date),
				name: (name || "").trim()
			}))
			.filter((holiday) => holiday.date && holiday.name);
	},

	normalizeDate(date) {
		const match = date.trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
		if (!match) {
			return "";
		}

		const [, year, month, day] = match;
		return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
	}
});
