/// CanvasJS.js
//
/// Load Shader
function loadShader(url) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);

    if (xhr.status === 200) {
        return xhr.responseText;
    } else {
        throw new Error(`Falha ao carregar shader: ${url}`);
    }
}
//
/// Program Creation
function program(gl, vSrc, fSrc) {
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
/// Hex to RGBA
//
/// Class Definition
class CanvasJS extends HTMLCanvasElement {
    constructor() {
        super();

        /// Initialize properties extended
        //
        /// WebGL Context
        this.ctx = this.getContext('webgl');
        if (!this.ctx) {
            alert("WebGL not supported");
            throw new Error("WebGL not supported")
        }
        // Set default clear color and blend mode
        this.ctx.clearColor(0.0, 0.0, 0.0, 1.0);
        this.ctx.enable(this.ctx.BLEND);
        this.ctx.blendFunc(this.ctx.SRC_ALPHA, this.ctx.ONE_MINUS_SRC_ALPHA, this.ctx.ONE, this.ctx.ONE_MINUS_SRC_ALPHA);

        const vShaderSrc = loadShader('./src/vShaderSrc.glsl');
        const fShaderSrc = loadShader('./src/fShaderSrc.glsl');

        // Create and use program
        const prog = program(this.ctx, vShaderSrc, fShaderSrc);
        this.ctx.useProgram(prog);

        // 
        this.ext = this.ctx.getExtension('ANGLE_instanced_arrays');
        if (!this.ext) throw new Error("Instancing not supported");

        // Create buffer
        const buffer = this.ctx.createBuffer();
        this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, buffer);
        const vertices = new Float32Array([
            -1, -1, 1, -1, -1, 1,
            -1, 1, 1, -1, 1, 1
        ]);
        this.ctx.bufferData(this.ctx.ARRAY_BUFFER, vertices, this.ctx.STATIC_DRAW);

        // Link attributes
        const aPos = this.ctx.getAttribLocation(prog, "a_position");
        this.ctx.enableVertexAttribArray(aPos);
        this.ctx.vertexAttribPointer(aPos, 2, this.ctx.FLOAT, false, 0, 0);

        this.instanceBuffer = this.ctx.createBuffer();
        this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.instanceBuffer);

        //
        const stride = 24;

        // Atributo: a_pos (vec2)
        const a_posLoc = this.ctx.getAttribLocation(prog, "a_pos");
        this.ctx.enableVertexAttribArray(a_posLoc);
        this.ctx.vertexAttribPointer(a_posLoc, 2, this.ctx.FLOAT, false, stride, 0);
        this.ext.vertexAttribDivisorANGLE(a_posLoc, 1); // Muda 1 vez por instância

        // Atributo: a_radius (float)
        const a_radLoc = this.ctx.getAttribLocation(prog, "a_radius");
        this.ctx.enableVertexAttribArray(a_radLoc);
        this.ctx.vertexAttribPointer(a_radLoc, 1, this.ctx.FLOAT, false, stride, 8); // offset 8
        this.ext.vertexAttribDivisorANGLE(a_radLoc, 1);

        // Atributo: a_strokeWidth (float)
        const a_stkLoc = this.ctx.getAttribLocation(prog, "a_strokeWidth");
        this.ctx.enableVertexAttribArray(a_stkLoc);
        this.ctx.vertexAttribPointer(a_stkLoc, 1, this.ctx.FLOAT, false, stride, 12); // offset 12
        this.ext.vertexAttribDivisorANGLE(a_stkLoc, 1);

        // Atributo: a_fillColor (vec4)
        const a_fillLoc = this.ctx.getAttribLocation(prog, "a_fillColor");
        this.ctx.enableVertexAttribArray(a_fillLoc);
        this.ctx.vertexAttribPointer(a_fillLoc, 4, this.ctx.UNSIGNED_BYTE, true, stride, 16); // offset 16
        this.ext.vertexAttribDivisorANGLE(a_fillLoc, 1);

        const a_strkCLoc = this.ctx.getAttribLocation(prog, "a_strokeColor");
        this.ctx.enableVertexAttribArray(a_strkCLoc);
        this.ctx.vertexAttribPointer(a_strkCLoc, 4, this.ctx.UNSIGNED_BYTE, true, stride, 20); // Offset 32
        this.ext.vertexAttribDivisorANGLE(a_strkCLoc, 1);

        // Get uniform locations
        this.locs = {
            res: this.ctx.getUniformLocation(prog, "u_resolution"),
        };

        // Make Buffers
        this.bufferData = new Float32Array(50000 * 6);
        this.uint32Data = new Uint32Array(this.bufferData.buffer);
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
        this.ctx.clearColor(...[
            ((color >> 24) & 0xFF) / 255, // R
            ((color >> 16) & 0xFF) / 255, // G
            ((color >> 8) & 0xFF) / 255, // B
            (color & 0xFF) / 255  // A
        ]);
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

    // 1. Update Buffers
    updateBuffer(count) {
        const requiredLength = count * 6;
        const isOverflow = requiredLength > this.bufferData.length;

        if (isOverflow) {
            const newSize = Math.ceil(requiredLength * 1.5);
            this.bufferData = new Float32Array(newSize);
            this.uint32Data = new Uint32Array(this.bufferData.buffer);
        }
        return isOverflow;
    }

    // 2. Rrender (GPU)
    dispatchDraw(count, isOverflow) {
        //
        this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.instanceBuffer);
        if (isOverflow || !this.init) {
            this.ctx.bufferData(this.ctx.ARRAY_BUFFER, this.bufferData, this.ctx.DYNAMIC_DRAW);
            this.init = true;
        }
        else this.ctx.bufferSubData(this.ctx.ARRAY_BUFFER, 0, this.bufferData.subarray(0, count * 6));

        //
        this.ctx.uniform2f(this.locs.res, this.width, this.height);
        this.ext.drawArraysInstancedANGLE(this.ctx.TRIANGLES, 0, 6, count);
    }

    // Resize Canvas
    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.ctx.viewport(0, 0, this.width, this.height);
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