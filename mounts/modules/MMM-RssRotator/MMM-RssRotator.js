Module.register("MMM-RssRotator", {
	defaults: {
		feeds: [],
		fetchInterval: 5 * 60 * 1000,
		rotateInterval: 15 * 1000,
		maxItems: 30,
		randomize: true,
		showFeedTitle: true,
		showPublishedAgo: true,
		emptyText: "ニュースを取得中..."
	},

	start() {
		this.items = [];
		this.activeIndex = 0;
		this.requestFeeds();
		this.fetchTimer = setInterval(() => this.requestFeeds(), this.config.fetchInterval);
		this.rotateTimer = setInterval(() => this.showNextItem(), this.config.rotateInterval);
	},

	getStyles() {
		return ["MMM-RssRotator.css"];
	},

	getDom() {
		const wrapper = document.createElement("div");
		wrapper.className = "mmm-rss-rotator";

		const item = this.items[this.activeIndex];
		if (!item) {
			const empty = document.createElement("div");
			empty.className = "rss-empty";
			empty.textContent = this.config.emptyText;
			wrapper.appendChild(empty);
			return wrapper;
		}

		if (this.config.showFeedTitle) {
			const feed = document.createElement("div");
			feed.className = "rss-feed";
			feed.textContent = item.feedTitle;
			wrapper.appendChild(feed);
		}

		const title = document.createElement("div");
		title.className = "rss-title";
		title.textContent = item.title;
		wrapper.appendChild(title);

		const description = document.createElement("div");
		description.className = item.description ? "rss-description" : "rss-description rss-description-empty";
		description.textContent = item.description || "(詳細なし)";
		wrapper.appendChild(description);

		if (this.config.showPublishedAgo && item.publishedAt) {
			const meta = document.createElement("div");
			meta.className = "rss-meta";
			meta.textContent = this.formatAgo(new Date(item.publishedAt));
			wrapper.appendChild(meta);
		}

		return wrapper;
	},

	requestFeeds() {
		this.sendSocketNotification("RSS_ROTATOR_FETCH", {
			identifier: this.identifier,
			feeds: this.config.feeds,
			maxItems: this.config.maxItems
		});
	},

	showNextItem() {
		if (this.items.length <= 1) {
			return;
		}

		this.activeIndex = (this.activeIndex + 1) % this.items.length;
		this.updateDom(500);
	},

	socketNotificationReceived(notification, payload) {
		if (notification !== "RSS_ROTATOR_ITEMS" || payload.identifier !== this.identifier) {
			return;
		}

		this.items = this.config.randomize ? this.shuffleItems(payload.items) : payload.items;
		this.activeIndex = this.getInitialIndex();
		this.updateDom(500);
	},

	shuffleItems(items) {
		const shuffled = [...items];
		for (let i = shuffled.length - 1; i > 0; i -= 1) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
	},

	getInitialIndex() {
		if (!this.config.randomize || this.items.length === 0) {
			return 0;
		}
		return Math.floor(Math.random() * this.items.length);
	},

	formatAgo(date) {
		const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
		if (diffMinutes < 1) {
			return "たった今";
		}
		if (diffMinutes < 60) {
			return `${diffMinutes}分前`;
		}

		const diffHours = Math.floor(diffMinutes / 60);
		if (diffHours < 24) {
			return `${diffHours}時間前`;
		}

		return `${Math.floor(diffHours / 24)}日前`;
	},

	suspend() {
		clearInterval(this.fetchTimer);
		clearInterval(this.rotateTimer);
	}
});
