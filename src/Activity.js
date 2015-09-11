
var Activity = {};

(function() {

  var items = [];

  Activity.setBusy = function(key) {
    if (!items.length) {
      Events.emit('busy');
    }
    if (items.indexOf(key) === -1) {
      items.push(key);
    }
  };

  Activity.setIdle = function(key) {
    if (!items.length) {
      return;
    }
    var i = items.indexOf(key);
    if (i > -1) {
      items.splice(i, 1);
    }
    if (!items.length) {
      Events.emit('idle');
    }
  };

}());
