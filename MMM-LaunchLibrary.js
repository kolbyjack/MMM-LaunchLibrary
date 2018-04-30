// MMM-LaunchLibrary.js

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
  },

  start: function() {
    var self = this;

    self.launches = null;
    self.launchIndex = 0;
    self.lastUpdate = (new Date().getTime() * 0.001) | 0;
    self.lastRotation = self.lastUpdate;

    self.getData();
    setInterval(function() { self.getData(); }, self.config.updateInterval * 1000);
  },

  socketNotificationReceived: function(notification, payload) {
    var self = this;
    var initialUpdate = (self.launches === null);

    if (notification === "LAUNCHLIBRARY_RESULTS") {
      self.launches = payload.launches.slice(0, self.config.maximumEntries);
      self.launchIndex = self.launchIndex % self.launches.length;

      if (initialUpdate) {
        self.updateDom();

        setInterval(function() {
          var now = (new Date().getTime() * 0.001) | 0;

          if (now !== self.lastUpdate) {
            self.lastUpdate = now;

            if (now - self.lastRotation >= self.config.rotateInterval) {
              self.launchIndex = (self.launchIndex + 1) % self.launches.length;
              self.lastRotation = now;
            }

            self.updateDom();
          }
        }, 250);
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
    if (self.launches !== null) {
      var launch = self.launches[self.launchIndex];
      wrapper.innerHTML = sprintf("{}: <div style='display: inline-block;'>{}</div>", launch.name, teaTime(launch.wsstamp * 1000));
    }

    return wrapper;
  }
});
