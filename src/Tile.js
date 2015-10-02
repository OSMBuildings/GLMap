
GLMap.Tile = function(x, y, zoom) {
  this.x = x;
  this.y = y;
  this.zoom = zoom;
};

GLMap.Tile.prototype = {
  load: function(url) {
    //Activity.setBusy();
    this.texture = new Image();
    this.texure.onload = function() {
      //Activity.setIdle();
      this.isReady = true;
    }.bind(this);
    this.texture.url = url;
  },

  destroy: function() {}
};
