var GLMap = (function(window) {


var GLMap = function(containerId, options) {

  options = options || {};

  this._listeners = {};
  this._layers = [];
  this._container = document.getElementById(containerId);

  this.minZoom = parseFloat(options.minZoom) || 10;
  this.maxZoom = parseFloat(options.maxZoom) || 20;

  if (this.maxZoom < this.minZoom) {
    this.maxZoom = this.minZoom;
  }

  this._initState(options);
  this._initEvents(this._container);
  this._initRenderer(this._container);
};

GLMap.prototype = {

  _initState: function(options) {
    this._center = {};
    this._size = { width:0, height:0 };

    this.setCenter(options.center || { latitude:52.52000, longitude:13.41000 });
    this.setZoom(options.zoom || this.minZoom);
    this.setRotation(options.rotation || 0);
    this.setTilt(options.tilt || 0);
  },

  _initEvents: function(container) {
    this._x = 0;
    this._y = 0;
    this._scale = 0;

    this._hasTouch = ('ontouchstart' in window);
    this._dragStartEvent = this._hasTouch ? 'touchstart' : 'mousedown';
    this._dragMoveEvent  = this._hasTouch ? 'touchmove'  : 'mousemove';
    this._dragEndEvent   = this._hasTouch ? 'touchend'   : 'mouseup';

    addListener(container, this._dragStartEvent, this._onDragStart.bind(this));
    addListener(container, 'dblclick',   this._onDoubleClick.bind(this));
    addListener(document, this._dragMoveEvent, this._onDragMove.bind(this));
    addListener(document, this._dragEndEvent,  this._onDragEnd.bind(this));

    if (this._hasTouch) {
      addListener(container, 'gesturechange', this._onGestureChange.bind(this));
    } else {
      addListener(container, 'mousewheel',     this._onMouseWheel.bind(this));
      addListener(container, 'DOMMouseScroll', this._onMouseWheel.bind(this));
    }

    addListener(window, 'resize', this._onResize.bind(this));
  },

  _initRenderer: function(container) {
    var canvas = document.createElement('CANVAS');
    canvas.style.position = 'absolute';
    canvas.style.pointerEvents = 'none';

    container.appendChild(canvas);

    // TODO: handle context loss
    try {
      gl = canvas.getContext('experimental-webgl', {
        antialias: true,
        depth: true,
        premultipliedAlpha: false
      });
    } catch(ex) {
      throw ex;
    }

    this.setSize({ width:container.offsetWidth, height:container.offsetHeight });

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.cullFace(gl.FRONT);

    setInterval(this._render.bind(this), 17);
  },

  _render: function() {
    requestAnimationFrame(function() {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      for (var i = 0; i < this._layers.length; i++) {
        this._layers[i].render(this._projection);
      }
    }.bind(this));
  },

  _onDragStart: function(e) {
    if (!this._hasTouch && e.button !== 0) {
      return;
    }

    cancelEvent(e);

    if (this._hasTouch) {
      if (e.touches.length > 1) return;
      e = e.touches[0];
      this._rotation = 0;
    }

    this._x = e.clientX;
    this._y = e.clientY;

    this._isDragging = true;
  },

  _onDragMove: function(e) {
    if (!this._isDragging) {
      return;
    }

    cancelEvent(e);
    if (this._hasTouch) {
      if (e.touches.length > 1) return;
      e = e.touches[0];
    }

    var dx = e.clientX-this._x;
    var dy = e.clientY-this._y;
    var r = this._rotatePoint(dx, dy, this._rotation * Math.PI / 180);
    this.setCenter(unproject(this._origin.x-r.x, this._origin.y-r.y, this._worldSize));

    this._x = e.clientX;
    this._y = e.clientY;
  },

  _onDragEnd: function(e) {
    if (!this._isDragging) {
      return;
    }

    this._isDragging = false;

    var dx = e.clientX-this._x;
    var dy = e.clientY-this._y;
    var r = this._rotatePoint(dx, dy, this._rotation * Math.PI / 180);
    this.setCenter(unproject(this._origin.x-r.x, this._origin.y-r.y, this._worldSize));
  },

  _rotatePoint: function(x, y, angle) {
    return {
      x: Math.cos(angle)*x - Math.sin(angle)*y,
      y: Math.sin(angle)*x + Math.cos(angle)*y
    };
  },

  _onGestureChange: function(e) {
    cancelEvent(e);
    var
      r = e.rotation-this._rotation,
      s = e.scale-this._scale;

    if (e > 5 || e < -5) {
      s = 0;
    }

    e.deltaRotation = r;
    e.deltaScale = s;

//  this.setZoom();
//  this.setRotation();

    this._rotation = e.rotation;
    this._scale = e.scale;
  },

  _onDoubleClick: function(e) {
    cancelEvent(e);
    this.setZoom(this._zoom + 1, e);
  },

  _onMouseWheel: function(e) {
    cancelEvent(e);

    var delta = 0;
    if (e.wheelDeltaY) {
      delta = e.wheelDeltaY;
    } else if (e.wheelDelta) {
      delta = e.wheelDelta;
    } else if (e.detail) {
      delta = -e.detail;
    }

    var adjust = 0.2 * (delta > 0 ? 1 : delta < 0 ? -1 : 0);

    this.setZoom(this._zoom + adjust, e);
  },

  _onResize: function() {
    clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(function() {
      var container = this._container;
      if (this._size.width !== container.offsetWidth || this._size.height !== container.offsetHeight) {
        this.setSize({ width:container.offsetWidth, height:container.offsetHeight });
      }
    }.bind(this), 250);
  },

  _emit: function(type) {
    if (!this._listeners[type]) {
      return;
    }
    var listeners = this._listeners[type];
    for (var i = 0, il = listeners.length; i < il; i++) {
      listeners[i]();
    }
  },

  addLayer: function(layer) {
    this._layers.push(layer);
  },

  removeLayer: function(layer) {
    for (var i = 0; i < this._layers.length; i++) {
      if (this._layers[i] === layer) {
        this._layers[i].splice(i, 1);
        return;
      }
    }
  },

  on: function(type, listener) {
    var listeners = this._listeners[type] || (this._listeners[type] = []);
    listeners.push(listener);
    return this;
  },

  _setOrigin: function(origin) {
    this._origin = origin;
  },

  off: function(type, listener) {
    return this;
  },

  getZoom: function() {
    return this._zoom;
  },

  setZoom: function(zoom, e) {
    zoom = clamp(parseFloat(zoom), this.minZoom, this.maxZoom);

    if (this._zoom !== zoom) {
      if (!e) {
        this._zoom = zoom;
        this._worldSize = TILE_SIZE * Math.pow(2, zoom);
        this._setOrigin(project(this._center.latitude, this._center.longitude, this._worldSize));
      } else {
        var size = this.getSize();
        var dx = size.width /2 - e.clientX;
        var dy = size.height/2 - e.clientY;
        var geoPos = unproject(this._origin.x - dx, this._origin.y - dy, this._worldSize);

        this._zoom = zoom;
        this._worldSize = TILE_SIZE * Math.pow(2, zoom);

        var pxPos = project(geoPos.latitude, geoPos.longitude, this._worldSize);
        this._setOrigin({ x:pxPos.x+dx, y:pxPos.y+dy });
        this._center = unproject(this._origin.x, this._origin.y, this._worldSize);
      }

      this._emit('change');
    }

    return this;
  },

  getCenter: function() {
    return this._center;
  },

  setCenter: function(center) {
    center.latitude  = clamp(parseFloat(center.latitude),   -90,  90);
    center.longitude = clamp(parseFloat(center.longitude), -180, 180);

    if (this._center.latitude !== center.latitude || this._center.longitude !== center.longitude) {
      this._center = center;
      this._setOrigin(project(center.latitude, center.longitude, this._worldSize));
      this._emit('change');
    }

    return this;
  },

  getBounds: function() {
    var centerXY = project(this._center.latitude, this._center.longitude, this._worldSize);

    var size = this.getSize();
    var halfWidth  = size.width/2;
    var halfHeight = size.height/2;

    var nw = unproject(centerXY.x - halfWidth, centerXY.y - halfHeight, this._worldSize);
    var se = unproject(centerXY.x + halfWidth, centerXY.y + halfHeight, this._worldSize);

    return {
      n: nw.latitude,
      w: nw.longitude,
      s: se.latitude,
      e: se.longitude
    };
  },

  setSize: function(size) {
    var canvas = gl.canvas;
    if (size.width !== this._size.width || size.height !== this._size.height) {
      canvas.width  = this._size.width  = size.width;
      canvas.height = this._size.height = size.height;
      gl.viewport(0, 0, size.width, size.height);
      this._projection = Matrix.perspective(20, size.width, size.height, 40000);
      this._emit('resize');
    }

    return this;
  },

  getSize: function() {
    return this._size;
  },

  getOrigin: function() {
    return this._origin;
  },

  getRotation: function() {
    return this._rotation;
  },

  setRotation: function(rotation) {
    rotation = parseFloat(rotation)%360;
    if (this._rotation !== rotation) {
      this._rotation = rotation;
      this._emit('change');
    }
    return this;
  },

  getTilt: function() {
    return this._tilt;
  },

  setTilt: function(tilt) {
    tilt = clamp(parseFloat(tilt), 0, 90);
    if (this._tilt !== tilt) {
      this._tilt = tilt;
      this._emit('change');
    }
    return this;
  },

  getContext: function() {
    return gl;
  },

  destroy: function() {
    var canvas = gl.canvas;
    canvas.parentNode.removeChild(canvas);
    gl = null;

    // TODO: stop render loop
//  clearInterval(...);
    this._listeners = null;

    for (var i = 0; i < this._layers.length; i++) {
      this._layers[i].destroy();
    }
    this._layers = null;
  }
};


var PI = Math.PI;
var TILE_SIZE = 256;
var gl;


function rad(deg) {
  return deg * PI / 180;
}

function deg(rad) {
  return rad / PI * 180;
}

function distance2(a, b) {
  var
    dx = a[0]-b[0],
    dy = a[1]-b[1];
  return dx*dx + dy*dy;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(value, min));
}

function normalize(value, min, max) {
  var range = max-min;
  return clamp((value-min)/range, 0, 1);
}

function unit(x, y, z) {
  var m = Math.sqrt(x*x + y*y + z*z);

  if (m === 0) {
    m = 0.00001;
  }

  return [x/m, y/m, z/m];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(value, min));
}

