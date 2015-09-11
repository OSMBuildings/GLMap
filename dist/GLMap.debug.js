var GLMap = (function(global) {var Color = (function(window) {


var w3cColors = {
  aqua:'#00ffff',
  black:'#000000',
  blue:'#0000ff',
  fuchsia:'#ff00ff',
  gray:'#808080',
  grey:'#808080',
  green:'#008000',
  lime:'#00ff00',
  maroon:'#800000',
  navy:'#000080',
  olive:'#808000',
  orange:'#ffa500',
  purple:'#800080',
  red:'#ff0000',
  silver:'#c0c0c0',
  teal:'#008080',
  white:'#ffffff',
  yellow:'#ffff00'
};

function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1/6) return p + (q-p) * 6 * t;
  if (t < 1/2) return q;
  if (t < 2/3) return p + (q-p) * (2/3 - t) * 6;
  return p;
}

function clamp(v, max) {
  return Math.min(max, Math.max(0, v));
}

var Color = function(h, s, l, a) {
  this.H = h;
  this.S = s;
  this.L = l;
  this.A = a;
};

/*
 * str can be in any of these:
 * #0099ff rgb(64, 128, 255) rgba(64, 128, 255, 0.5)
 */
Color.parse = function(str) {
  var
    r = 0, g = 0, b = 0, a = 1,
    m;

  str = (''+ str).toLowerCase();
  str = w3cColors[str] || str;

  if ((m = str.match(/^#(\w{2})(\w{2})(\w{2})$/))) {
    r = parseInt(m[1], 16);
    g = parseInt(m[2], 16);
    b = parseInt(m[3], 16);
  } else if ((m = str.match(/rgba?\((\d+)\D+(\d+)\D+(\d+)(\D+([\d.]+))?\)/))) {
    r = parseInt(m[1], 10);
    g = parseInt(m[2], 10);
    b = parseInt(m[3], 10);
    a = m[4] ? parseFloat(m[5]) : 1;
  } else {
    return;
  }

  return this.fromRGBA(r, g, b, a);
};

Color.fromRGBA = function(r, g, b, a) {
  if (typeof r === 'object') {
    g = r.g / 255;
    b = r.b / 255;
    a = r.a;
    r = r.r / 255;
  } else {
    r /= 255;
    g /= 255;
    b /= 255;
  }

  var
    max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    h, s, l = (max+min) / 2,
    d = max-min;

  if (!d) {
    h = s = 0; // achromatic
  } else {
    s = l > 0.5 ? d / (2-max-min) : d / (max+min);
    switch (max) {
      case r: h = (g-b) / d + (g < b ? 6 : 0); break;
      case g: h = (b-r) / d + 2; break;
      case b: h = (r-g) / d + 4; break;
    }
    h *= 60;
  }

  return new Color(h, s, l, a);
};

Color.prototype = {

  toRGBA: function() {
    var
      h = clamp(this.H, 360),
      s = clamp(this.S, 1),
      l = clamp(this.L, 1),
      rgba = { a: clamp(this.A, 1) };

    // achromatic
    if (s === 0) {
      rgba.r = l;
      rgba.g = l;
      rgba.b = l;
    } else {
      var
        q = l < 0.5 ? l * (1+s) : l + s - l*s,
        p = 2 * l-q;
        h /= 360;

      rgba.r = hue2rgb(p, q, h + 1/3);
      rgba.g = hue2rgb(p, q, h);
      rgba.b = hue2rgb(p, q, h - 1/3);
    }

    return {
      r: Math.round(rgba.r*255),
      g: Math.round(rgba.g*255),
      b: Math.round(rgba.b*255),
      a: rgba.a
    };
  },

  toString: function() {
    var rgba = this.toRGBA();

    if (rgba.a === 1) {
      return '#' + ((1 <<24) + (rgba.r <<16) + (rgba.g <<8) + rgba.b).toString(16).slice(1, 7);
    }
    return 'rgba(' + [rgba.r, rgba.g, rgba.b, rgba.a.toFixed(2)].join(',') + ')';
  },

  hue: function(h) {
    return new Color(this.H*h, this.S, this.L, this.A);
  },

  saturation: function(s) {
    return new Color(this.H, this.S*s, this.L, this.A);
  },

  lightness: function(l) {
    return new Color(this.H, this.S, this.L*l, this.A);
  },

  alpha: function(a) {
    return new Color(this.H, this.S, this.L, this.A*a);
  }
};

return Color; }(this));
var glx = (function(global) {
var glx = {};

var GL;

glx.View = function(container, width, height) {

  var canvas = document.createElement('CANVAS');
  canvas.style.position = 'absolute';
  canvas.width = width;
  canvas.height = height;
  container.appendChild(canvas);

  var options = {
    antialias: true,
    depth: true,
    premultipliedAlpha: false
  };

  try {
    GL = canvas.getContext('webgl', options);
  } catch (ex) {}
  if (!GL) {
    try {
      GL = canvas.getContext('experimental-webgl', options);
    } catch (ex) {}
  }
  if (!GL) {
    throw new Error('WebGL not supported');
  }

  //canvas.addEventListener('webglcontextlost', function(e) {});
  //canvas.addEventListener('webglcontextrestored', function(e) {});

  GL.viewport(0, 0, width, height);
  GL.cullFace(GL.BACK);
  GL.enable(GL.CULL_FACE);
  GL.enable(GL.DEPTH_TEST);
  GL.clearColor(0.5, 0.5, 0.5, 1);

  return GL;
};

glx.start = function(render) {
  return setInterval(function() {
    requestAnimationFrame(render);
  }, 17);
};

glx.stop = function(loop) {
  clearInterval(loop);
};

glx.destroy = function(GL) {
  GL.canvas.parentNode.removeChild(GL.canvas);
  GL.canvas = null;
};


glx.util = {};

glx.util.nextPowerOf2 = function(n) {
  n--;
  n |= n >> 1;  // handle  2 bit numbers
  n |= n >> 2;  // handle  4 bit numbers
  n |= n >> 4;  // handle  8 bit numbers
  n |= n >> 8;  // handle 16 bit numbers
  n |= n >> 16; // handle 32 bit numbers
  n++;
  return n;
};

glx.util.calcNormal = function(ax, ay, az, bx, by, bz, cx, cy, cz) {
  var d1x = ax-bx;
  var d1y = ay-by;
  var d1z = az-bz;

  var d2x = bx-cx;
  var d2y = by-cy;
  var d2z = bz-cz;

  var nx = d1y*d2z - d1z*d2y;
  var ny = d1z*d2x - d1x*d2z;
  var nz = d1x*d2y - d1y*d2x;

  return this.calcUnit(nx, ny, nz);
};

glx.util.calcUnit = function(x, y, z) {
  var m = Math.sqrt(x*x + y*y + z*z);

  if (m === 0) {
    m = 0.00001;
  }

  return [x/m, y/m, z/m];
};


glx.Buffer = function(itemSize, data) {
  this.id = GL.createBuffer();
  this.itemSize = itemSize;
  this.numItems = data.length/itemSize;
  GL.bindBuffer(GL.ARRAY_BUFFER, this.id);
  GL.bufferData(GL.ARRAY_BUFFER, data, GL.STATIC_DRAW);
  data = null;
};

glx.Buffer.prototype = {
  enable: function() {
    GL.bindBuffer(GL.ARRAY_BUFFER, this.id);
  },

  destroy: function() {
    GL.deleteBuffer(this.id);
  }
};


glx.Framebuffer = function(width, height) {
  this.setSize(width, height);
};

glx.Framebuffer.prototype = {

  setSize: function(width, height) {
    this.frameBuffer = GL.createFramebuffer();
    GL.bindFramebuffer(GL.FRAMEBUFFER, this.frameBuffer);

    this.width  = width;
    this.height = height;
    var size = glx.util.nextPowerOf2(Math.max(this.width, this.height));

    this.renderBuffer = GL.createRenderbuffer();
    GL.bindRenderbuffer(GL.RENDERBUFFER, this.renderBuffer);
    GL.renderbufferStorage(GL.RENDERBUFFER, GL.DEPTH_COMPONENT16, size, size);

    if (this.renderTexture) {
      this.renderTexture.destroy();
    }

    this.renderTexture = new glx.Texture({ size:size });

    GL.framebufferRenderbuffer(GL.FRAMEBUFFER, GL.DEPTH_ATTACHMENT, GL.RENDERBUFFER, this.renderBuffer);
    GL.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0, GL.TEXTURE_2D, this.renderTexture.id, 0); ////////

    if (GL.checkFramebufferStatus(GL.FRAMEBUFFER) !== GL.FRAMEBUFFER_COMPLETE) {
      throw new Error('This combination of framebuffer attachments does not work');
    }

    GL.bindRenderbuffer(GL.RENDERBUFFER, null);
    GL.bindFramebuffer(GL.FRAMEBUFFER, null);
  },

  enable: function() {
    GL.bindFramebuffer(GL.FRAMEBUFFER, this.frameBuffer);
    GL.bindRenderbuffer(GL.RENDERBUFFER, this.renderBuffer);
  },

  disable: function() {
    GL.bindFramebuffer(GL.FRAMEBUFFER, null);
    GL.bindRenderbuffer(GL.RENDERBUFFER, null);
  },

  getData: function() {
    var imageData = new Uint8Array(this.width*this.height*4);
    GL.readPixels(0, 0, this.width, this.height, GL.RGBA, GL.UNSIGNED_BYTE, imageData);
    return imageData;
  },

  destroy: function() {
    if (this.renderTexture) {
      this.renderTexture.destroy();
    }
  }
};


glx.Shader = function(config) {
  this.id = GL.createProgram();

  this.attach(GL.VERTEX_SHADER,   config.vertexShader);
  this.attach(GL.FRAGMENT_SHADER, config.fragmentShader);

  GL.linkProgram(this.id);

  if (!GL.getProgramParameter(this.id, GL.LINK_STATUS)) {
    throw new Error(GL.getProgramParameter(this.id, GL.VALIDATE_STATUS) +'\n'+ GL.getError());
  }

  this.attributeNames = config.attributes;
  this.uniformNames   = config.uniforms;

  if (config.framebuffer) {
    this.framebuffer = new glx.Framebuffer();
  }
};

glx.Shader.prototype = {

  locateAttribute: function(name) {
    var loc = GL.getAttribLocation(this.id, name);
    if (loc < 0) {
      console.error('unable to locate attribute "'+ name +'" in shader');
      return;
    }
    GL.enableVertexAttribArray(loc);
    this.attributes[name] = loc;
  },

  locateUniform: function(name) {
    var loc = GL.getUniformLocation(this.id, name);
    if (loc < 0) {
      console.error('unable to locate uniform "'+ name +'" in shader');
      return;
    }
    this.uniforms[name] = loc;
  },

  attach: function(type, src) {
    var shader = GL.createShader(type);
    GL.shaderSource(shader, src);
    GL.compileShader(shader);

    if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
      throw new Error(GL.getShaderInfoLog(shader));
    }

    GL.attachShader(this.id, shader);
  },

  enable: function() {
    GL.useProgram(this.id);

    var i;

    if (this.attributeNames) {
      this.attributes = {};
      for (i = 0; i < this.attributeNames.length; i++) {
        this.locateAttribute(this.attributeNames[i]);
      }
    }

    if (this.uniformNames) {
      this.uniforms = {};
      for (i = 0; i < this.uniformNames.length; i++) {
        this.locateUniform(this.uniformNames[i]);
      }
    }

    if (this.framebuffer) {
      this.framebuffer.enable();
    }

    return this;
  },

  disable: function() {
    if (this.attributes) {
      for (var name in this.attributes) {
        GL.disableVertexAttribArray(this.attributes[name]);
      }
    }

    this.attributes = null;
    this.uniforms = null;

    if (this.framebuffer) {
      this.framebuffer.disable();
    }
  }
};


glx.Matrix = function(data) {
  if (data) {
    this.data = new Float32Array(data);
  } else {
    this.identity();
  }
};

(function() {

  function rad(a) {
    return a * Math.PI/180;
  }

  function multiply(a, b) {
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
      b33 = b[15];

    return new Float32Array([
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
    ]);
  }

  glx.Matrix.prototype = {

    identity: function() {
      this.data = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
      ]);
      return this;
    },

    multiply: function(m) {
      this.data = multiply(this.data, m.data);
      return this;
    },

    translate: function(x, y, z) {
      this.data = multiply(this.data, [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        x, y, z, 1
      ]);
      return this;
    },

    rotateX: function(angle) {
      var a = rad(angle), c = Math.cos(a), s = Math.sin(a);
      this.data = multiply(this.data, [
        1, 0, 0, 0,
        0, c, s, 0,
        0, -s, c, 0,
        0, 0, 0, 1
      ]);
      return this;
    },

    rotateY: function(angle) {
      var a = rad(angle), c = Math.cos(a), s = Math.sin(a);
      this.data = multiply(this.data, [
        c, 0, -s, 0,
        0, 1, 0, 0,
        s, 0, c, 0,
        0, 0, 0, 1
      ]);
      return this;
    },

    rotateZ: function(angle) {
      var a = rad(angle), c = Math.cos(a), s = Math.sin(a);
      this.data = multiply(this.data, [
        c, -s, 0, 0,
        s, c, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
      ]);
      return this;
    },

    scale: function(x, y, z) {
      this.data = multiply(this.data, [
        x, 0, 0, 0,
        0, y, 0, 0,
        0, 0, z, 0,
        0, 0, 0, 1
      ]);
      return this;
    }
  };

  glx.Matrix.multiply = function(a, b) {
    return multiply(a.data, b.data);
  };

  glx.Matrix.Perspective = function(fov, aspect, near, far) {
    var f = 1/Math.tan(fov*(Math.PI/180)/2), nf = 1/(near - far);
    return new glx.Matrix([
      f/aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near)*nf, -1,
      0, 0, (2*far*near)*nf, 0
    ]);
  };

  glx.Matrix.invert3 = function(a) {
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
  };

  glx.Matrix.transpose = function(a) {
    return new Float32Array([
      a[0],
      a[3],
      a[6],
      a[1],
      a[4],
      a[7],
      a[2],
      a[5],
      a[8]
    ]);
  };

  // glx.Matrix.transform = function(x, y, z, m) {
  //   var X = x*m[0] + y*m[4] + z*m[8]  + m[12];
  //   var Y = x*m[1] + y*m[5] + z*m[9]  + m[13];
  //   var Z = x*m[2] + y*m[6] + z*m[10] + m[14];
  //   var W = x*m[3] + y*m[7] + z*m[11] + m[15];
  //   return {
  //     x: (X/W +1) / 2,
  //     y: (Y/W +1) / 2
  //   };
  // };

  glx.Matrix.transform = function(m) {
    var X = m[12];
    var Y = m[13];
    var W = m[15];
    return {
      x: (X/W +1) / 2,
      y: (Y/W +1) / 2
    };
  };

}());


