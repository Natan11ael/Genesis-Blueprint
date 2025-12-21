/// CanvasJS.js
//
/// Load Shader
function loadShader(url) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);

    if (xhr.status === 200) return xhr.responseText;
    else throw new Error(`Falha ao carregar shader: ${url}`);
}
//
/// Create program
function createProgram(gl, vSrc, fSrc) {
    const p = gl.createProgram();
    [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER].forEach((tipo, i) => {
        const s = gl.createShader(tipo);
        gl.shaderSource(s, i === 0 ? vSrc : fSrc);
        gl.compileShader(s);

        // Check for compilation errors
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.error("[webGL][Shaders] Erro:", gl.getShaderInfoLog(s));
            gl.deleteShader(s);
            return;
        }

        gl.attachShader(p, s);
    });
    gl.linkProgram(p);
    // Check for linking errors
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error("[webGL][Program] Erro:", gl.getProgramInfoLog(p));
    return p;
}
//
/// Create attribute 
function createAttribute(gl, ext, prog, data) {
    const att = gl.getAttribLocation(prog, data.name);
    gl.enableVertexAttribArray(att);
    gl.vertexAttribPointer(att, data.amount ?? 1, data.type, data.norm ?? false, data.stride, data.offset);
    if (ext) ext.vertexAttribDivisorANGLE(att, data.divisor ?? 0);
}
//
/// Class Definition
class CanvasJS extends HTMLCanvasElement {
    constructor() {
        super();

        /// Initialize properties extended
        //
        /// WebGL Context
        this.ctx = this.getContext('webgl');
        if (!this.ctx) throw new Error("WebGL not supported");
        // Set default clear color and blend mode
        this.ctx.clearColor(0.0, 0.0, 0.0, 1.0);
        this.ctx.enable(this.ctx.BLEND);
        this.ctx.blendFunc(this.ctx.SRC_ALPHA, this.ctx.ONE_MINUS_SRC_ALPHA, this.ctx.ONE, this.ctx.ONE_MINUS_SRC_ALPHA);

        /// Load Shaders Source
        const vss_point = loadShader('./src/shaders/v_point.glsl');
        const fss_point = loadShader('./src/shaders/f_point.glsl');
        const vss_line = loadShader('./src/shaders/v_line.glsl');
        const fss_line = loadShader('./src/shaders/f_line.glsl');

        /// Create and use programs
        const p_point = createProgram(this.ctx, vss_point, fss_point);
        const p_line = createProgram(this.ctx, vss_line, fss_line);
        this.ctx.useProgram(p_line);

        /// 
        this.ext = this.ctx.getExtension('ANGLE_instanced_arrays');
        if (!this.ext) throw new Error("Instancing not supported");

        /// Vertex Attribute
        //
        this.ctx.useProgram(p_point);
        const buffer = this.ctx.createBuffer();
        this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, buffer);
        const vertices = new Float32Array([
            -1, -1, 1, -1, -1, 1,
            -1,  1, 1, -1,  1, 1
        ]);
        this.ctx.bufferData(this.ctx.ARRAY_BUFFER, vertices, this.ctx.STATIC_DRAW);
        //
        createAttribute(this.ctx, false, p_point, {
            name:'a_position',
            amount: 2, 
            type: this.ctx.FLOAT,
            stride: 0,
            offset: 0
        });

        /// Instance Attribute
        //
        this.instanceBuffer = this.ctx.createBuffer();
        this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.instanceBuffer);
        const stride = 24;
        //
        // Atributo: a_pos (vec2)
        createAttribute(this.ctx, this.ext, p_point, {
            name:'a_pos',
            amount: 2, 
            type: this.ctx.FLOAT,
            stride: stride,
            offset: 0,
            divisor: 1
        });

        // Atributo: a_radius (float)
        createAttribute(this.ctx, this.ext, p_point, {
            name:'a_radius',
            type: this.ctx.FLOAT,
            stride: stride,
            offset: 8,
            divisor: 1
        });

        // Atributo: a_strokeWidth (float)
        createAttribute(this.ctx, this.ext, p_point, {
            name:'a_strokeWidth',
            type: this.ctx.FLOAT,
            stride: stride,
            offset: 12,
            divisor: 1
        });

        // Atributo: a_fillColor (vec4)
        createAttribute(this.ctx, this.ext, p_point, {
            name:'a_fillColor',
            amount: 4,
            type: this.ctx.UNSIGNED_BYTE,
            norm: true,
            stride: stride,
            offset: 16,
            divisor: 1
        });

        // Atributo: a_strokeColor (vec4)
        createAttribute(this.ctx, this.ext, p_point, {
            name:'a_strokeColor',
            amount: 4,
            type: this.ctx.UNSIGNED_BYTE,
            norm: true,
            stride: stride,
            offset: 20,
            divisor: 1
        });

        // Get uniform locations
        this.locs = { 
            res: this.ctx.getUniformLocation(p_point, "u_resolution"),
            l_res: this.ctx.getUniformLocation(p_point, "u_resolution")
        };

        // Make Buffers
        const buf = new ArrayBuffer(50000 * 6)
        this.p_f32 = new Float32Array(buf);
        this.p_u32 = new Uint32Array(buf);
        this.l_f32 = new Float32Array(buf);
        this.l_u32 = new Uint32Array(buf);
        this.init = false;

        /// Time properties
        this.timers = new Map();
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fps = 0;

        /// Bindings
        this.run = this.run.bind(this);
        this.resize = this.resize.bind(this);
        this.main = function () { };

        /// Initial resize
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    // Set background color
    set background(color) {
        this.ctx.clearColor(
            ((color >> 24) & 0xFF) / 255, // R
            ((color >> 16) & 0xFF) / 255, // G
            ((color >> 8) & 0xFF) / 255, // B
            (color & 0xFF) / 255  // A
        );
    }

    // 
    countdown(id, delay, action) {
        if (!this.timers) this.timers = new Map();
        if (!this.timers.has(id)) this.timers.set(id, 0);

        let currentTime = this.timers.get(id) + this.deltaTime;
        if (currentTime >= delay) {
            action();
            currentTime = 0;
        }

        this.timers.set(id, currentTime);
    }

    // 2. Rrender (GPU)
    dispatchDraw(count, isOverflow) {
        //
        this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.instanceBuffer);
        if (isOverflow || !this.init) {
            this.ctx.bufferData(this.ctx.ARRAY_BUFFER, this.p_f32, this.ctx.DYNAMIC_DRAW);
            this.init = true;
        }
        else this.ctx.bufferSubData(this.ctx.ARRAY_BUFFER, 0, this.p_f32, 0, count * 6);

        //
        this.ext.drawArraysInstancedANGLE(this.ctx.TRIANGLES, 0, 6, count);
    }

    // Resize Canvas
    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.ctx.viewport(0, 0, this.width, this.height);
        this.ctx.uniform2f(this.locs.res, this.width, this.height);
    }

    // Main Loop
    run(time) {
        // Clear Canvas
        this.ctx.clear(this.ctx.COLOR_BUFFER_BIT);

        // Update time
        this.deltaTime = this.lastTime ? (time - this.lastTime) / 1000 : 0.016;
        canvas.countdown('fps', .1, () => { this.fps = this.deltaTime > 0 ? 1 / this.deltaTime : 0 });
        this.lastTime = time;

        // Logic and Render
        this.main();

        requestAnimationFrame(this.run); // next frame
    }
};
customElements.define('canvas-js', CanvasJS, { extends: 'canvas' }); // Extend HTMLCanvasElement
//