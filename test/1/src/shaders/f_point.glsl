/// fShaderSrc.glsl
//
precision mediump float;

varying vec2 v_uv;
varying float v_radius;
varying vec4 v_fillColor;
varying vec4 v_strokeColor;
varying float v_strokeWidth;

void main() {
    float dist = length(v_uv);

    // Define os limites das áreas (tudo ou nada, sem suavização)
    float innerLimit = (v_radius - v_strokeWidth) / v_radius;
    float outerLimit = 1.0; // Fim do 'quadrado' de desenho

    // Usa 'step' para decidir a cor de forma binária
    // step(borda_dura, valor_atual): retorna 0.0 ou 1.0
    float isInsideFill = step(dist, innerLimit);
    float isInsideStroke = step(dist, outerLimit);

    // Define a cor final baseada na lógica
    vec4 color;
    if(isInsideFill == 1.0) color = v_fillColor;
    else if(isInsideStroke == 1.0) color = v_strokeColor;
    else discard; // Fora do círculo, não pinta nada

    gl_FragColor = color;
}