glx.Texture = function(options) {
  options = options || {};

  this.id = GL.createTexture();
  GL.bindTexture(GL.TEXTURE_2D, this.id);

  if (options.size) {
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.NEAREST);
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.NEAREST);
    GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, options.size, options.size, 0, GL.RGBA, GL.UNSIGNED_BYTE, null);
  } else {
    GL.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, true);
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, options.filter || GL.LINEAR);
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR_MIPMAP_NEAREST);
//  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
//  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);

    if (options.image) {
      this.setImage(options.image);
    }

    GL.bindTexture(GL.TEXTURE_2D, null);
  }
};

glx.Texture.prototype = {
  enable: function(index) {
    GL.bindTexture(GL.TEXTURE_2D, this.id);
    GL.activeTexture(GL.TEXTURE0 + (index || 0));
  },

  disable: function() {
    GL.bindTexture(GL.TEXTURE_2D, null);
  },

  load: function(url, callback) {
    var image = this.image = new Image();
    image.crossOrigin = '*';
    image.onload = function() {
      // TODO: do this only once
      var maxTexSize = GL.getParameter(GL.MAX_TEXTURE_SIZE);
      if (image.width > maxTexSize || image.height > maxTexSize) {
        var w = maxTexSize, h = maxTexSize;
        var ratio = image.width/image.height;
        // TODO: if other dimension doesn't fit to POT after resize, there is still trouble
        if (ratio < 1) {
          w = Math.round(h*ratio);
        } else {
          h = Math.round(w/ratio);
        }

        var canvas = document.createElement('CANVAS');
        canvas.width  = w;
        canvas.height = h;

        var context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        image = canvas;
      }

      this.setImage(image);
      this.isLoaded = true;

      if (callback) {
        callback(image);
      }

    }.bind(this);

    image.onerror = function() {
      if (callback) {
        callback();
      }
    };

    image.src = url;
  },

  setImage: function(image) {
    GL.bindTexture(GL.TEXTURE_2D, this.id);
    GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, image);
    GL.generateMipmap(GL.TEXTURE_2D);
    image = null;
  },

  destroy: function() {
    GL.bindTexture(GL.TEXTURE_2D, null);
    GL.deleteTexture(this.id);
    if (this.image) {
      this.isLoaded = null;
      this.image.src = '';
      this.image = null;
    }
  }
};