function project(latitude, longitude, worldSize) {
  var
    x = longitude / 360 + 0.5,
    y = Math.min(1, Math.max(0, 0.5 - (Math.log(Math.tan((Math.PI/4) + (Math.PI/2)*latitude/180)) / Math.PI) / 2));
  return { x: x*worldSize, y: y*worldSize };
}

function unproject(x, y, worldSize) {
  x /= worldSize;
  y /= worldSize;
  return {
    latitude: (2 * Math.atan(Math.exp(Math.PI * (1 - 2*y))) - Math.PI/2) * (180/Math.PI),
    longitude: x*360 - 180
  };
}

function pattern(str, param) {
  return str.replace(/\{(\w+)\}/g, function(tag, key) {
    return param[key] || tag;
  });
}

function addListener(target, type, fn) {
  target.addEventListener(type, fn, false);
}

function removeListener(target, type, fn) {
  target.removeEventListener(type, fn, false);
}

function cancelEvent(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.returnValue = false;
}

var SHADERS = {"tileplane":{"src":{"vertex":"\nprecision mediump float;\nattribute vec4 aPosition;\nattribute vec2 aTexCoord;\nuniform mat4 uMatrix;\nvarying vec2 vTexCoord;\nvoid main() {\n  gl_Position = uMatrix * aPosition;\n  vTexCoord = aTexCoord;\n}\n","fragment":"\nprecision mediump float;\nuniform sampler2D uTileImage;\nvarying vec2 vTexCoord;\nvoid main() {\n  vec4 texel = texture2D(uTileImage, vec2(vTexCoord.x, -vTexCoord.y));\n  gl_FragColor = texel;\n}\n"},"attributes":["aPosition","aTexCoord"],"uniforms":["uMatrix","uTileImage"]}};


