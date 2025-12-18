// Testing Class Otimization
const inicial = process.memoryUsage().heapUsed;

const MAX_ENTITIES = 10000;
const buffer = {
    // Posição e Movimento (Precisão simples é suficiente)
    x: new Float32Array(MAX_ENTITIES),
    y: new Float32Array(MAX_ENTITIES),
    vx: new Float32Array(MAX_ENTITIES),
    vy: new Float32Array(MAX_ENTITIES),

    // Propriedades Físicas
    mass: new Float32Array(MAX_ENTITIES),
    friction: new Float32Array(MAX_ENTITIES),
    restitution: new Float32Array(MAX_ENTITIES),
    radius: new Float32Array(MAX_ENTITIES),

    // Visual (Uint32 para cores em formato 0xRRGGBBAA)
    fill: new Uint32Array(MAX_ENTITIES),
    stroke: new Uint32Array(MAX_ENTITIES),
    strokeLength: new Float32Array(MAX_ENTITIES),

    // Estados (Flags) - Usando Uint8 para economizar memória - 0 = false, 1 = true
    status: new Uint8Array(MAX_ENTITIES),
    
    // Controle de Ciclo de Vida
    active: new Uint8Array(MAX_ENTITIES) 
};

class ParticleProxy {
    constructor(id) {
        this.id = id;
    }

    // VISIBLE (Bit 0 / Valor 1)
    get isVisible() { return (buffer.status[this.id] & 1) !== 0; }
    set isVisible(v) {
        if (v) buffer.status[this.id] |= 1;  // Liga o bit 0
        else buffer.status[this.id] &= ~1;  // Desliga o bit 0
    }

    // STATIC (Bit 1 / Valor 2)
    get isStatic() { return (buffer.status[this.id] & 2) !== 0; }
    set isStatic(v) {
        if (v) buffer.status[this.id] |= 2;  // Liga o bit 1
        else buffer.status[this.id] &= ~2;  // Desliga o bit 1
    }

    // SENSOR (Bit 2 / Valor 4)
    get isSensor() { return (buffer.status[this.id] & 4) !== 0; }
    set isSensor(v) {
        if (v) buffer.status[this.id] |= 4;  // Liga o bit 2
        else buffer.status[this.id] &= ~4;  // Desliga o bit 2
    }

    applyForce(fx, fy, dt) {
        if (this.isStatic) return;
        buffer.vx[this.id] += fx * dt;
        buffer.vy[this.id] += fy * dt;
    }

    update(dt) {
        if (this.isStatic) return;
        buffer.x[this.id] += buffer.vx[this.id] * dt;
        buffer.y[this.id] += buffer.vy[this.id] * dt;
    }
}

// Simulando 1 frame
let particles = Array.from({ length: 10000 }, (_, i) => new ParticleProxy(i));
const dt = .0016;

console.time('[time]');

// update and render
const len = particles.length;
particles.push(new ParticleProxy(len + 1));
particles.filter((_, i) => {
    _.applyForce(0, 0, dt)
    _.update(dt);

    _.isVisible;
});

console.timeEnd('[time]'); // ~.6-.7 ms
console.log(`[memory]: ${((process.memoryUsage().heapUsed - inicial) / 10000).toFixed(1)} bytes`);

// ~30 ms | ~150 bytes | +Complexo