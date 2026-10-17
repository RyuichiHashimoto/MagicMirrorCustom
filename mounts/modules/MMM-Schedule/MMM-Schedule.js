Module.register("MMM-Schedule", {
	defaults: {
		updateInterval: 15 * 60 * 1000,
		futureDays: 365,
		maxItemsPerSection: 3,
		locale: "ja-JP",
		timeZone: "Asia/Tokyo",
		fadeSpeed: 500
	},

	start() {
		this.events = [];
		this.registerCalendar();
	},

	getStyles() {
		return ["MMM-Schedule.css"];
	},

	registerCalendar() {
		this.sendSocketNotification("SCHEDULE_REGISTER", {
			identifier: this.identifier,
			updateInterval: this.config.updateInterval,
			futureDays: this.config.futureDays
		});
	},

	socketNotificationReceived(notification, payload) {
		if (
			notification !== "SCHEDULE_EVENTS" ||
			!payload ||
			payload.identifier !== this.identifier ||
			!Array.isArray(payload.events)
		) {
			return;
		}

		this.events = payload.events;
		this.updateDom(this.config.fadeSpeed);
	},

	getDom() {
		const wrapper = document.createElement("div");
		wrapper.className = "mmm-schedule";

		const title = document.createElement("div");
		title.className = "schedule-title";
		title.appendChild(document.createTextNode("SCHEDULE"));

		const titleRule = document.createElement("span");
		titleRule.className = "schedule-title-rule";
		title.appendChild(titleRule);
		wrapper.appendChild(title);

		const grouped = this.groupEvents(new Date());
		wrapper.appendChild(this.buildSection("NEXT", grouped.next, true));

		const divider = document.createElement("div");
		divider.className = "schedule-divider";
		wrapper.appendChild(divider);

		wrapper.appendChild(this.buildSection("UPCOMING", grouped.upcoming, false));
		return wrapper;
	},

	groupEvents(now) {
		const todayKey = this.dateKey(now);
		const tomorrow = new Date(now);
		tomorrow.setDate(tomorrow.getDate() + 1);
		const tomorrowKey = this.dateKey(tomorrow);
		const next = [];
		const upcoming = [];

		this.events.forEach((event) => {
			const start = new Date(event.start);
			const end = new Date(event.end);
			if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= now) {
				return;
			}

			const startKey = this.dateKey(start);
			const isHappeningToday = start <= now && this.dateKey(end) >= todayKey;
			if (startKey === todayKey || startKey === tomorrowKey || isHappeningToday) {
				next.push(event);
			} else if (start > now) {
				upcoming.push(event);
			}
		});

		return { next, upcoming };
	},

	buildSection(label, events, isNext) {
		const section = document.createElement("section");
		section.className = "schedule-section";

		const heading = document.createElement("div");
		heading.className = "schedule-section-heading";
		heading.textContent = label;
		section.appendChild(heading);

		const visibleEvents = events.slice(0, this.config.maxItemsPerSection);
		visibleEvents.forEach((event) => {
			const row = document.createElement("div");
			row.className = "schedule-event";

			const when = document.createElement("div");
			when.className = "schedule-event-when";
			when.textContent = isNext ? this.formatNextDate(event) : this.formatUpcomingDate(event);

			const summary = document.createElement("div");
			summary.className = "schedule-event-summary";
			summary.textContent = event.title;

			row.appendChild(when);
			row.appendChild(summary);
			section.appendChild(row);
		});

		const hiddenCount = events.length - visibleEvents.length;
		if (hiddenCount > 0) {
			const more = document.createElement("div");
			more.className = "schedule-more";
			more.textContent = `+ ${hiddenCount}件`;
			section.appendChild(more);
		}

		return section;
	},

	formatNextDate(event) {
		const start = new Date(event.start);
		const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
		const dayLabel = this.dateKey(start) === this.dateKey(tomorrow) ? "明日" : "今日";
		const timeLabel = event.allDay
			? "終日"
			: new Intl.DateTimeFormat(this.config.locale, {
				hour: "2-digit",
				minute: "2-digit",
				hour12: false,
				timeZone: this.config.timeZone
			}).format(start);

		return `${dayLabel} ${timeLabel}`;
	},

	formatUpcomingDate(event) {
		return new Intl.DateTimeFormat(this.config.locale, {
			month: "2-digit",
			day: "2-digit",
			timeZone: this.config.timeZone
		}).format(new Date(event.start));
	},

	dateKey(date) {
		const parts = new Intl.DateTimeFormat("en-CA", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			timeZone: this.config.timeZone
		}).formatToParts(date);
		const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
		return `${values.year}-${values.month}-${values.day}`;
	},

	suspend() {
		this.sendSocketNotification("SCHEDULE_UNREGISTER", { identifier: this.identifier });
	},

	resume() {
		this.registerCalendar();
	}
});
