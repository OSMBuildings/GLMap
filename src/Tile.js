
GLMap.Tile = function(x, y, zoom) {
  this.x = x;
  this.y = y;
  this.zoom = zoom;
};

GLMap.Tile.prototype = {
  load: function() {},
  destroy: function() {}
};
