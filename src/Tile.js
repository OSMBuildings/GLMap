
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