function Grid(url, options) {
  this._url = url;

  options = options || {};
  this._tileSize  = options.tileSize || TILE_SIZE;
  this._fixedZoom = options.fixedZoom;

  this._tiles = {};
  this._loading = {};

  this._shader = new Shader('tileplane');
}

GLMap.TileLayer = Grid;

Grid.prototype = {

  _updateTileBounds: function() {
    var
      bounds = this._map.getBounds(),
      tileSize = this._tileSize,
      zoom = this._zoom = this._fixedZoom || Math.round(this._map.getZoom()),
      worldSize = tileSize <<zoom,
      min = project(bounds.n, bounds.w, worldSize),
      max = project(bounds.s, bounds.e, worldSize);


    this._tileBounds = {
      minX: min.x/tileSize <<0,
      minY: min.y/tileSize <<0,
      maxX: Math.ceil(max.x/tileSize),
      maxY: Math.ceil(max.y/tileSize)
    };
  },

  _loadTiles: function() {
    var
      tileBounds = this._tileBounds,
      zoom = this._zoom,
      tiles = this._tiles,
      loading = this._loading,
      x, y, key,
      queue = [], queueLength;

    for (y = tileBounds.minY; y <= tileBounds.maxY; y++) {
      for (x = tileBounds.minX; x <= tileBounds.maxX; x++) {
        key = [x, y, zoom].join(',');
        if (tiles[key] || loading[key]) {
          continue;
        }
        queue.push({ x:x, y:y, z:zoom });
      }
    }

    if (!(queueLength = queue.length)) {
      return;
    }

    // TODO: currently viewport center but could be aligned to be camera pos
    var tileAnchor = {
      x:tileBounds.minX + (tileBounds.maxX-tileBounds.minX-1)/2,
      y:tileBounds.minY + (tileBounds.maxY-tileBounds.minY-1)/2
    };

    queue.sort(function(b, a) {
      return distance2(a, tileAnchor) - distance2(b, tileAnchor);
    });

    for (var i = 0; i < queueLength; i++) {
      this._loadTile(queue[i].x, queue[i].y, queue[i].z);
    }

    this._purge();
  },

  _getURL: function(x, y, z) {
    var s = 'abcd'[(x+y) % 4];
    return pattern(this._url, { s:s, x:x, y:y, z:z });
  },

  _loadTile: function(x, y, z) {
    var key = [x, y, z].join(',');

    var img = new Image();
    img.crossOrigin = '*';

    img.onload = function() {
      delete this._loading[key];
      this._tiles[key] = new Tile(x, y, z, img);
    }.bind(this);

    img.onerror = function() {
      delete this._loading[key];
    }.bind(this);

    var abortable = {
      abort: function() {
        img.src = '';
      }
    };

    this._loading[key] = abortable;
    img.src = this._getURL(x, y, z);

    return abortable;
  },

  _purge: function() {
    var
      key,
      tiles = this._tiles,
      loading = this._loading;

    for (key in tiles) {
      if (!this._isVisible(key, 2)) {
        tiles[key].destroy();
        delete tiles[key];
      }
    }

    for (key in loading) {
      if (!this._isVisible(key)) {
        loading[key].abort();
        delete loading[key];
      }
    }
  },

  _isVisible: function(key, buffer) {
    buffer = buffer || 0;

    var
      tileSize = this._tileSize,
      tileBounds = this._tileBounds,
      xyz = key.split(','),
      x = parseInt(xyz[0], 10), y = parseInt(xyz[1], 10), z = parseInt(xyz[2], 10);

    if (z !== this._zoom) {
      return false;
    }

    return (x >= tileBounds.minX-buffer-tileSize && x <= tileBounds.maxX+buffer && y >= tileBounds.minY-buffer-tileSize && y <= tileBounds.maxY+buffer);
  },

  addTo: function(map) {
    this._map = map;

    map.addLayer(this);

    this._updateTileBounds();
    this.update();

    map.on('change', function() {
      this._updateTileBounds();
      this.update(100);
    }.bind(this));

    map.on('resize', function() {
      this._updateTileBounds();
      this.update();
    }.bind(this));
  },

  remove: function() {
    this._map.remove(this);
    this._map = null;
  },

  update: function(delay) {
    if (!delay) {
      this._loadTiles();
      return;
    }

    if (!this._isWaiting) {
      this._isWaiting = setTimeout(function() {
        this._isWaiting = null;
        this._loadTiles();
      }.bind(this), delay);
    }
  },

  render: function(projection) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var program = this._shader.use();
    for (var key in this._tiles) {
      if (this._isVisible(key)) {
        this._tiles[key].render(program, projection, this._map);
      }
    }
    program.end();
  },

  destroy: function() {
    clearTimeout(this._isWaiting);

    for (var key in this._tiles) {
      this._tiles[key].destroy();
    }
    this._tiles = null;

    for (key in this._loading) {
      this._loading[key].abort();
    }
    this._loading = null;
  }
};


