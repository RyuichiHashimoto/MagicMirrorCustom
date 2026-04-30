Module.register("MMM-MonthCalendar", {
	defaults: {
		updateInterval: 60 * 60 * 1000,
		weekdays: ["日", "月", "火", "水", "木", "金", "土"],
		redWeekdays: [0],
		blueWeekdays: [6],
		holidayCsvUrl: "https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv",
		holidayCsvRefreshInterval: 24 * 60 * 60 * 1000,
		holidays: [],
		additionalHolidays: [],
		showAdjacentMonths: true
	},

	start() {
		this.holidayMap = this.createHolidayMap([
			...this.config.holidays,
			...this.config.additionalHolidays
		]);
		this.requestHolidays();
		this.holidayTimer = setInterval(() => {
			this.requestHolidays();
		}, this.config.holidayCsvRefreshInterval);
		this.timer = setInterval(() => {
			this.updateDom(500);
		}, this.config.updateInterval);
	},

	getStyles() {
		return ["MMM-MonthCalendar.css"];
	},

	getDom() {
		const today = new Date();
		const year = today.getFullYear();
		const month = today.getMonth();

		const wrapper = document.createElement("div");
		wrapper.className = "mmm-month-calendar";

		const monthLabel = document.createElement("div");
		monthLabel.className = "month-calendar-title";
		monthLabel.textContent = `${year}年${month + 1}月`;
		wrapper.appendChild(monthLabel);

		const grid = document.createElement("div");
		grid.className = "month-calendar-grid";

		this.config.weekdays.forEach((weekday) => {
			const weekdayCell = document.createElement("div");
			weekdayCell.className = "weekday";
			weekdayCell.textContent = weekday;
			grid.appendChild(weekdayCell);
		});

		this.getMonthCells(year, month, today).forEach((day) => {
			const cell = document.createElement("div");
			cell.className = day.classNames.join(" ");
			cell.textContent = day.date.getDate();
			if (day.holidayName) {
				cell.title = day.holidayName;
			}
			grid.appendChild(cell);
		});

		wrapper.appendChild(grid);
		return wrapper;
	},

	getMonthCells(year, month, today) {
		const firstDay = new Date(year, month, 1);
		const start = new Date(year, month, 1 - firstDay.getDay());
		const cells = [];

		for (let i = 0; i < 42; i += 1) {
			const date = new Date(start);
			date.setDate(start.getDate() + i);

			const isCurrentMonth = date.getMonth() === month;
			const dateKey = this.getDateKey(date);
			const dayOfWeek = date.getDay();
			const holidayName = this.getHolidayName(dateKey);
			const isHoliday = Boolean(holidayName);
			const isRedWeekday = this.config.redWeekdays.includes(dayOfWeek);
			const isBlueWeekday = this.config.blueWeekdays.includes(dayOfWeek);
			const isToday =
				date.getFullYear() === today.getFullYear() &&
				date.getMonth() === today.getMonth() &&
				date.getDate() === today.getDate();

			cells.push({
				date,
				classNames: [
					"day",
					isCurrentMonth ? "current-month" : "adjacent-month",
					isRedWeekday ? "red-weekday" : "",
					isBlueWeekday ? "blue-weekday" : "",
					isHoliday ? "holiday" : "",
					isToday ? "today" : ""
				].filter(Boolean),
				holidayName
			});
		}

		return cells;
	},

	getDateKey(date) {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	},

	getHolidayName(dateKey) {
		return this.holidayMap[dateKey] || "";
	},

	createHolidayMap(holidays) {
		return holidays.reduce((acc, holiday) => {
			if (holiday.date && holiday.name) {
				acc[holiday.date] = holiday.name;
			}
			return acc;
		}, {});
	},

	requestHolidays() {
		if (!this.config.holidayCsvUrl) {
			return;
		}

		this.sendSocketNotification("FETCH_HOLIDAYS", {
			identifier: this.identifier,
			url: this.config.holidayCsvUrl,
			cacheTtl: this.config.holidayCsvRefreshInterval
		});
	},

	socketNotificationReceived(notification, payload) {
		if (notification !== "HOLIDAYS_LOADED" || payload.identifier !== this.identifier) {
			return;
		}

		this.holidayMap = this.createHolidayMap([
			...payload.holidays,
			...this.config.holidays,
			...this.config.additionalHolidays
		]);
		this.updateDom(500);
	},

	suspend() {
		clearInterval(this.timer);
		clearInterval(this.holidayTimer);
	}
});
