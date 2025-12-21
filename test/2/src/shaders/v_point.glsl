/// vShaderSrc.glsl
//
precision mediump float;

attribute vec2 a_position;
attribute vec2 a_pos;        // Posição central do círculo (pixels)
attribute float a_radius;    // Raio do círculo (pixels)
attribute vec4 a_fillColor;
attribute vec4 a_strokeColor;
attribute float a_strokeWidth;

uniform vec2 u_resolution; // Tamanho do canvas (largura, altura)

varying vec2 v_uv;           // Passa a coordenada local para o Fragment Shader
varying float v_radius;      // DEVE ser declarado aqui
varying vec4 v_fillColor;    //
varying vec4 v_strokeColor;  //
varying float v_strokeWidth; // DEVE ser declarado aqui

void main() {
  // Calcula o tamanho total necessário (raio + borda)
  float totalSize = a_radius + a_strokeWidth;

  // Mapeia os pontos do buffer para o tamanho e posição corretos
  vec2 realPos = a_position * totalSize + a_pos;

  // Converte pixels para o espaço do WebGL (-1.0 a 1.0)
  vec2 zeroToTwo = (realPos / u_resolution) * 2.0;
  vec2 clipSpace = zeroToTwo - 1.0;

  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1); // Inverte Y para o topo ser 0
  v_uv = a_position;             // Coordenada de -1.0 a 1.0
  v_radius = a_radius;           // Passando para o fragment shader
  v_fillColor = a_fillColor;     // Passando para o fragment shader
  v_strokeColor = a_strokeColor;
  v_strokeWidth = a_strokeWidth; // Passando para o fragment shader
}