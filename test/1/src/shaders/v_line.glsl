attribute vec2 a_posA;
attribute vec2 a_posB;
attribute vec4 a_color;
attribute vec2 a_corner;
attribute float a_thickness;

uniform vec2 u_resolution;

varying vec4 v_color;

void main() {
    v_color = a_color; // set color

    // 
    vec2 dir = normalize(a_posB - a_posA);
    vec2 norm = vec2(-dir.y, dir.x);
    
    //
    vec2 i_pos = (a_corner.y < 0.0) ? a_posA : a_posB;
    vec2 f_pos = i_pos + (norm * a_thickness * 0.5 * a_corner.x);
    
    vec2 clipSpace = (f_pos / u_resolution) * 2.0 - 1.0;
    gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
}
