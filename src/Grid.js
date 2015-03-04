
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
