// MMM-LaunchLibrary.js

"use strict";

function teaSign(delta) {
  return (delta > 0) ? "-" : "+";
}

function teaTime(config, timestamp) {
  function z(n) { return ((n < 10) ? "0" : "") + n; }
  var now = (new Date().getTime() * 0.001) | 0;
  var delta = Math.abs(timestamp - now);
  var days = (delta / 86400) | 0;
  var hours = z(((delta % 86400) / 3600) | 0);
  var minutes = z(((delta % 3600) / 60) | 0);
  var seconds = config.displaySeconds ? `:${z(delta % 60)}` : "";

  if (days > 0) {
    return `T ${teaSign(timestamp - now)} ${days}D ${hours}:${minutes}${seconds}`;
  } else {
    return `T ${teaSign(timestamp - now)} ${hours}:${minutes}${seconds}`;
  }
}

Module.register("MMM-LaunchLibrary", {
  // Default module config
  defaults: {
    displayUpdateInterval: 1,
    updateInterval: 60 * 60,
    rotateInterval: 60,
    maximumEntries: 1,
    locations: [12],
    useLocalFeed: false,
    displaySeconds: true,
  },

  start: function() {
    var self = this;

    self.content = null;
    self.launches = [];
    self.launchIndex = 0;
    self.lastRotation = 0;

    self.getData();
    setInterval(function() { self.getData(); }, self.config.updateInterval * 1000);
    setInterval(function() { self.tick(); }, self.config.displayUpdateInterval * 1000);
  },

  notificationReceived: function(notification, payload, sender) {
    // Do nothing
  },

  socketNotificationReceived: function(notification, payload) {
    var self = this;

    if (notification === "LAUNCHLIBRARY_RESULTS") {
      var oldLaunchCount = self.launches.length;

      self.launches = payload.slice(0, self.config.maximumEntries);
      self.launchIndex = self.launchIndex % (self.launches.length || 1);

      if ((oldLaunchCount === 0) !== (self.launches.length === 0)) {
        self.updateContent();
      }
    }
  },

  getData: function() {
    var self = this;

    self.sendSocketNotification("LAUNCHLIBRARY_FETCH", self.config);
  },

  getDom: function() {
    const self = this;

    if (self.content === null) {
      self.content = document.createElement("div");
      self.content.className += "small";
      self.content.innerHTML = self.getContent();
    }

    return self.content;
  },

  getContent: function() {
    var self = this;

    if (self.launches.length > 0) {
      var launch = self.launches[self.launchIndex];
      return `${launch.name}: <div style='display: inline-block;'>${teaTime(self.config, launch.wsstamp)}</div>`;
    } else {
      return "";
    }
  },

  updateContent: function() {
    const self = this;
    const html = self.getContent();

    if (html !== self.lastContent) {
      self.lastContent = html;

      if (!self.config.useLocalFeed) {
        self.content.innerHTML = html;
      } else if (html.length > 0) {
        self.sendNotification("LOCALFEED_ADD_ITEM", { id: "nextLaunch", html: html, duration: 90 });
      } else {
        self.sendNotification("LOCALFEED_REMOVE_ITEM", { id: "nextLaunch" });
      }
    }
  },

  tick: function() {
    var self = this;
    var now = (new Date().getTime() * 0.001) | 0;

    if (now - self.lastRotation >= self.config.rotateInterval) {
      self.launchIndex = (self.launchIndex + 1) % (self.launches.length || 1);
      self.lastRotation = now;
    }

    self.updateContent();
  }
});
