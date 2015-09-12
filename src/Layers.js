
var Layers = {

  items: [],

  add: function(layer) {
    this.items.push(layer);
  },

  remove: function(layer) {
    for (var i = 0; i < this.items.length; i++) {
      if (this.items[i] === layer) {
        this.items.splice(i, 1);
        return;
      }
    }
  },

  getAttribution: function(attribution) {
    attribution = attribution || [];
    for (var i = 0; i < this.items.length; i++) {
      if (this.items[i].attribution) {
        attribution.push(this.items[i].attribution);
      }
    }
    return attribution;
  },

  //render: function(vpMatrix) {
  //  for (var i = 0; i < this.items.length; i++) {
  //    this.items[i].render(vpMatrix);
  //  }
  //},

  destroy: function() {
    for (var i = 0; i < this.items.length; i++) {
      if (this.items[i].destroy) {
        this.items[i].destroy();
      }
    }
    this.items = null;
  }
};
