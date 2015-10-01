#ifdef GL_ES
  precision mediump float;
#endif

#define halfPi 1.57079632679

attribute vec4 aPosition;
attribute vec2 aTexCoord;

uniform mat4 uModelMatrix;
uniform mat4 uTransformMatrix;
uniform mat4 uProjectionMatrix;

uniform float uBendRadius;
uniform float uBendDistance;

uniform float uFogRadius;

varying vec2 vTexCoord;
varying float vFogIntensity;

float fogBlur = 200.0;

void main() {

  //*** bending ***************************************************************

  vec4 mwPosition = uTransformMatrix * uModelMatrix * aPosition;

  float innerRadius = uBendRadius + mwPosition.y;
  float depth = abs(mwPosition.z);
  float s = depth-uBendDistance;
  float theta = min(max(s, 0.0 )/uBendRadius, halfPi);
  
  float newY = cos(theta)*innerRadius - uBendRadius - max(s - halfPi*uBendRadius, 0.0);
  float newZ = normalize(mwPosition.z) * (min(depth, uBendDistance) + sin(theta)*innerRadius);

  vec4 newPosition = vec4(mwPosition.x, newY, newZ, 1.0);

//  gl_Position = uProjectionMatrix * newPosition;

  vec4 glPosition = uProjectionMatrix * uTransformMatrix * aPosition;
  gl_Position = glPosition;

  vTexCoord = aTexCoord;

  //*** fog *******************************************************************

  vec4 mPosition = uModelMatrix * aPosition;
  float distance = length(mPosition);
  // => (distance - (uFogRadius - fogBlur)) / (uFogRadius - (uFogRadius - fogBlur));
  float fogIntensity = (distance - uFogRadius) / fogBlur + 1.1; // <- shifts blur in/out

  //vFogIntensity = clamp(fogIntensity, 0.0, 1.0);
  vFogIntensity = 0.0;
}
