
var GLMap = function(container, options) {
  this.container = container;

  this.minZoom = parseFloat(options.minZoom) || 10;
  this.maxZoom = parseFloat(options.maxZoom) || 20;

  if (this.maxZoom < this.minZoom) {
    this.maxZoom = this.minZoom;
  }

  this.center = { x:0, y:0 };
  this.zoom = 0;
  this.transform = new glx.Matrix(); // there are early actions that rely on an existing Map transform

  this.listeners = {};

  this.restoreState(options);

  if (options.state) {
    this.persistState();
    this.on('change', function() {
      this.persistState();
    }.bind(this));
  }

  this.interaction = new Interaction(this, container);
  if (options.disabled) {
    this.setDisabled(true);
  }
};

GLMap.TILE_SIZE = 256;

GLMap.prototype = {

  restoreState: function(options) {
    var
      query = location.search,
      state = {};
    if (query) {
      query.substring(1).replace(/(?:^|&)([^&=]*)=?([^&]*)/g, function($0, $1, $2) {
        if ($1) {
          state[$1] = $2;
        }
      });
    }

    var position;
    if (state.lat !== undefined && state.lon !== undefined) {
      position = { latitude:parseFloat(state.lat), longitude:parseFloat(state.lon) };
    }
    this.setPosition(position || options.position || { latitude: 52.52000, longitude: 13.41000 });

    var zoom;
    if (state.zoom !== undefined) {
      zoom = (state.zoom !== undefined) ? parseFloat(state.zoom) : null;
    }
    this.setZoom(zoom || options.zoom || this.minZoom);

    var rotation;
    if (state.rotation !== undefined) {
      rotation = parseFloat(state.rotation);
    }
    this.setRotation(rotation || options.rotation || 0);

    var tilt;
    if (state.tilt !== undefined) {
      tilt = parseFloat(state.tilt);
    }
    this.setTilt(tilt || options.tilt || 0);
  },

  persistState: function() {
    if (!history.replaceState) {
      return;
    }

    var stateDebounce;
    clearTimeout(stateDebounce);
    stateDebounce = setTimeout(function() {
      var params = [];
      params.push('lat=' + this.position.latitude.toFixed(5));
      params.push('lon=' + this.position.longitude.toFixed(5));
      params.push('zoom=' + this.zoom.toFixed(1));
      params.push('tilt=' + this.tilt.toFixed(1));
      params.push('rotation=' + this.rotation.toFixed(1));
      history.replaceState({}, '', '?'+ params.join('&'));
    }.bind(this), 2000);
  },

  setCenter: function(center) {
    if (this.center.x !== center.x || this.center.y !== center.y) {
      this.center = center;
      this.position = unproject(center.x, center.y, GLMap.TILE_SIZE*Math.pow(2, this.zoom));
      this.emit('change');
    }
  },

  emitDebounce: null,
  emit: function(type, payload) {
    if (!this.listeners[type]) {
      return;
    }
    clearTimeout(this.emitDebounce);
    var listeners = this.listeners[type];
    this.emitDebounce = setTimeout(function() {
      for (var i = 0, il = listeners.length; i < il; i++) {
        listeners[i](payload);
      }
    }, 1);
  },

  //***************************************************************************

  on: function(type, fn) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(fn);
  },

  off: function(type, fn) {},

  setDisabled: function(flag) {
    this.interaction.setDisabled(flag);
  },

  isDisabled: function() {
    return this.interaction.isDisabled();
  },

  project: function(latitude, longitude, worldSize) {
    var
      x = longitude/360 + 0.5,
      y = Math.min(1, Math.max(0, 0.5 - (Math.log(Math.tan((Math.PI/4) + (Math.PI/2)*latitude/180)) / Math.PI) / 2));
    return { x: x*worldSize, y: y*worldSize };
  },

  unproject: function(x, y, worldSize) {
    x /= worldSize;
    y /= worldSize;
    return {
      latitude: (2 * Math.atan(Math.exp(Math.PI * (1 - 2*y))) - Math.PI/2) * (180/Math.PI),
      longitude: x*360 - 180
    };
  },

  getBounds: function() {
    var
      center = this.center,
      halfWidth  = this.container.offsetWidth/2,
      halfHeight = this.container.offsetHeight/2,
      maxY = center.y + halfHeight,
      minX = center.x - halfWidth,
      minY = center.y - halfHeight,
      maxX = center.x + halfWidth,
      worldSize = GLMap.TILE_SIZE*Math.pow(2, this.zoom),
      nw = unproject(minX, minY, worldSize),
      se = unproject(maxX, maxY, worldSize);

    return {
      n: nw.latitude,
      w: nw.longitude,
      s: se.latitude,
      e: se.longitude
    };
  },

  setZoom: function(zoom, e) {
    zoom = clamp(parseFloat(zoom), this.minZoom, this.maxZoom);

    if (this.zoom !== zoom) {
      var ratio = Math.pow(2, zoom-this.zoom);
      this.zoom = zoom;
      if (!e) {
        this.center.x *= ratio;
        this.center.y *= ratio;
      } else {
        var dx = this.container.offsetWidth/2  - e.clientX;
        var dy = this.container.offsetHeight/2 - e.clientY;
        this.center.x -= dx;
        this.center.y -= dy;
        this.center.x *= ratio;
        this.center.y *= ratio;
        this.center.x += dx;
        this.center.y += dy;
      }
      this.emit('change');
    }
  },

  setPosition: function(pos) {
    var
      latitude  = clamp(parseFloat(pos.latitude), -90, 90),
      longitude = clamp(parseFloat(pos.longitude), -180, 180),
      center = project(latitude, longitude, GLMap.TILE_SIZE*Math.pow(2, this.zoom));
    this.setCenter(center);
  },

  setRotation: function(rotation) {
    rotation = parseFloat(rotation)%360;
    if (this.rotation !== rotation) {
      this.rotation = rotation;
      this.emit('change');
    }
  },

  setTilt: function(tilt) {
    tilt = clamp(parseFloat(tilt), 0, 60);
    if (this.tilt !== tilt) {
      this.tilt = tilt;
      this.emit('change');
    }
  },

  destroy: function() {
    this.listeners = null;
    this.interaction.destroy();
  }
};






