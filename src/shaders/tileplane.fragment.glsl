
precision mediump float;

uniform sampler2D uTileImage;

varying vec2 vTexCoord;

void main() {
  vec4 texel = texture2D(uTileImage, vec2(vTexCoord.x, -vTexCoord.y));
  gl_FragColor = texel;
}
