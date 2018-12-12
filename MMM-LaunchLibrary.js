// MMM-LaunchLibrary.js

"use strict";

function sprintf(fmt) {
  var parts = fmt.split("{}");
  var message = parts[0];
  var i;

  for (i = 1; i < parts.length; ++i) {
    message += arguments[i] + parts[i];
  }

  return message;
}

function teaTime(timestamp) {
  function z(n) { return ((n < 10) ? "0" : "") + n; }
  var now = new Date().getTime();
  var delta = (Math.abs(timestamp - now) * 0.001) | 0;
  var days = (delta / 86400) | 0;
  var hours = z(((delta % 86400) / 3600) | 0);
  var minutes = z(((delta % 3600) / 60) | 0);
  var seconds = z(delta % 60);

  if (days > 0) {
    return sprintf("T {} {}D {}:{}:{}", (timestamp > now) ? "-" : "+", days, hours, minutes, seconds);
  } else {
    return sprintf("T {} {}:{}:{}", (timestamp > now) ? "-" : "+", hours, minutes, seconds);
  }
}

Module.register("MMM-LaunchLibrary", {
  // Default module config
  defaults: {
    updateInterval: 60 * 60,
    rotateInterval: 60,
    maximumEntries: 1,
    locations: [16, 17],
    useLocalFeed: false,
  },

  start: function() {
    var self = this;

    self.launches = [];
    self.launchIndex = 0;
    self.lastRotation = 0;

    self.getData();
    setInterval(function() { self.getData(); }, self.config.updateInterval * 1000);
    setInterval(function() { self.tick(); }, 1000);
  },

  notificationReceived: function(notification, payload, sender) {
    // Do nothing
  },

  socketNotificationReceived: function(notification, payload) {
    var self = this;

    if (notification === "LAUNCHLIBRARY_RESULTS") {
      var oldLaunchCount = self.launches.length;

      self.launches = payload.launches.slice(0, self.config.maximumEntries);
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
    var self = this;
    var wrapper = document.createElement("div");

    wrapper.className += "small";
    wrapper.innerHTML = self.getContent();

    return wrapper;
  },

  getContent: function() {
    var self = this;

    if (self.launches.length > 0) {
      var launch = self.launches[self.launchIndex];
      return sprintf("{}: <div style='display: inline-block;'>{}</div>", launch.name, teaTime(launch.wsstamp * 1000));
    } else {
      return "";
    }
  },

  updateContent: function() {
    var self = this;

    if (self.config.useLocalFeed) {
      var html = self.getContent();

      if (html !== self.lastContent) {
        self.lastContent = html;
        if (html.length > 0) {
          self.sendNotification("LOCALFEED_ADD_ITEM", { id: "nextLaunch", html: html, duration: 3 });
        } else {
          self.sendNotification("LOCALFEED_REMOVE_ITEM", { id: "nextLaunch" });
        }
      }
    } else {
      self.updateDom();
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