function Tile(x, y, z, img) {
  this.x = x;
  this.y = y;
  this.z = z;

  this._texture = this._createTexture(img);
  this._vertexBuffer = this._createBuffer(3, new Float32Array([0, 0, 0, 255, 0, 0, 0, 255, 0, 255, 255, 0]));
  this._texCoordBuffer = this._createBuffer(2, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]));
}

Tile.prototype = {

  _createTexture: function(img) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);

//  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
//  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
//  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
//  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return texture;
  },

  _createBuffer: function(itemSize, data) {
    var buffer = gl.createBuffer();
    buffer.itemSize = itemSize;
    buffer.numItems = data.length/itemSize;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return buffer;
  },

  render: function(program, projection, map) {
    var ratio = 1/Math.pow(2, this.z-map.getZoom());
    var adaptedTileSize = TILE_SIZE*ratio;
    var size = map.getSize();
    var origin = map.getOrigin();

    var matrix = Matrix.create();

    matrix = Matrix.scale(matrix, ratio*1.005, ratio*1.005, 1);
    matrix = Matrix.translate(matrix, this.x*adaptedTileSize - origin.x, this.y*adaptedTileSize - origin.y, 0);
    matrix = Matrix.rotateZ(matrix, map.getRotation());
    matrix = Matrix.rotateX(matrix, map.getTilt());
    matrix = Matrix.translate(matrix, size.width/2, size.height/2, 0);
    matrix = Matrix.multiply(matrix, projection);

    gl.uniformMatrix4fv(program.uniforms.uMatrix, false, new Float32Array(matrix));

    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.vertexAttribPointer(program.attributes.aPosition, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordBuffer);
    gl.vertexAttribPointer(program.attributes.aTexCoord, this._texCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._texture);
    gl.uniform1i(program.uniforms.uTileImage, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this._vertexBuffer.numItems);
  },

  destroy: function() {
    gl.deleteBuffer(this._vertexBuffer);
    gl.deleteBuffer(this._texCoordBuffer);
  }
};


