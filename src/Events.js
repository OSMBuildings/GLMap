
var Events = {};

(function() {

  var listeners = {};

  Events.on = function(type, fn) {
    if (!listeners[type]) {
      listeners[type] = [];
    }
    listeners[type].push(fn);
  };

  Events.off = function(type, fn) {
    if (listeners[type]) {
      for (var i = 0, il = listeners[type].length; i<il; i++) {
        if (listeners[type][i] === fn) {
          listeners[type].splice(i, 1);
        }
      }
    }
  };

  Events.emit = function(type, payload) {
    if (listeners[type]) {
      for (var i = 0, il = listeners[type].length; i<il; i++) {
        listeners[type][i](payload);
      }
    }
  };

  Events.destroy = function() {
    listeners = null;
  };

}());
