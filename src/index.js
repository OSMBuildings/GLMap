
var document = global.document;

var GLMap = function(container, options) {
  this.container = typeof container === 'string' ? document.getElementById(container) : container;

  this.container.classList.add('glmap-container');
  this.width = this.container.offsetWidth;
  this.height = this.container.offsetHeight;
  this.context = glx.View(this.container, this.width, this.height);

  this.minZoom = parseFloat(options.minZoom) || 10;
  this.maxZoom = parseFloat(options.maxZoom) || 20;

  if (this.maxZoom < this.minZoom) {
    this.maxZoom = this.minZoom;
  }

  this.center = { x:0, y:0 };
  this.zoom = 0;
  this.viewMatrix = new glx.Matrix(); // there are early actions that rely on an existing Map transform

  this.listeners = {};

  this.restoreState(options);

  if (options.state) {
    this.persistState();
    this.on('change', function() {
      this.persistState();
    }.bind(this));
  }

  this.interaction = new Interaction(this, this.container);
  if (options.disabled) {
    this.setDisabled(true);
  }

  this.attribution = options.attribution ? [options.attribution] : [];
  this.attributionDiv = document.createElement('DIV');
  this.attributionDiv.className = 'glmap-attribution';
  this.container.appendChild(this.attributionDiv);
  this.updateAttribution();

  Layers.init(this);
  Layers.render();
};

GLMap.TILE_SIZE = 256;

GLMap.prototype = {

  updateAttribution: function() {
    this.attributionDiv.innerHTML = Layers.getAttribution(this.attribution).join(' &middot; ');
  },

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

    if (this.stateDebounce) {
      return;
    }

    this.stateDebounce = setTimeout(function() {
      this.stateDebounce = null;
      var params = [];
      params.push('lat=' + this.position.latitude.toFixed(5));
      params.push('lon=' + this.position.longitude.toFixed(5));
      params.push('zoom=' + this.zoom.toFixed(1));
      params.push('tilt=' + this.tilt.toFixed(1));
      params.push('rotation=' + this.rotation.toFixed(1));
      history.replaceState({}, '', '?'+ params.join('&'));
    }.bind(this), 1000);
  },

  setCenter: function(center) {
    if (this.center.x !== center.x || this.center.y !== center.y) {
      this.center = center;
      this.position = this.unproject(center.x, center.y, GLMap.TILE_SIZE*Math.pow(2, this.zoom));
      this.emit('change');
    }
  },

  emit: function(type, payload) {
    if (!this.listeners[type]) {
      return;
    }

    var listeners = this.listeners[type];

    if (listeners.timer) {
      return;
    }

    listeners.timer = setTimeout(function() {
      for (var i = 0, il = listeners.fn.length; i < il; i++) {
        listeners.fn[i](payload);
      }
      listeners.timer = null;
    }.bind(this), 17);
  },

  //***************************************************************************

  getContext: function() {
    return this.context;
  },

  on: function(type, fn) {
    if (!this.listeners[type]) {
      this.listeners[type] = { fn:[] };
    }
    this.listeners[type].fn.push(fn);
    return this;
  },

  off: function(type, fn) {},

  setDisabled: function(flag) {
    this.interaction.disabled = !!flag;
    return this;
  },

  isDisabled: function() {
    return !!this.interaction.disabled;
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

  transform: function(latitude, longitude, elevation) {
    var
      pos = this.project(latitude, longitude, GLMap.TILE_SIZE*Math.pow(2, this.zoom)),
      x = pos.x-this.center.x,
      y = pos.y-this.center.y;

    var vpMatrix = new glx.Matrix(glx.Matrix.multiply(this.viewMatrix, Layers.perspective));
    var scale = 1/Math.pow(2, 16 - this.zoom);
    var mMatrix = new glx.Matrix()
      .translate(0, 0, elevation)
      .scale(scale, scale, scale*HEIGHT_SCALE)
      .translate(x, y, 0);

    var mvp = glx.Matrix.multiply(mMatrix, vpMatrix);

    var t = glx.Matrix.transform(mvp);
    return { x: t.x*this.width, y: this.height - t.y*this.height, z: t.z }; // takes current cam pos into account.
  },

  getBounds: function() {
    var
      W2 = this.width/2, H2 = this.height/2,
      angle = this.rotation*Math.PI/180,
      x = Math.cos(angle)*W2 - Math.sin(angle)*H2,
      y = Math.sin(angle)*W2 + Math.cos(angle)*H2,
      center = this.center,
      worldSize = GLMap.TILE_SIZE*Math.pow(2, this.zoom),
      nw = this.unproject(center.x - x, center.y - y, worldSize),
      se = this.unproject(center.x + x, center.y + y, worldSize);
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
    return this;
  },

  getZoom: function() {
    return this.zoom;
  },

  setPosition: function(pos) {
    var
      latitude  = clamp(parseFloat(pos.latitude), -90, 90),
      longitude = clamp(parseFloat(pos.longitude), -180, 180),
      center = this.project(latitude, longitude, GLMap.TILE_SIZE*Math.pow(2, this.zoom));
    this.setCenter(center);
    return this;
  },

  getPosition: function() {
    return this.position;
  },

  setSize: function(size) {
    if (size.width !== this.width || size.height !== this.height) {
      this.context.canvas.width = this.width = size.width;
      this.context.canvas.height = this.height = size.height;
      this.emit('resize');
    }
    return this;
  },

  getSize: function() {
    return { width: this.width, height: this.height };
  },

  setRotation: function(rotation) {
    rotation = parseFloat(rotation)%360;
    if (this.rotation !== rotation) {
      this.rotation = rotation;
      this.emit('change');
    }
    return this;
  },

  getRotation: function() {
    return this.rotation;
  },

  setTilt: function(tilt) {
    tilt = clamp(parseFloat(tilt), 0, 60);
    if (this.tilt !== tilt) {
      this.tilt = tilt;
      this.emit('change');
    }
    return this;
  },

  getTilt: function() {
    return this.tilt;
  },

  getPerspective: function() {
    return Layers.perspective;
  },

  addLayer: function(layer) {
    Layers.add(layer);
    this.updateAttribution();
    return this;
  },

  removeLayer: function(layer) {
    Layers.remove(layer);
    this.updateAttribution();
  },

  destroy: function() {
    this.listeners = null;
    this.interaction.destroy();
  }
};

//*****************************************************************************

if (typeof global.define === 'function') {
  global.define([], GLMap);
} else if (typeof global.exports === 'object') {
  global.module.exports = GLMap;
} else {
  global.GLMap = GLMap;
}
