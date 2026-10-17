/* Config Sample
 *
 * For more information on how you can configure this file
 * see https://docs.magicmirror.builders/configuration/introduction.html
 * and https://docs.magicmirror.builders/modules/configuration.html
 *
 * You can use environment variables using a `config.js.template` file instead of `config.js`
 * which will be converted to `config.js` while starting. For more information
 * see https://docs.magicmirror.builders/configuration/introduction.html#enviromnent-variables
 */
const modules = [
	{
		module: "alert",
	},
	{
		module: "MMM-RssRotator",
		position: "top_left",
		config: {
			feeds: [
				{ title: "NHK NEWS", url: "https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml" },
				{ title: "ITメディア", url: "https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml" },
				{ title: "Impress Watch", url: "https://www.watch.impress.co.jp/data/rss/1.0/ipw/feed.rdf" },
				{ title: "TechCrunch AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/" },
				{ title: "The Hacker News", url: "http://thehackernews.com/feeds/posts/default" },
				{ title: "Security NEXT", url: "http://www.security-next.com/feed" }
			],
			fetchInterval: 5 * 60 * 1000,
			rotateInterval: 10 * 1000,
			maxItems: 60
		}
	},
	{
		module: "MMM-CustomClock",
		position: "top_right",
		config: {
			locale: "ja-JP",
			dateSeparator: ", ",
			showSeconds: true
		}
	},
	{
		module: "MMM-OpenMeteoWeather",
		position: "top_right",
		config: {
			latitude: 34.8164,
			longitude: 135.5686,
			timezone: "Asia/Tokyo",
			forecastDays: 3,
			updateInterval: 60 * 60 * 1000
		}
	},
	{
		module: "MMM-Schedule",
		position: "top_right",
		config: {
			locale: "ja-JP",
			timeZone: "Asia/Tokyo",
			updateInterval: 15 * 60 * 1000,
			futureDays: 365,
			maxItemsPerSection: 3
		}
	},
];

let config = {
	address: "0.0.0.0",	// Address to listen on, can be:
	// - "localhost", "127.0.0.1", "::1" to listen on loopback interface
	// - another specific IPv4/6 to listen on a specific interface
	// - "0.0.0.0", "::" to listen on any interface
	// Default, when address config is left out or empty, is "localhost"
	port: 8080,
	basePath: "/",	// The URL path where MagicMirror² is hosted. If you are using a Reverse proxy
	// you must set the sub path here. basePath must end with a /
	ipWhitelist: [],	// Set [] to allow all IP addresses
	// or add a specific IPv4 of 192.168.1.5 :
	// ["127.0.0.1", "::ffff:127.0.0.1", "::1", "::ffff:192.168.1.5"],
	// or IPv4 range of 192.168.3.0 --> 192.168.3.15 use CIDR format :
	// ["127.0.0.1", "::ffff:127.0.0.1", "::1", "::ffff:192.168.3.0/28"],

	useHttps: false,			// Support HTTPS or not, default "false" will use HTTP
	httpsPrivateKey: "",	// HTTPS private key path, only require when useHttps is true
	httpsCertificate: "",	// HTTPS Certificate path, only require when useHttps is true

	language: "ja",
	locale: "ja-JP",   // this variable is provided as a consistent location
	// it is currently only used by 3rd party modules. no MagicMirror code uses this value
	// as we have no usage, we  have no constraints on what this field holds
	// see https://en.wikipedia.org/wiki/Locale_(computer_software) for the possibilities

	logLevel: ["INFO", "LOG", "WARN", "ERROR"], // Add "DEBUG" for even more logging
	timeFormat: 24,
	units: "metric",

	modules
};

/*************** DO NOT EDIT THE LINE BELOW ***************/
if (typeof module !== "undefined") { module.exports = config; }
