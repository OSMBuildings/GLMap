
Renderer = {

  start: function(backgroundColor) {
    this.resize();
    Events.on('resize', this.resize.bind(this));

    var color = Color.parse(backgroundColor || '#cccccc').toRGBA();
    this.backgroundColor = {
      r: color.r/255,
      g: color.g/255,
      b: color.b/255
    };

    GL.cullFace(GL.BACK);
    GL.disable(GL.CULL_FACE);
    GL.enable(GL.DEPTH_TEST);

    //Events.on('contextlost', function() {
    //  this.stop();
    //}.bind(this));

    //Events.on('contextrestored', function() {
    //  this.start();
    //}.bind(this));

    glx.start(function() {
      Map.transform = new glx.Matrix();
      Map.transform.rotateZ(Map.rotation);
      Map.transform.rotateX(Map.tilt);
      Map.transform.translate(0, 0, -300);
// .translate(WIDTH/2, HEIGHT/2, 0)

// console.log('CONTEXT LOST?', GL.isContextLost());

      var vpMatrix = new glx.Matrix(glx.Matrix.multiply(Map.transform, this.perspective));

      GL.clearColor(this.backgroundColor.r, this.backgroundColor.g, this.backgroundColor.b, 1);
      GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

      Layers.render(vpMatrix);
    }.bind(this));
  },

  resize: function() {
    this.perspective = new glx.Matrix.Perspective(45, WIDTH/HEIGHT, 0.1, 1000);
    GL.viewport(0, 0, WIDTH, HEIGHT);
  },

  destroy: function() {
    glx.stop();
  }
};
