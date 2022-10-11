precision mediump float;

varying vec4 v_color;
varying vec2 v_normal;
varying float v_thickness;
varying float v_lengthSoFar;
varying float v_isStartPos;

const float feather = 0.001;
const vec4 transparent = vec4(0.0, 0.0, 0.0, 0.0);
const float NumDashes = 10.0; // 10 dashes for every 1 unit in LengthSoFar

void main(void) {
  // float dist = length(v_normal) * v_thickness;

  float modLen = mod(v_lengthSoFar * 100.0, 0.10);

  if (modLen < 0.05) {
    gl_FragColor = v_color;
  } else {
    gl_FragColor = transparent;
  }

}