//
//var
//  GL,
//  WIDTH = 0,
//  HEIGHT = 0;
//
//var GLMap = function(containerId, options) {
//  options = options || {};
//
//  var container = document.getElementById(containerId);
//
//  this.attribution = document.createElement('DIV');
//  this.attribution.setAttribute('style', 'position:absolute;right:0;bottom:0;padding:1px 3px;background:rgba(255,255,255,0.5);font:11px sans-serif');
//  this.attribution.innerHTML = this.attributionPrefix = options.attribution || '';
//  container.appendChild(this.attribution);
//
//  WIDTH = container.offsetWidth;
//  HEIGHT = container.offsetHeight;
//  GL = new glx.View(container, WIDTH, HEIGHT);
//
//  Interaction.init(container);
//
//  Events.on('resize', function() {
//    this.setSize(container.offsetWidth, container.offsetHeight);
//// updateBounds();
//  }.bind(this));
//
//  Renderer.start(options.backgroundColor);
//
//  this.setDisabled(options.disabled);
//
//  // options = State.load(options);
//  // this.setPosition(options.position || { latitude: 52.52000, longitude: 13.41000 });
//  // this.setZoom(options.zoom || this.minZoom);
//  // this.setRotation(options.rotation || 0);
//  // this.setTilt(options.tilt || 0);
//  // State.save(this);
//};
//
//GLMap.prototype = {
//
//  addLayer: function(layer) {
//    Layers.add(layer);
//    this.attribution.innerHTML = Layers.getAttributions([this.attributionPrefix]).join(' &middot; ');
//    return this;
//  },
//
//  removeLayer: function(layer) {
//    Layers.remove(layer);
//    this.attribution.innerHTML = Layers.getAttributions([this.attributionPrefix]).join(' &middot; ');
//  },
//
//  on: function(type, fn) {
//    Events.on(type, fn);
//    return this;
//  },
//
//  off: function(type, fn) {
//    Events.off(type, fn);
//    return this;
//  },
//
//  setDisabled: function(isDisabled) {
//    Interaction.setDisabled(isDisabled);
//    return this;
//  },
//
//  isDisabled: function() {
//    return !!Interaction.isDisabled;
//  },
//
//  setZoom: function(zoom) {
//    Map.setZoom(zoom);
//    return this;
//  },
//
//  getZoom: function() {
//    return Map.zoom;
//  },
//
//  setPosition: function(position) {
//    Map.setPosition(position);
//    return this;
//  },
//
//  getPosition: function() {
//    return Map.getPosition();
//  },
//
//  getBounds: function() {
//    return Map.getBounds();
//  },
//
//  setSize: function(size) {
//    if (size.width !== WIDTH || size.height !== HEIGHT) {
//      GL.canvas.width  = WIDTH  = size.width;
//      GL.canvas.height = HEIGHT = size.height;
//      Events.emit('resize');
//    }
//    return this;
//  },
//
//  getSize: function() {
//    return { width:WIDTH, height:HEIGHT };
//  },
//
//  setRotation: function(rotation) {
//    Map.setRotation(rotation);
//    return this;
//  },
//
//  getRotation: function() {
//    return Map.rotation;
//  },
//
//  setTilt: function(tilt) {
//    Map.setTilt(tilt);
//    return this;
//  },
//
//  getTilt: function() {
//    return Map.tilt;
//  },
//
//  transform: function(latitude, longitude, elevation) {
//    var pos = project(latitude, longitude, TILE_SIZE*Math.pow(2, Map.zoom));
//
//    var m = new glx.Matrix();
//    // m.translate(pos.x-CENTER_X, pos.y-CENTER_Y, elevation);
//
//    // var mv = glx.Matrix.multiply(m, TRANSFORM);
//    var mvp = glx.Matrix.multiply({ data:mv }, Renderer.perspective);
//    var t = glx.Matrix.transform(mvp);
//
//    return { x:t.x*WIDTH, y:HEIGHT-t.y*HEIGHT };
//  },
//
//  destroy: function() {
//    glx.destroy(GL);
//    Renderer.destroy();
//    Layers.destroy();
//    Events.destroy();
//    Interaction.destroy();
//  }
//};