var Matrix = {

  create: function() {
    return [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
  },

  multiply: function(a, b) {
    var
      a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3],
      a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7],
      a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11],
      a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15],

      b00 = b[0],
      b01 = b[1],
      b02 = b[2],
      b03 = b[3],
      b10 = b[4],
      b11 = b[5],
      b12 = b[6],
      b13 = b[7],
      b20 = b[8],
      b21 = b[9],
      b22 = b[10],
      b23 = b[11],
      b30 = b[12],
      b31 = b[13],
      b32 = b[14],
      b33 = b[15]
    ;

    return [
      a00*b00 + a01*b10 + a02*b20 + a03*b30,
      a00*b01 + a01*b11 + a02*b21 + a03*b31,
      a00*b02 + a01*b12 + a02*b22 + a03*b32,
      a00*b03 + a01*b13 + a02*b23 + a03*b33,

      a10*b00 + a11*b10 + a12*b20 + a13*b30,
      a10*b01 + a11*b11 + a12*b21 + a13*b31,
      a10*b02 + a11*b12 + a12*b22 + a13*b32,
      a10*b03 + a11*b13 + a12*b23 + a13*b33,

      a20*b00 + a21*b10 + a22*b20 + a23*b30,
      a20*b01 + a21*b11 + a22*b21 + a23*b31,
      a20*b02 + a21*b12 + a22*b22 + a23*b32,
      a20*b03 + a21*b13 + a22*b23 + a23*b33,

      a30*b00 + a31*b10 + a32*b20 + a33*b30,
      a30*b01 + a31*b11 + a32*b21 + a33*b31,
      a30*b02 + a31*b12 + a32*b22 + a33*b32,
      a30*b03 + a31*b13 + a32*b23 + a33*b33
    ];
  },

  perspective: function(f, width, height, depth) {
    return [
      2/width, 0,         0,        0,
      0,      -2/height,  0,        0,
      0,       40/depth,  -2/depth,  f * (-2/depth),
      -1,      1,         0,        1
    ];
  },

  translate: function(matrix, x, y, z) {
    return this.multiply(matrix, [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      x, y, z, 1
    ]);
  },

  rotateX: function(matrix, angle) {
    var a = rad(angle);
    var c = Math.cos(a);
    var s = Math.sin(a);
    return this.multiply(matrix, [
      1,  0, 0, 0,
      0,  c, s, 0,
      0, -s, c, 0,
      0,  0, 0, 1
    ]);
  },

  rotateY: function(matrix, angle) {
    var a = rad(angle);
    var c = Math.cos(a);
    var s = Math.sin(a);
    return this.multiply(matrix, [
      c, 0, -s, 0,
      0, 1,  0, 0,
      s, 0,  c, 0,
      0, 0,  0, 1
    ]);
  },

  rotateZ: function(matrix, angle) {
    var a = rad(angle);
    var c = Math.cos(a);
    var s = Math.sin(a);
    return this.multiply(matrix, [
      c, -s, 0, 0,
      s, c, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);
  },

  scale: function(matrix, x, y, z) {
    return this.multiply(matrix, [
      x, 0, 0, 0,
      0, y, 0, 0,
      0, 0, z, 0,
      0, 0, 0, 1
    ]);
  },

  invert: function(a) {
    var
      a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
      a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
      a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
      a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

      b00 = a00 * a11 - a01 * a10,
      b01 = a00 * a12 - a02 * a10,
      b02 = a00 * a13 - a03 * a10,
      b03 = a01 * a12 - a02 * a11,
      b04 = a01 * a13 - a03 * a11,
      b05 = a02 * a13 - a03 * a12,
      b06 = a20 * a31 - a21 * a30,
      b07 = a20 * a32 - a22 * a30,
      b08 = a20 * a33 - a23 * a30,
      b09 = a21 * a32 - a22 * a31,
      b10 = a21 * a33 - a23 * a31,
      b11 = a22 * a33 - a23 * a32,

      det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) {
      return null;
    }

    det = 1.0/det;

    return [
      (a11 * b11 - a12 * b10 + a13 * b09) * det,
      (a02 * b10 - a01 * b11 - a03 * b09) * det,
      (a31 * b05 - a32 * b04 + a33 * b03) * det,
      (a22 * b04 - a21 * b05 - a23 * b03) * det,
      (a12 * b08 - a10 * b11 - a13 * b07) * det,
      (a00 * b11 - a02 * b08 + a03 * b07) * det,
      (a32 * b02 - a30 * b05 - a33 * b01) * det,
      (a20 * b05 - a22 * b02 + a23 * b01) * det,
      (a10 * b10 - a11 * b08 + a13 * b06) * det,
      (a01 * b08 - a00 * b10 - a03 * b06) * det,
      (a30 * b04 - a31 * b02 + a33 * b00) * det,
      (a21 * b02 - a20 * b04 - a23 * b00) * det,
      (a11 * b07 - a10 * b09 - a12 * b06) * det,
      (a00 * b09 - a01 * b07 + a02 * b06) * det,
      (a31 * b01 - a30 * b03 - a32 * b00) * det,
      (a20 * b03 - a21 * b01 + a22 * b00) * det
    ];
  },

  invert3: function(a) {
    var
      a00 = a[0], a01 = a[1], a02 = a[2],
      a04 = a[4], a05 = a[5], a06 = a[6],
      a08 = a[8], a09 = a[9], a10 = a[10],

      l =  a10 * a05 - a06 * a09,
      o = -a10 * a04 + a06 * a08,
      m =  a09 * a04 - a05 * a08,

      det = a00*l + a01*o + a02*m;

    if (!det) {
      return null;
    }

    det = 1.0/det;

    return [
      l                    * det,
      (-a10*a01 + a02*a09) * det,
      ( a06*a01 - a02*a05) * det,
      o                    * det,
      ( a10*a00 - a02*a08) * det,
      (-a06*a00 + a02*a04) * det,
      m                    * det,
      (-a09*a00 + a01*a08) * det,
      ( a05*a00 - a01*a04) * det
    ];
  },

  transpose: function(a) {
    return [
      a[0],
      a[3],
      a[6],
      a[1],
      a[4],
      a[7],
      a[2],
      a[5],
      a[8]
    ];
  }
};