glx.mesh = {};


glx.mesh.addQuad = function(data, a, b, c, d, color) {
  this.addTriangle(data, a, b, c, color);
  this.addTriangle(data, c, d, a, color);
};

glx.mesh.addTriangle = function(data, a, b, c, color) {
  data.vertices.push(
    a[0], a[1], a[2],
    b[0], b[1], b[2],
    c[0], c[1], c[2]
  );

  var n = glx.util.calcNormal(
    a[0], a[1], a[2],
    b[0], b[1], b[2],
    c[0], c[1], c[2]
  );

  data.normals.push(
    n[0], n[1], n[2],
    n[0], n[1], n[2],
    n[0], n[1], n[2]
  );

  data.colors.push(
    color[0], color[1], color[2], color[3],
    color[0], color[1], color[2], color[3],
    color[0], color[1], color[2], color[3]
  );
};


glx.mesh.Triangle = function(size, color) {

  var data = {
    vertices: [],
    normals: [],
    colors: []
  };

  var a = [-size/2, -size/2, 0];
  var b = [ size/2, -size/2, 0];
  var c = [ size/2,  size/2, 0];

  glx.mesh.addTriangle(data, a, b, c, color);

  this.vertexBuffer = new glx.Buffer(3, new Float32Array(data.vertices));
  this.normalBuffer = new glx.Buffer(3, new Float32Array(data.normals));
  this.colorBuffer  = new glx.Buffer(4, new Float32Array(data.colors));

 	this.transform = new glx.Matrix();
};


