const NodeHelper = require("node_helper");
const ical = require("node-ical");

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const MAX_ICAL_BYTES = 5 * 1024 * 1024;

module.exports = NodeHelper.create({
	start() {
		this.registrations = new Map();
	},

	stop() {
		for (const registration of this.registrations.values()) {
			clearInterval(registration.timer);
		}
		this.registrations.clear();
	},

	socketNotificationReceived(notification, payload) {
		if (!payload || typeof payload.identifier !== "string") {
			return;
		}

		if (notification === "SCHEDULE_REGISTER") {
			this.register(payload);
		} else if (notification === "SCHEDULE_UNREGISTER") {
			this.unregister(payload.identifier);
		}
	},

	register(payload) {
		this.unregister(payload.identifier);

		const updateInterval = this.numberInRange(payload.updateInterval, MINUTE, DAY, 15 * MINUTE);
		const futureDays = this.numberInRange(payload.futureDays, 2, 730, 365);
		const registration = { futureDays, fetching: false, timer: null };
		registration.timer = setInterval(
			() => this.fetchAndSend(payload.identifier, registration),
			updateInterval
		);
		this.registrations.set(payload.identifier, registration);
		this.fetchAndSend(payload.identifier, registration);
	},

	unregister(identifier) {
		const registration = this.registrations.get(identifier);
		if (registration) {
			clearInterval(registration.timer);
			this.registrations.delete(identifier);
		}
	},

	async fetchAndSend(identifier, registration) {
		if (registration.fetching) {
			return;
		}

		registration.fetching = true;
		try {
			const url = this.getCalendarUrl();
			const source = await this.download(url);
			const events = await this.parseEvents(source, registration.futureDays);
			this.sendSocketNotification("SCHEDULE_EVENTS", { identifier, events });
		} catch (error) {
			const reason = error && error.code ? ` (${error.code})` : "";
			console.error(`[MMM-Schedule] Calendar refresh failed${reason}`);
		} finally {
			registration.fetching = false;
		}
	},

	getCalendarUrl() {
		const value = (process.env.GOOGLE_CALENDAR_ICAL_URL || "").trim();
		if (!value) {
			throw new Error("GOOGLE_CALENDAR_ICAL_URL is not configured");
		}

		const url = new URL(value);
		if (url.protocol !== "https:") {
			throw new Error("Calendar URL must use HTTPS");
		}
		return url;
	},

	async download(url) {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 15 * 1000);

		try {
			const response = await fetch(url, {
				headers: { "User-Agent": "MMM-Schedule/1.0" },
				redirect: "follow",
				signal: controller.signal
			});

			if (!response.ok) {
				throw new Error(`Calendar request returned HTTP ${response.status}`);
			}
			if (new URL(response.url).protocol !== "https:") {
				throw new Error("Calendar redirect must use HTTPS");
			}

			const declaredSize = Number(response.headers.get("content-length"));
			if (declaredSize > MAX_ICAL_BYTES) {
				throw new Error("Calendar response is too large");
			}

			const body = Buffer.from(await response.arrayBuffer());
			if (body.length > MAX_ICAL_BYTES) {
				throw new Error("Calendar response is too large");
			}
			return body.toString("utf8");
		} finally {
			clearTimeout(timeout);
		}
	},

	async parseEvents(source, futureDays) {
		const calendar = await ical.async.parseICS(source);
		const now = new Date();
		const from = new Date(now.getTime() - DAY);
		const to = new Date(now.getTime() + futureDays * DAY);
		const result = [];

		for (const event of Object.values(calendar)) {
			if (event.type !== "VEVENT" || event.status === "CANCELLED") {
				continue;
			}

			const instances = ical.expandRecurringEvent(event, {
				from,
				to,
				expandOngoing: true
			});

			for (const instance of instances) {
				const start = new Date(instance.start);
				const end = new Date(instance.end || instance.start);
				if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= now) {
					continue;
				}

				result.push({
					id: `${instance.uid || event.uid || "event"}-${start.toISOString()}`,
					title: String(instance.summary || event.summary || "(無題)"),
					start: start.toISOString(),
					end: end.toISOString(),
					allDay: Boolean(
						instance.isFullDay ||
						event.datetype === "date" ||
						event.start?.dateOnly
					)
				});
			}
		}

		return [...new Map(result.map((event) => [event.id, event])).values()]
			.sort((left, right) => new Date(left.start) - new Date(right.start));
	},

	numberInRange(value, minimum, maximum, fallback) {
		const number = Number(value);
		return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
	}
});