function Shader(name) {
  var config = SHADERS[name];

  this.id = gl.createProgram();
  this.name = name;

  if (!config.src) {
    throw new Error('missing source for shader "'+ name +'"');
  }

  this._attach(gl.VERTEX_SHADER,   config.src.vertex);
  this._attach(gl.FRAGMENT_SHADER, config.src.fragment);

  gl.linkProgram(this.id);

  if (!gl.getProgramParameter(this.id, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramParameter(this.id, gl.VALIDATE_STATUS) +'\n'+ gl.getError());
  }

  this.attributeNames = config.attributes;
  this.uniformNames = config.uniforms;
}

Shader.prototype._attach = function(type, src) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }

  gl.attachShader(this.id, shader);
};

Shader.prototype.use = function() {
  gl.useProgram(this.id);

  var i, name, loc;

  if (this.attributeNames) {
    this.attributes = {};
    for (i = 0; i < this.attributeNames.length; i++) {
      name = this.attributeNames[i];
      loc = gl.getAttribLocation(this.id, name);
      if (loc < 0) {
        console.error('could not locate attribute "'+ name +'" in shader "'+ this.name +'"');
      } else {
        gl.enableVertexAttribArray(loc);
        this.attributes[name] = loc;
      }
    }
  }

  if (this.uniformNames) {
    this.uniforms = {};
    for (i = 0; i < this.uniformNames.length; i++) {
      name = this.uniformNames[i];
      loc = gl.getUniformLocation(this.id, name);
      if (loc < 0) {
        console.error('could not locate uniform "'+ name +'" in shader "'+ this.name +'"');
      } else {
        this.uniforms[name] = loc;
      }
    }
  }

  return this;
};

Shader.prototype.end = function() {
  gl.useProgram(null);

  if (this.attributes) {
    for (var name in this.attributes) {
      gl.disableVertexAttribArray(this.attributes[name]);
    }
  }

  this.attributes = null;
  this.uniforms = null;
};

return GLMap; }(this));