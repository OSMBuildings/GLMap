
var Map = {

  zoom: 0,
  center: { x:0, y:0 },
  bounds: { minX:0, maxX:0, minY:0, maxY:0 },
  rotation: 0,
  tilt: 0,

  setZoom: function(zoom, e) {
    zoom = clamp(parseFloat(zoom), this.minZoom, this.maxZoom);
    if (this.zoom !== zoom) {
      var ratio = Math.pow(2, zoom-this.zoom);
      this.zoom = zoom;
      if (!e) {
        this.center.x *= ratio;
        this.center.y *= ratio;
      } else {
        var dx = WIDTH/2  - e.clientX;
        var dy = HEIGHT/2 - e.clientY;
        this.center.x -= dx;
        this.center.y -= dy;
        this.center.x *= ratio;
        this.center.y *= ratio;
        this.center.x += dx;
        this.center.y += dy;
      }
// updateBounds();
      Events.emit('change');
    }
    return this;
  },

  setPosition: function(position) {
    var
      latitude  = clamp(parseFloat(position.latitude), -90, 90),
      longitude = clamp(parseFloat(position.longitude), -180, 180),
      center = project(latitude, longitude, TILE_SIZE*Math.pow(2, this.zoom));
    if (this.center.x !== center.x || this.center.y !== center.y) {
      this.center.x = center.x;
      this.center.y = center.y;
// updateBounds();
      Events.emit('change');
    }
    return this;
  },

  getPosition: function() {
    return unproject(this.center.x, this.center.y, TILE_SIZE*Math.pow(2, this.zoom));
  },

  getBounds: function() {
    var
      worldSize = TILE_SIZE*Math.pow(2, this.zoom),
      nw = unproject(this.bounds.minX, this.bounds.maxY, worldSize),
      se = unproject(this.bounds.maxX, this.bounds.minY, worldSize);
    return {
      n: nw.latitude,
      w: nw.longitude,
      s: se.latitude,
      e: se.longitude
    };
  },

  setRotation: function(rotation) {
    rotation = parseFloat(rotation)%360;
    if (this.rotation !== rotation) {
      this.rotation = rotation;
// updateBounds();
      Events.emit('change');
    }
    return this;
  },

  setTilt: function(tilt) {
    tilt = clamp(parseFloat(tilt), 0, 90);
    if (this.tilt !== tilt) {
      this.tilt = tilt;
// updateBounds();
      Events.emit('change');
    }
    return this;
  },

  destroy: function() {}
};
