"use strict";

const NodeHelper = require("node_helper");
const request = require("request");

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

  fetchData: function(config) {
    var self = this;

    request({
      url: "https://launchlibrary.net/1.4/launch?next=60&mode=verbose",
      method: "GET",
      headers: { "cache-control": "no-cache" },
    },
    function(error, response, body) {
      if (error) {
        self.sendSocketNotification("LAUNCHLIBRARY_FETCHERROR", { error: error });
        return console.error(" ERROR - MMM-LaunchLibrary: " + error);
      }

      if (response.statusCode === 200) {
        var result = JSON.parse(body);
        var locations = config.locations || [];
        result.launches = result.launches.filter(l => l.wsstamp !== 0 && (locations.length === 0 || locations.includes(l.location.id)));
        self.sendSocketNotification("LAUNCHLIBRARY_RESULTS", result);
      }
    });
  },
});