glx.mesh.Plane = function(size, color) {

  var data = {
    vertices: [],
    normals: [],
    colors: []
  };

  var a = [-size/2, -size/2, 0];
  var b = [ size/2, -size/2, 0];
  var c = [ size/2,  size/2, 0];
  var d = [-size/2,  size/2, 0];

  glx.mesh.addQuad(data, a, b, c, d, color);

  this.vertexBuffer = new glx.Buffer(3, new Float32Array(data.vertices));
  this.normalBuffer = new glx.Buffer(3, new Float32Array(data.normals));
  this.colorBuffer  = new glx.Buffer(4, new Float32Array(data.colors));

 	this.transform = new glx.Matrix();
};


glx.mesh.Cube = function(size, color) {

  var data = {
    vertices: [],
    normals: [],
    colors: []
  };

  var a = [-size/2, -size/2, -size/2];
  var b = [ size/2, -size/2, -size/2];
  var c = [ size/2,  size/2, -size/2];
  var d = [-size/2,  size/2, -size/2];

  var A = [-size/2, -size/2, size/2];
  var B = [ size/2, -size/2, size/2];
  var C = [ size/2,  size/2, size/2];
  var D = [-size/2,  size/2, size/2];

  glx.mesh.addQuad(data, a, b, c, d, color);
  glx.mesh.addQuad(data, A, B, C, D, color);
  glx.mesh.addQuad(data, a, b, B, A, color);
  glx.mesh.addQuad(data, b, c, C, B, color);
  glx.mesh.addQuad(data, c, d, D, C, color);
  glx.mesh.addQuad(data, d, a, A, D, color);

  this.vertexBuffer = new glx.Buffer(3, new Float32Array(data.vertices));
  this.normalBuffer = new glx.Buffer(3, new Float32Array(data.normals));
  this.colorBuffer  = new glx.Buffer(4, new Float32Array(data.colors));

  this.transform = new glx.Matrix();
};

