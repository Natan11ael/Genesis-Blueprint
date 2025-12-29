/// CanvasJS.js
//
/// Load Shader
async function loadShader(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`[Status HTTP]: ${response.status}`);
        console.log(`[WebGL][Load]:"${url}"`);
        return await response.text();
    } catch (err) {
        throw new Error(`[WebGL][Shader][${url}]: ${err.message}`);
    }
}
//
/// Create program
function createProgram(gl, vSrc, fSrc, debugName = "Unnamed") {
    const program = gl.createProgram();
    const shaders = [];
    const sources = [
        { type: gl.VERTEX_SHADER, src: vSrc, name: "Vertex" },
        { type: gl.FRAGMENT_SHADER, src: fSrc, name: "Fragment" }
    ];

    //
    for (const sInfo of sources) {
        const shader = gl.createShader(sInfo.type);
        gl.shaderSource(shader, sInfo.src);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const log = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error(`[WebGL][Shader][${debugName}][${sInfo.name}]: ${log}`);
        }

        gl.attachShader(program, shader);
        shaders.push(shader);
    }
    gl.linkProgram(program);

    //
    shaders.forEach(s => {
        gl.detachShader(program, s);
        gl.deleteShader(s);
    });

    //
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error(`[WebGL][Program][${debugName}]: ${log}`);
    }

    console.log(`[WebGL][Create]: "${debugName}".`);
    return program;
}
//
/// Create attribute 
function createAttribute(gl, ext, prog, data) {
    const loc = gl.getAttribLocation(prog, data.name);
    if (loc === -1) {
        console.warn(`[WebGL][Attribute]: Attribute "${data.name}" not found or not used in the shader.`);
        return;
    }

    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, data.amount ?? 1, data.type, data.norm ?? false, data.stride, data.offset);
    if (data.divisor === undefined) return
    if (gl.vertexAttribDivisor) gl.vertexAttribDivisor(loc, data.divisor);
    else {
        if (!ext) ext = gl.getExtension('ANGLE_instanced_arrays');
        ext.vertexAttribDivisorANGLE(loc, data.divisor ?? 0);
    }
    console.log(`[WebGL][Create]: ${data.name}`);
}
//
/// class CanvasJS
class CanvasJS extends HTMLCanvasElement {
    // Variaveis Privadas
    #gl
    #ext
    #vao

