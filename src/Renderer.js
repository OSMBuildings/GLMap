
var Renderer = function(map) {
  this.map = map;
  this.transformMatrix  = new glx.Matrix();
  this.projectionMatrix = new glx.Matrix();
  this.skyDome = new SkyDome(map);
};

Renderer.prototype = {

  start: function() {
    var map = this.map;
    var gl = glx.context;

    map.on('resize', this.onResize.bind(this));
    this.onResize();

    map.on('change', this.onChange.bind(this));
    this.onChange();

    gl.cullFace(gl.BACK);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    map.on('contextlost', function() {
      //this.stop();
    }.bind(this));

    map.on('contextrestored', function() {
      //this.start();
    }.bind(this));

    this.loop = setInterval(function() {
      requestAnimationFrame(function() {
// console.log('CONTEXT LOST?', gl.isContextLost());

        gl.clearColor(map.fogColor.r, map.fogColor.g, map.fogColor.b, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        this.skyDome.render(this.transformMatrix, this.projectionMatrix);

        var layers = map.layers.items;
        for (var i = 0; i < layers.length; i++) {
          layers[i].render(this.transformMatrix, this.projectionMatrix);
        }

      }.bind(this));
    }.bind(this), 17);
  },

  stop: function() {
    clearInterval(this.loop);
  },

  onChange: function() {
    var map = this.map;
    this.transformMatrix = new glx.Matrix()
      // altitude of the viewer
      // 250 is good for NY
      .translate(0, 0, -150)
      .rotateZ(map.rotation)
      .rotateX(map.tilt);
  },

  onResize: function() {
    var
      map = this.map,
      width = map.width,
      height = map.height,
      refHeight = 1024,
      refVFOV = 45;

    this.projectionMatrix = new glx.Matrix()
      .translate(0, -height/2, -1220) // 0, map y offset to neutralize camera y offset, map z -1220 scales map tiles to ~256px
      .scale(1, -1, 1) // flip Y
      .multiply(new glx.Matrix.Perspective(refVFOV * height / refHeight, width/height, 0.1, 5000))
      .translate(0, -1, 0); // camera y offset

    glx.context.viewport(0, 0, width, height);

    this.fogRadius = Math.sqrt(width*width + height*height) / 1; // 2 would fit fine but camera is too close
  },

  destroy: function() {
    this.stop();
  }
};