return glx;
}(this));

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


var Events = {};

(function() {

  var listeners = {};

  Events.on = function(type, fn) {
    if (!listeners[type]) {
      listeners[type] = [];
    }
    listeners[type].push(fn);
  };

  Events.off = function(type, fn) {
    if (listeners[type]) {
      for (var i = 0, il = listeners[type].length; i<il; i++) {
        if (listeners[type][i] === fn) {
          listeners[type].splice(i, 1);
        }
      }
    }
  };

  Events.emit = function(type, payload) {
    if (listeners[type]) {
      for (var i = 0, il = listeners[type].length; i<il; i++) {
        listeners[type][i](payload);
      }
    }
  };

  Events.destroy = function() {
    listeners = null;
  };

}());


var Interaction = {};

(function() {

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
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    e.returnValue = false;
  }

  //***************************************************************************

  var
    prevX = 0, prevY = 0,
    startX = 0, startY  = 0,
    startZoom = 0,
    prevRotation = 0,
    prevTilt = 0,
    button,
    stepX, stepY,
    pointerIsDown = false;

  function onDragStart(e) {
    if (Interaction.isDisabled || e.button > 1) {
      return;
    }

    cancelEvent(e);

    startZoom = Map.zoom;
    prevRotation = Map.rotation;
    prevTilt = Map.tilt;

    stepX = 360/innerWidth;
    stepY = 360/innerHeight;

    if (e.touches === undefined) {
      button = e.button;
    } else {
      if (e.touches.length > 1) {
        return;
      }
      e = e.touches[0];
    }

    startX = prevX = e.clientX;
    startY = prevY = e.clientY;

    pointerIsDown = true;
  }

  function onDragMove(e) {
    if (Interaction.isDisabled || !pointerIsDown) {
      return;
    }

    if (e.touches !== undefined) {
      if (e.touches.length > 1) {
        return;
      }
      e = e.touches[0];
    }

    if ((e.touches !== undefined || button === 0) && !e.altKey) {
      moveMap(e);
    } else {
      prevRotation += (e.clientX - prevX)*stepX;
      prevTilt     -= (e.clientY - prevY)*stepY;
      Map.setRotation(prevRotation);
      Map.setTilt(prevTilt);
    }

    prevX = e.clientX;
    prevY = e.clientY;
  }

  function onDragEnd(e) {
    if (Interaction.isDisabled || !pointerIsDown) {
      return;
    }

    if (e.touches !== undefined) {
      if (e.touches.length>1) {
        return;
      }
      e = e.touches[0];
    }

    if ((e.touches !== undefined || button === 0) && !e.altKey) {
      if (Math.abs(e.clientX-startX) < 5 && Math.abs(e.clientY-startY) < 5) {
        onClick(e);
      } else {
        moveMap(e);
      }
    } else {
      prevRotation += (e.clientX - prevX)*stepX;
      prevTilt     -= (e.clientY - prevY)*stepY;
      Map.setRotation(prevRotation);
      Map.setTilt(prevTilt);
    }

    pointerIsDown = false;
  }

  function onGestureChange(e) {
    if (Interaction.isDisabled) {
      return;
    }
    cancelEvent(e);
    Map.setZoom(startZoom + (e.scale - 1));
    Map.setRotation(prevRotation - e.rotation);
//  Map.setTilt(prevTilt ...);
  }

  function onDoubleClick(e) {
    if (Interaction.isDisabled) {
      return;
    }
    cancelEvent(e);
    Map.setZoom(Map.zoom + 1, e);
  }

  function onClick(e) {
    if (Interaction.isDisabled) {
      return;
    }
    cancelEvent(e);
    // Interaction.getFeatureID({ x:e.clientX, y:e.clientY }, function(featureID) {
    //   Events.emit('click', { target: { id:featureID } });
    // });
  }

  function onMouseWheel(e) {
    if (Interaction.isDisabled) {
      return;
    }
    cancelEvent(e);
    var delta = 0;
    if (e.wheelDeltaY) {
      delta = e.wheelDeltaY;
    } else if (e.wheelDelta) {
      delta = e.wheelDelta;
    } else if (e.detail) {
      delta = -e.detail;
    }

    var adjust = 0.2*(delta>0 ? 1 : delta<0 ? -1 : 0);
    Map.setZoom(Map.zoom + adjust, e);
  }

  function moveMap(e) {
    var dx = e.clientX - prevX;
    var dy = e.clientY - prevY;
    var r = rotatePoint(dx, dy, Map.rotation*Math.PI/180);
//    Map.setCenter({ x:Map.center.x-r.x, y:Map.center.y-r.y });
  }

  function rotatePoint(x, y, angle) {
    return {
      x: Math.cos(angle)*x - Math.sin(angle)*y,
      y: Math.sin(angle)*x + Math.cos(angle)*y
    };
  }

  //***************************************************************************

  Interaction.init = function(container) {
    var hasTouch = ('ontouchstart' in global);
    addListener(container, hasTouch ? 'touchstart' : 'mousedown', onDragStart);
    addListener(container, 'dblclick', onDoubleClick);
    addListener(document, hasTouch ? 'touchmove' : 'mousemove', onDragMove);
    addListener(document, hasTouch ? 'touchend' : 'mouseup', onDragEnd);

    if (hasTouch) {
      addListener(container, 'gesturechange', onGestureChange);
    } else {
      addListener(container, 'mousewheel', onMouseWheel);
      addListener(container, 'DOMMouseScroll', onMouseWheel);
    }

    var resizeTimer;
    addListener(global, 'resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function() {
        Events.emit('resize');
      }, 250);
    });
  };

  Interaction.setDisabled = function(flag) {
    Interaction.isDisabled = !!flag;
  };

  Interaction.destroy = function() {};

}());


