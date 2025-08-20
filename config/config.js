let config = {
  modules: [
    {
      module: "clock",
      position: "top_left",
    },
    {
      module: "compliments",
      position: "lower_third",
    },
    {
	    module: "newsfeed",
	    position: "bottom_bar",
	    animateIn: "slideInLeft",
	    animateOut: "slideOutRight",
	    config: {	  
		    feeds: [
			  {
				  title: "New York Times",
				  url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml"
			  }
		    ],
		    showSourceTitle: true,
		    showPublishDate: true,
		    broadcastNewsFeeds: true,
		    broadcastNewsUpdates: true
	    }
    },
  ],
};
