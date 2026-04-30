Module.register("MMM-CustomClock", {
	defaults: {
		updateInterval: 1000,
		locale: "ja-JP",
		dateOptions: {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric"
		},
		dateSeparator: ", ",
		showSeconds: true
	},

	start() {
		this.timer = setInterval(() => {
			this.updateDom(0);
		}, this.config.updateInterval);
	},

	getStyles() {
		return ["MMM-CustomClock.css"];
	},

	getDom() {
		const now = new Date();
		const wrapper = document.createElement("div");
		wrapper.className = "mmm-custom-clock";

		const date = document.createElement("div");
		date.className = "custom-clock-date";
		date.textContent = this.formatDate(now);
		wrapper.appendChild(date);

		const time = document.createElement("div");
		time.className = "custom-clock-time";

		const hoursMinutes = document.createElement("span");
		hoursMinutes.className = "custom-clock-hours-minutes";
		hoursMinutes.textContent = this.formatHoursMinutes(now);
		time.appendChild(hoursMinutes);

		if (this.config.showSeconds) {
			const seconds = document.createElement("span");
			seconds.className = "custom-clock-seconds";
			seconds.textContent = this.pad(now.getSeconds());
			time.appendChild(seconds);
		}

		wrapper.appendChild(time);
		return wrapper;
	},

	formatDate(date) {
		const parts = new Intl.DateTimeFormat(this.config.locale, this.config.dateOptions)
			.formatToParts(date)
			.reduce((acc, part) => {
				acc[part.type] = part.value;
				return acc;
			}, {});

		const weekday = parts.weekday.replace("曜日", "");
		return `${parts.year}/${parts.month}/${parts.day} (${weekday})`;
	},

	formatHoursMinutes(date) {
		return `${this.pad(date.getHours())}:${this.pad(date.getMinutes())}`;
	},

	pad(value) {
		return String(value).padStart(2, "0");
	},

	suspend() {
		clearInterval(this.timer);
	}
});