var Activity = {};

(function() {

  var items = [];

  Activity.setBusy = function(key) {
    if (!items.length) {
      Events.emit('busy');
    }
    if (items.indexOf(key) === -1) {
      items.push(key);
    }
  };

  Activity.setIdle = function(key) {
    if (!items.length) {
      return;
    }
    var i = items.indexOf(key);
    if (i > -1) {
      items.splice(i, 1);
    }
    if (!items.length) {
      Events.emit('idle');
    }
  };

}());


var Map = {

  zoom: 0,
  center: { x:0, y:0 },
  bounds: { minX:0, maxX:0, minY:0, maxY:0 },
  rotation: 0,
  tilt: 0,

  setZoom: function(zoom, e) {
    zoom = clamp(parseFloat(zoom), this.minZoom, this.maxZoom);
    if (this.zoom !== zoom) {
      var ratio = Math.pow(2, zoom-this.zoom);
      this.zoom = zoom;
      if (!e) {
        this.center.x *= ratio;
        this.center.y *= ratio;
      } else {
        var dx = WIDTH/2  - e.clientX;
        var dy = HEIGHT/2 - e.clientY;
        this.center.x -= dx;
        this.center.y -= dy;
        this.center.x *= ratio;
        this.center.y *= ratio;
        this.center.x += dx;
        this.center.y += dy;
      }
// updateBounds();
      Events.emit('change');
    }
    return this;
  },

  setPosition: function(position) {
    var
      latitude  = clamp(parseFloat(position.latitude), -90, 90),
      longitude = clamp(parseFloat(position.longitude), -180, 180),
      center = project(latitude, longitude, TILE_SIZE*Math.pow(2, this.zoom));
    if (this.center.x !== center.x || this.center.y !== center.y) {
      this.center.x = center.x;
      this.center.y = center.y;
// updateBounds();
      Events.emit('change');
    }
    return this;
  },

  getPosition: function() {
    return unproject(this.center.x, this.center.y, TILE_SIZE*Math.pow(2, this.zoom));
  },

  getBounds: function() {
    var
      worldSize = TILE_SIZE*Math.pow(2, this.zoom),
      nw = unproject(this.bounds.minX, this.bounds.maxY, worldSize),
      se = unproject(this.bounds.maxX, this.bounds.minY, worldSize);
    return {
      n: nw.latitude,
      w: nw.longitude,
      s: se.latitude,
      e: se.longitude
    };
  },

  setRotation: function(rotation) {
    rotation = parseFloat(rotation)%360;
    if (this.rotation !== rotation) {
      this.rotation = rotation;
// updateBounds();
      Events.emit('change');
    }
    return this;
  },

  setTilt: function(tilt) {
    tilt = clamp(parseFloat(tilt), 0, 90);
    if (this.tilt !== tilt) {
      this.tilt = tilt;
// updateBounds();
      Events.emit('change');
    }
    return this;
  },

  destroy: function() {}
};


