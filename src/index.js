
var
  GL,
  WIDTH = 0,
  HEIGHT = 0;

var GLMap = function(containerId, options) {
  options = options || {};

  var container = document.getElementById(containerId);

  this.attribution = document.createElement('DIV');
  this.attribution.setAttribute('style', 'position:absolute;right:0;bottom:0;padding:1px 3px;background:rgba(255,255,255,0.5);font:11px sans-serif');
  this.attribution.innerHTML = this.attributionPrefix = options.attribution || '';
  container.appendChild(this.attribution);

  WIDTH = container.offsetWidth;
  HEIGHT = container.offsetHeight;
  GL = new glx.View(container, WIDTH, HEIGHT);

  Interaction.init(container);

  Events.on('resize', function() {
    this.setSize(container.offsetWidth, container.offsetHeight);
// updateBounds();
  }.bind(this));

  Renderer.start(options.backgroundColor);

  this.setDisabled(options.disabled);

  // options = State.load(options);
  // this.setPosition(options.position || { latitude: 52.52000, longitude: 13.41000 });
  // this.setZoom(options.zoom || this.minZoom);
  // this.setRotation(options.rotation || 0);
  // this.setTilt(options.tilt || 0);
  // State.save(this);
};

GLMap.prototype = {

  addLayer: function(layer) {
    Layers.add(layer);
    this.attribution.innerHTML = Layers.getAttributions([this.attributionPrefix]).join(' &middot; ');
    return this;
  },

  removeLayer: function(layer) {
    Layers.remove(layer);
    this.attribution.innerHTML = Layers.getAttributions([this.attributionPrefix]).join(' &middot; ');
  },

  on: function(type, fn) {
    Events.on(type, fn);
    return this;
  },

  off: function(type, fn) {
    Events.off(type, fn);
    return this;
  },

  setDisabled: function(isDisabled) {
    Interaction.setDisabled(isDisabled);
    return this;
  },

  isDisabled: function() {
    return !!Interaction.isDisabled;
  },

  setZoom: function(zoom) {
    Map.setZoom(zoom);
    return this;
  },

  getZoom: function() {
    return Map.zoom;
  },

  setPosition: function(position) {
    Map.setPosition(position);
    return this;
  },

  getPosition: function() {
    return Map.getPosition();
  },

  getBounds: function() {
    return Map.getBounds();
  },

  setSize: function(size) {
    if (size.width !== WIDTH || size.height !== HEIGHT) {
      GL.canvas.width  = WIDTH  = size.width;
      GL.canvas.height = HEIGHT = size.height;
      Events.emit('resize');
    }
    return this;
  },

  getSize: function() {
    return { width:WIDTH, height:HEIGHT };
  },

  setRotation: function(rotation) {
    Map.setRotation(rotation);
    return this;
  },

  getRotation: function() {
    return Map.rotation;
  },

  setTilt: function(tilt) {
    Map.setTilt(tilt);
    return this;
  },

  getTilt: function() {
    return Map.tilt;
  },

  transform: function(latitude, longitude, elevation) {
    var pos = project(latitude, longitude, TILE_SIZE*Math.pow(2, Map.zoom));

    var m = new glx.Matrix();
    // m.translate(pos.x-CENTER_X, pos.y-CENTER_Y, elevation);

    // var mv = glx.Matrix.multiply(m, TRANSFORM);
    var mvp = glx.Matrix.multiply({ data:mv }, Renderer.perspective);
    var t = glx.Matrix.transform(mvp);

    return { x:t.x*WIDTH, y:HEIGHT-t.y*HEIGHT };
  },

  destroy: function() {
    glx.destroy(GL);
    Renderer.destroy();
    Layers.destroy();
    Events.destroy();
    Interaction.destroy();
  }
};
