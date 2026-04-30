const http = require("http");
const https = require("https");
const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({
	socketNotificationReceived(notification, payload) {
		if (notification !== "RSS_ROTATOR_FETCH") {
			return;
		}

		this.fetchAll(payload.feeds, payload.maxItems)
			.then((items) => {
				this.sendSocketNotification("RSS_ROTATOR_ITEMS", {
					identifier: payload.identifier,
					items
				});
			})
			.catch((error) => {
				console.error(`[MMM-RssRotator] Failed to fetch RSS: ${error.message}`);
				this.sendSocketNotification("RSS_ROTATOR_ITEMS", {
					identifier: payload.identifier,
					items: []
				});
			});
	},

	async fetchAll(feeds, maxItems) {
		const results = await Promise.all(
			feeds.map((feed) =>
				this.fetchFeed(feed).catch((error) => {
					console.error(`[MMM-RssRotator] ${feed.title}: ${error.message}`);
					return [];
				})
			)
		);

		return results
			.flat()
			.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
			.slice(0, maxItems);
	},

	async fetchFeed(feed) {
		const xml = await this.download(feed.url);
		const channelTitle = this.decodeEntities(this.firstMatch(xml, /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/i));
		const items = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)];

		return items.map((match) => {
			const item = match[0];
			const title = this.decodeEntities(this.firstMatch(item, /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/i));
			const description = this.cleanDescription(this.firstMatch(item, /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/i));
			const pubDate = this.firstMatch(item, /<pubDate>([\s\S]*?)<\/pubDate>/i);

			return {
				feedTitle: feed.title || channelTitle || "RSS",
				title,
				description,
				publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString()
			};
		}).filter((item) => item.title);
	},

	download(url) {
		const client = url.startsWith("https:") ? https : http;

		return new Promise((resolve, reject) => {
			client
				.get(url, (response) => {
					if ([301, 302, 307, 308].includes(response.statusCode) && response.headers.location) {
						resolve(this.download(response.headers.location));
						return;
					}
					if (response.statusCode !== 200) {
						reject(new Error(`HTTP ${response.statusCode}`));
						response.resume();
						return;
					}

					const chunks = [];
					response.setEncoding("utf8");
					response.on("data", (chunk) => chunks.push(chunk));
					response.on("end", () => resolve(chunks.join("")));
				})
				.on("error", reject);
		});
	},

	firstMatch(text, regex) {
		const match = text.match(regex);
		return match ? (match[1] || match[2] || "").trim() : "";
	},

	cleanDescription(description) {
		return this.decodeEntities(description)
			.replace(/<[^>]+>/g, "")
			.replace(/\s+/g, " ")
			.trim();
	},

	decodeEntities(text) {
		return text
			.replace(/&amp;/g, "&")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&quot;/g, "\"")
			.replace(/&#39;/g, "'");
	}
});