var Layers = {

  items: [],

  add: function(layer) {
    this.items.push(layer);
  },

  remove: function(layer) {
    this.attribution = [];
    for (var i = 0; i < this.items.length; i++) {
      if (this.items[i] === layer) {
        this.items.splice(i, 1);
      }
    }
  },

  getAttributions: function(attribution) {
    for (var i = 0; i < this.items.length; i++) {
      if (this.items[i].attribution) {
        attribution.push(this.items[i].attribution);
      }
    }
    return attribution;
  },

  render: function(vpMatrix) {
    debugger
    for (var i = 0; i < this.items.length; i++) {
      this.items[i].render(vpMatrix);
    }
  },

  destroy: function() {
    for (var i = 0; i < this.items.length; i++) {
      if (this.items[i].destroy) {
        this.items[i].destroy();
      }
    }
    this.items = null;
  }
};


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


var State = {};

(function() {

  function save(map) {
    if (!history.replaceState) {
      return;
    }

    var params = [];
    var position = map.getPosition();
    params.push('lat=' + position.latitude.toFixed(5));
    params.push('lon=' + position.longitude.toFixed(5));
    params.push('zoom=' + map.zoom.toFixed(1));
    params.push('tilt=' + map.tilt.toFixed(1));
    params.push('rotation=' + map.rotation.toFixed(1));
    history.replaceState({}, '', '?'+ params.join('&'));
  }

  State.load = function(state) {
    var query = location.search;
    if (query) {
      var params = {};
      query = query.substring(1).replace( /(?:^|&)([^&=]*)=?([^&]*)/g, function($0, $1, $2) {
        if ($1) {
          params[$1] = $2;
        }
      });

      if (params.lat !== undefined && params.lon !== undefined) {
        state.position = { latitude:parseFloat(params.lat), longitude:parseFloat(params.lon) };
      }
      if (params.zoom !== undefined) {
        state.zoom = parseFloat(params.zoom);
      }
      if (params.rotation !== undefined) {
        state.rotation = parseFloat(params.rotation);
      }
      if (params.tilt !== undefined) {
        state.tilt = parseFloat(params.tilt);
      }
    }
    return state;
  };

  var timer;
  State.save = function(map) {
    clearTimeout(timer);
    timer = setTimeout(function() {
      save(map);
    }, 1000);
  };

  Events.on('change', function() {
    State.save(Map);
  });

}());


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


