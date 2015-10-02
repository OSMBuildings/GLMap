
var Tile = function(layer, x, y, zoom) {
  this.layer = layer;
  this.x = x;
  this.y = y;
  this.zoom = zoom;
};

Tile.prototype = {
  load: function(url) {
    var image = new Image();
    image.onload = function() {
      this.layer.map.container.appendChild(image);
      this.image = image;
    }.bind(this);
    image.style.display = 'none';
    image.style.position = 'absolute';
    image.src = url;
  },

  render: function(x, y) {
    if (this.image) {
      this.image.style.display = '';
      this.image.style.left = x + 'px';
      this.image.style.top = y + 'px';
    }
  },

  destroy: function() {
    if (this.image) {
      this.layer.map.container.removeChild(this.image);
      this.image.src = '';
    }
  }
};
