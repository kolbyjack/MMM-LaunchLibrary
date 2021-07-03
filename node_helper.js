"use strict";

const NodeHelper = require("node_helper");
const https = require("https");

module.exports = NodeHelper.create({
  start: function() {
    var self = this;

    console.log("Starting node helper for: " + self.name);
  },

  socketNotificationReceived: function(notification, payload) {
    var self = this;

    if (notification === "LAUNCHLIBRARY_FETCH") {
      self.fetchData(payload);
    }
  },

  request: function(options, callback) {
    var error = undefined;
    var response = undefined;
    var body = "";

    const req = https.request(options.url, options, res => {
      response = res;
      res.on("data", chunk => body += chunk);
      res.on("error", e => error = e);
    });

    req.on("error", e => error = e);
    req.on("close", () => callback(error, response, body));

    req.end(options.body);
  },

  fetchData: function(config) {
    var self = this;
    var url = "https://ll.thespacedevs.com/2.0.0/launch/upcoming/?limit=10&mode=list&status=1";
    var locations = config.locations || [];

    if (locations.length > 0) {
      url += `&location__ids=${locations.join(",")}`;
    }

    self.request({
      url: url,
      method: "GET",
      headers: { "cache-control": "no-cache" },
    },
    function(error, response, body) {
      if (error) {
        self.sendSocketNotification("LAUNCHLIBRARY_FETCHERROR", { error: error });
        return console.error(" ERROR - MMM-LaunchLibrary: " + error);
      }

      if (response.statusCode === 200) {
        var launches = JSON.parse(body).results;
        var result = launches.
            map(l => { return { name: l.name, wsstamp: Date.parse(l.window_start) / 1000 | 0 }; }).
            filter(l => l.wsstamp > 0);
        self.sendSocketNotification("LAUNCHLIBRARY_RESULTS", result);
      }
    });
  },
});