var MapTile = function(tileX, tileY, zoom) {
  this.tileX = tileX;
  this.tileY = tileY;
  this.zoom = zoom;

  this.vertexBuffer = new glx.Buffer(3, new Float32Array([
    255,   0, 0,
    255, 255, 0,
    0,     0, 0,
    0,   255, 0
  ]));
  this.texCoordBuffer = new glx.Buffer(2, new Float32Array([
    1, 1,
    1, 0,
    0, 1,
    0, 0
  ]));

  this.texture = new glx.Texture();
};

MapTile.prototype = {

  load: function(url) {
    this.url = url;
    Activity.setBusy(url);
    this.texture.load(url, function(image) {
      Activity.setIdle(url);
      if (image) {
        this.isLoaded = true;
      }
    }.bind(this));
  },

  getMatrix: function() {
    if (!this.isLoaded) {
      return;
    }

    var mMatrix = new glx.Matrix();

    var
      ratio = 1 / Math.pow(2, this.zoom - Map.zoom),
      mapCenter = Map.center;

    mMatrix.scale(ratio * 1.005, ratio * 1.005, 1);
    mMatrix.translate(this.tileX * TILE_SIZE * ratio - mapCenter.x, this.tileY * TILE_SIZE * ratio - mapCenter.y, 0);

    return mMatrix;
  },

  destroy: function() {
    this.vertexBuffer.destroy();
    this.texCoordBuffer.destroy();
    this.texture.destroy();
    Activity.setIdle(this.url);
  }
};


var PI = Math.PI;
var TILE_SIZE = 256;
var document = global.document;


function clamp(value, min, max) {
  return Math.min(max, Math.max(value, min));
}

function project(latitude, longitude, worldSize) {
  var
    x = longitude/360 + 0.5,
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
  return GLMap;}(this));if (typeof define === 'function') {  define([], GLMap);} else if (typeof exports === 'object') {  module.exports = GLMap;} else {  global.GLMap = GLMap;}