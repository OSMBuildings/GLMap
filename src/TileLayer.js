
// this._zoom

GLMap.TileLayer = function(source, options) {
  this._source = source;
  this._tileSize = 256;

  options = options || {};

  this.attribution = options.attribution;

  this._minZoom = parseFloat(options.minZoom) || 0;
  this._maxZoom = parseFloat(options.maxZoom) || 18;

  if (this._maxZoom < this._minZoom) {
    this._maxZoom = this._minZoom;
  }

  this._buffer = options.buffer || 1;

  this._shader = new glx.Shader({
    vertexShader: "\
precision mediump float;\
attribute vec4 aPosition;\
attribute vec2 aTexCoord;\
uniform mat4 uMatrix;\
varying vec2 vTexCoord;\
void main() {\
  gl_Position = uMatrix * aPosition;\
  vTexCoord = aTexCoord;\
}",
    fragmentShader: "\
precision mediump float;\
uniform sampler2D uTileImage;\
varying vec2 vTexCoord;\
void main() {\
  gl_FragColor = texture2D(uTileImage, vec2(vTexCoord.x, -vTexCoord.y));\
}",
    attributes: ['aPosition', 'aTexCoord'],
    uniforms: ['uMatrix', 'uTileImage']
  });

  this._tiles = {};
};

GLMap.TileLayer.prototype = {

  addTo: function(map) {
    this.map = map;
    map.addLayer(this);

    map.on('change', function() {
      this.update(500);
    }.bind(this));

    map.on('resize', this.update.bind(this));

    this.update();
  },

  remove: function() {
    this.map.removeLayer(this);
    clearTimeout(this._isWaiting);
    this.map = null;
  },

  update: function(delay) {
    if (!this.map) {
      return;
    }

    if (this._zoom < this._minZoom || this._zoom > this._maxZoom) {
      return;
    }

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

  getURL: function(x, y, z) {
    var param = { s:'abcd'[(x+y) % 4], x:x, y:y, z:z };
    return this._source.replace(/\{(\w+)\}/g, function(tag, key) {
      return param[key] || tag;
    });
  },

  _distance2: function(a, b) {
    var
      dx = a[0]-b[0],
      dy = a[1]-b[1];
    return dx*dx + dy*dy;
  },

  _updateBounds: function() {
    var
      map = this.map,
      mapBounds = map.getBounds(),
      mapZoom = Math.round(map.getZoom()),
      ratio = Math.pow(2, this._zoom-mapZoom)/this._tileSize;

    this._minX = (mapBounds.minX*ratio <<0) -1;
    this._minY = (mapBounds.minY*ratio <<0) -1;
    this._maxX = Math.ceil(mapBounds.maxX*ratio) +1;
    this._maxY = Math.ceil(mapBounds.maxY*ratio) +1;
  },

  _loadTiles: function() {
    var
      tileX, tileY,
      key,
      queue = [], queueLength,
      tileAnchor = [
        this._minX + (this._maxX-this._minX)/2 - 0.5, // 0.5 is for translating top left corner
        this._maxY + (this._maxY-this._minY)/2 - 0.5  // 0.5 is for translating top left corner
      ];

    this._updateBounds();

    for (tileY = this._minY; tileY < this._maxY; tileY++) {
      for (tileX = this._minX; tileX < this._maxX; tileX++) {
        key = [tileX, tileY, this._zoom].join(',');
        if (this._tiles[key]) {
          continue;
        }
        this._tiles[key] = new MapTile(tileX, tileY, this._zoom);
        // TODO: rotate anchor point
        queue.push({ tile:this._tiles[key], dist:this._distance2([tileX, tileY], tileAnchor) });
      }
    }

    if (!(queueLength = queue.length)) {
      queue.sort(function(a, b) {
        return a.dist-b.dist;
      });

      var tile;
      for (var i = 0; i < queueLength; i++) {
        tile = queue[i].tile;
        tile.load(this.getURL(tile.tileX, tile.tileY, tile.zoom));
      }
    }

    this._purge();
  },

  _purge: function() {
    for (var key in this._tiles) {
      if (!this._isVisible(this._tiles[key], this._buffer)) {
        this._tiles[key].destroy();
        delete this._tiles[key];
      }
    }
  },

  _isVisible: function(tile, buffer) {
     buffer = buffer || 0;
     var
       tileX = tile.tileX,
       tileY = tile.tileY;
     // TODO: factor in tile origin
     return (tile.zoom === zoom && (tileX >= this._minX-buffer && tileX <= this._maxX+buffer && tileY >= this._minY-buffer && tileY <= this._maxY+buffer));
  },

  render: function(vpMatrix) {
    var tile, mMatrix;

    this._shader.enable();

    for (var key in this._tiles) {
      tile = this._tiles[key];

      if (!(mMatrix = tile.getMatrix())) {
        continue;
      }

      GL.uniformMatrix4fv(shader.uniforms.uMatrix, false, glx.Matrix.multiply(mMatrix, vpMatrix));

      tile.vertexBuffer.enable();
      GL.vertexAttribPointer(shader.attributes.aPosition, tile.vertexBuffer.itemSize, GL.FLOAT, false, 0, 0);

      tile.texCoordBuffer.enable();
      GL.vertexAttribPointer(shader.attributes.aTexCoord, tile.texCoordBuffer.itemSize, GL.FLOAT, false, 0, 0);

      tile.texture.enable(0);
      GL.uniform1i(shader.uniforms.uTileImage, 0);

      GL.drawArrays(GL.TRIANGLE_STRIP, 0, tile.vertexBuffer.numItems);
    }

    this._shader.disable();
  },

  destroy: function() {
    this.map = null;
    clearTimeout(this._isWaiting);
    for (var key in this._tiles) {
      this._tiles[key].destroy();
    }
    this._tiles = null;
  }
};
