
var Layers = {

  init: function(map) {
    this.map = map;
  },

  items: [],

  add: function(layer) {
    this.items.push(layer);
  },

  remove: function(layer) {
    for (var i = 0; i < this.items.length; i++) {
      if (this.items[i] === layer) {
        this.items.splice(i, 1);
        return;
      }
    }
  },

  getAttribution: function(attribution) {
    attribution = attribution || [];
    for (var i = 0; i < this.items.length; i++) {
      if (this.items[i].attribution) {
        attribution.push(this.items[i].attribution);
      }
    }
    return attribution;
  },

  render: function(options) {
//  this.fogColor = options.fogColor ? Color.parse(options.fogColor).toRGBA(true) : FOG_COLOR;
    var gl = this.map.context;

    this.resize();
    this.map.on('resize', this.resize.bind(this));

    gl.cullFace(gl.BACK);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    this.map.on('contextlost', function() {
      //  this.stop();
    }.bind(this));

    this.map.on('contextrestored', function() {
      //  this.start();
    }.bind(this));

    this.loop = setInterval(function() {
      requestAnimationFrame(function() {
        this.map.transform = new glx.Matrix()
          .rotateZ(this.map.rotation)
          .rotateX(this.map.tilt);

// console.log('CONTEXT LOST?', gl.isContextLost());

          var vpMatrix = new glx.Matrix(glx.Matrix.multiply(this.map.transform, this.perspective));

//        gl.clearColor(this.fogColor.r, this.fogColor.g, this.fogColor.b, 1);
          gl.clearColor(0.5, 0.5, 0.5, 1);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for (var i = 0; i < this.items.length; i++) {
          this.items[i].render(vpMatrix);
        }
      }.bind(this));
    }.bind(this), 17);
  },

  stop: function() {
    clearInterval(this.loop);
  },

  resize: function() {
    var refHeight = 1024;
    var refVFOV = 45;

    this.perspective = new glx.Matrix()
      .translate(0, -this.map.height/2, -1220) // 0, map y offset to neutralize camera y offset, map z -1220 scales map tiles to ~256px
      .scale(1, -1, 1) // flip Y
      .multiply(new glx.Matrix.Perspective(refVFOV * this.map.height / refHeight, this.map.width/this.map.height, 0.1, 5000))
      .translate(0, -1, 0); // camera y offset

    this.map.context.viewport(0, 0, this.map.width, this.map.height);
  },

  destroy: function() {
    this.stop();
    for (var i = 0; i < this.items.length; i++) {
      if (this.items[i].destroy) {
        this.items[i].destroy();
      }
    }
    this.items = null;
  }
};