    constructor() {
        super(); // Init Canvas
        //
        /// Get Canvas | WebGL | Extensions
        if (!this) throw new Error('[Canvas] not found');
        //
        this.#gl = this.getContext('webgl');
        if (!this.#gl) throw new Error('[WebGL]: not supported');
        //
        this.#ext = this.#gl.getExtension('ANGLE_instanced_arrays');
        if (!this.#ext) throw new Error("[Ext]: not supported");
        //
        this.#vao = this.#gl.getExtension('OES_vertex_array_object');
        if (!this.#vao) throw new Error("[Vao]: not supported");
        //
        // pre-set buffers
        this.p_point;
        this.vao_point;
        this.ibuffer_point;
        this.p_f32;
        this.p_u32;
        this.u_res_point;
        this.p_line;
        this.vao_line;
        this.ibuffer_line;
        this.l_f32;
        this.l_u32;
        this.u_res_line;
        this.first_time = false;
        //
        // pre-set time managers
        this.timers = new Map();
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fps = 0;
        //
        // pre-set functions
        this.run = this.run.bind(this);
        this.resize = this.resize.bind(this);
        this.main = () => null;
        //
        // Loads webgl resources
        this.init();
    }
    async init() {
        //
        /// Get Shaders
        const [vss_point, fss_point, vss_line, fss_line] = await Promise.all([
            loadShader('./src/shaders/v_point.glsl'),
            loadShader('./src/shaders/f_point.glsl'),
            loadShader('./src/shaders/v_line.glsl'),
            loadShader('./src/shaders/f_line.glsl')
        ]);
        //
        /// Init Programs
        this.p_point = createProgram(this.#gl, vss_point, fss_point, 'Point Shaders');
        this.p_line = createProgram(this.#gl, vss_line, fss_line, 'Line Shaders');
        //
        /// Init drawing objects [Geometry | VAOs | Attrbutes]
        // - init Point
        console.log('[WebGL][Create]: Designer Point')
        //
        // init vao
        this.vao_point = this.#vao.createVertexArrayOES();
        this.#vao.bindVertexArrayOES(this.vao_point);
        //
        // init vertex buffer
        const vbuffer_point = this.#gl.createBuffer();
        this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, vbuffer_point);
        this.#gl.bufferData(this.#gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), this.#gl.STATIC_DRAW);
        createAttribute(this.#gl, this.#ext, this.p_point, { name: 'a_position', amount: 2, type: this.#gl.FLOAT });
        //
        // init instance buffer
        const point_stride = 24;
        this.ibuffer_point = this.#gl.createBuffer();
        this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.ibuffer_point);
        this.#gl.bufferData(this.#gl.ARRAY_BUFFER, 10000 * point_stride, this.#gl.DYNAMIC_DRAW); // Alocamos espaço para, por exemplo, 10.000 instâncias (stride 24 bytes)
        //
        // init instance attribute
        createAttribute(this.#gl, this.#ext, this.p_point, {
            name: 'a_pos',
            amount: 2,
            type: this.#gl.FLOAT,
            stride: point_stride,
            offset: 0,
            divisor: 1
        });
        createAttribute(this.#gl, this.#ext, this.p_point, {
            name: 'a_radius',
            type: this.#gl.FLOAT,
            stride: point_stride,
            offset: 8,
            divisor: 1
        });
        createAttribute(this.#gl, this.#ext, this.p_point, {
            name: 'a_strokeWidth',
            type: this.#gl.FLOAT,
            stride: point_stride,
            offset: 12,
            divisor: 1
        });
        createAttribute(this.#gl, this.#ext, this.p_point, {
            name: 'a_fillColor',
            amount: 4,
            type: this.#gl.UNSIGNED_BYTE,
            norm: true,
            stride: point_stride,
            offset: 16,
            divisor: 1
        });
        createAttribute(this.#gl, this.#ext, this.p_point, {
            name: 'a_strokeColor',
            amount: 4,
            type: this.#gl.UNSIGNED_BYTE,
            norm: true,
            stride: point_stride,
            offset: 20,
            divisor: 1
        });
        this.u_res_point = this.#gl.getUniformLocation(this.p_point, "u_resolution");
        //
        this.#vao.bindVertexArrayOES(null);
        // - Finish Point
        //
        // - init Line
        console.log('[WebGL][Create]: Designer Line')
        //
        // init vao
        this.vao_line = this.#vao.createVertexArrayOES();
        this.#vao.bindVertexArrayOES(this.vao_line);
        //
        // init vertex buffer
        this.vbuffer_line = this.#gl.createBuffer();
        this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.vbuffer_line);
        this.#gl.bufferData(this.#gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), this.#gl.STATIC_DRAW);
        createAttribute(this.#gl, this.#ext, this.p_line, {
            name: 'a_corner',
            amount: 2,
            type: this.#gl.FLOAT,
            divisor: 0
        });
        //
        // init instance buffer
        const line_stride = 24;
        this.ibuffer_line = this.#gl.createBuffer();
        this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.ibuffer_line);
        this.#gl.bufferData(this.#gl.ARRAY_BUFFER, 10000 * line_stride, this.#gl.DYNAMIC_DRAW); // Alocamos espaço para, por exemplo, 10.000 instâncias (stride 24 bytes)
        //
        // init instance attribute
        createAttribute(this.#gl, this.#ext, this.p_line, {
            name: 'a_posA',
            amount: 2,
            type: this.#gl.FLOAT,
            stride: line_stride,
            offset: 0,
            divisor: 1
        });
        createAttribute(this.#gl, this.#ext, this.p_line, {
            name: 'a_posB',
            amount: 2,
            type: this.#gl.FLOAT,
            stride: line_stride,
            offset: 8,
            divisor: 1
        });
        createAttribute(this.#gl, this.#ext, this.p_line, {
            name: 'a_color',
            amount: 4,
            type: this.#gl.UNSIGNED_BYTE,
            norm: true,
            stride: line_stride,
            offset: 16,
            divisor: 1
        });
        createAttribute(this.#gl, this.#ext, this.p_line, {
            name: 'a_thickness',
            amount: 1,
            type: this.#gl.FLOAT,
            stride: line_stride,
            offset: 20,
            divisor: 1
        });
        this.u_res_line = this.#gl.getUniformLocation(this.p_line, "u_resolution");
        //
        this.#vao.bindVertexArrayOES(null);
        // - Finish Line
        console.log('[WebGL]: resources loaded');
        //
        /// Init buffer objetcs
        const p_buff_length = new ArrayBuffer(1000 * point_stride);
        this.p_f32 = new Float32Array(p_buff_length);
        this.p_u32 = new Uint32Array(p_buff_length);
        //
        const l_buff_length = new ArrayBuffer(1000 * line_stride);
        this.l_f32 = new Float32Array(l_buff_length);
        this.l_u32 = new Uint32Array(l_buff_length);
        //
        // set initial data
        this.#gl.enable(this.#gl.BLEND);
        this.#gl.blendFunc(this.#gl.SRC_ALPHA, this.#gl.ONE_MINUS_SRC_ALPHA, this.#gl.ONE, this.#gl.ONE_MINUS_SRC_ALPHA);
        this.#gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    //
    // resizer
    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.#gl.viewport(0, 0, this.width, this.height);

        if (this.p_point) {
            this.#gl.useProgram(this.p_point);
            this.#gl.uniform2f(this.u_res_point, this.width, this.height);
        }
        if (this.p_line) {
            this.#gl.useProgram(this.p_line);
            this.#gl.uniform2f(this.u_res_line, this.width, this.height);
        }
    }
    //
    // set background color
    set background(hex) {
        this.#gl.clearColor(
            ((hex >> 24) & 0xFF) / 255, // R
            ((hex >> 16) & 0xFF) / 255, // G
            ((hex >> 8) & 0xFF) / 255, // B
            (hex & 0xFF) / 255  // A
        );
    }
    //
    // countdown timer
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
    //
    // Desingners
    drawPoints(count) {
        if (count <= 0) return;

        // Get Program | Vao | resolution
        this.#gl.useProgram(this.p_point);
        this.#vao.bindVertexArrayOES(this.vao_point);

        // 
        this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.ibuffer_point);
        this.#gl.bufferSubData(this.#gl.ARRAY_BUFFER, 0, this.p_f32.subarray(0, count * 6));

        // 
        this.#ext.drawArraysInstancedANGLE(this.#gl.TRIANGLE_STRIP, 0, 4, count / 6);
        this.#vao.bindVertexArrayOES(null); // Clear link
    }
    //
    drawLines(count) {
        if (count <= 0) return;

        // Get Program | Vao | resolution
        this.#gl.useProgram(this.p_line);
        this.#vao.bindVertexArrayOES(this.vao_line);

        //
        this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.ibuffer_line);
        this.#gl.bufferSubData(this.#gl.ARRAY_BUFFER, 0, this.l_f32.subarray(0, count * 6));

        //
        this.#ext.drawArraysInstancedANGLE(this.#gl.TRIANGLE_STRIP, 0, 4, count/6);
        this.#vao.bindVertexArrayOES(null); // Clear link
    }
    //
    // execution function
    run(time) {
        // Clear Canvas
        this.#gl.clear(this.#gl.COLOR_BUFFER_BIT);

        // Update time
        this.deltaTime = this.lastTime ? (time - this.lastTime) / 1000 : 0.016;
        this.countdown('fps', .1, () => { this.fps = this.deltaTime > 0 ? 1 / this.deltaTime : 0 });
        this.lastTime = time;

        // Logic and Render
        if (canvas.p_f32 || canvas.p_u32 || canvas.l_f32 || canvas.l_u32) this.main();

        requestAnimationFrame(this.run); // next frame
    }
}
customElements.define('canvas-js', CanvasJS, { extends: 'canvas' }); // Extend HTMLCanvasElement
//
// Simulation Logic
//
// set canvas
const canvas = document.getElementById('canvas');
canvas.background = 0x000000ff;
//
// set particles
let particles = new ParticleSystem(100);
//particles.update(canvas); // Warm-up (Aquece o motor V8)
//
// set main
canvas.main = () => {
    //
    // Update
    canvas.countdown('push', .2, () => {
        if (particles.count < particles.length) {
            const r = 6;
            const stk = (particles.length >= 2 && random({ min: 0, max: 1 }));
            const spd = 10;
            particles.push({
                x: canvas.width / 2,
                y: canvas.height / 2,
                speed: {
                    x: random({ min: 0, max: 1 }) ? random({ min: -spd, max: -spd / 2, type: 'f' }) : random({ min: spd / 2, max: spd, type: 'f' }),
                    y: random({ min: 0, max: 1 }) ? random({ min: -spd, max: -spd / 2, type: 'f' }) : random({ min: spd / 2, max: spd, type: 'f' }),
                },
                radius: r,
                fill: Number(`0xff${random({ type: 'h', digits: 6 })}`),
                stroke: (stk ? { length: r / 1.5 } : 0),
                node: (stk ? random({ min: 0, max: particles.length }) : null)
            });
        }
    });
    const [length, l_count, isOverflow] = particles.update(canvas);

    //
    // Render
    canvas.drawPoints(length);
    canvas.drawLines(l_count);
}
//
canvas.run();