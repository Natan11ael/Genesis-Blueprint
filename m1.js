/// Testing Class Otimization
const inicial = process.memoryUsage().heapUsed;

/// Gerenciador de Particulas
//
class ParticleSystem {
    constructor(length) {
        this.count = 0;
        this.length = length ?? 1;
        this.freeIndices = [];
        this.buffer = {
            x: new Float32Array(this.length),
            y: new Float32Array(this.length),
            vx: new Float32Array(this.length),
            vy: new Float32Array(this.length),
            mass: new Float32Array(this.length),
            friction: new Float32Array(this.length),
            restitution: new Float32Array(this.length),
            radius: new Float32Array(this.length),
            fill: new Uint32Array(this.length),
            stroke: new Uint32Array(this.length),
            sLength: new Float32Array(this.length),
            config: new Uint8Array(this.length),
        }
    }

    // Para "Remover" sem causar Garbage Collector
    release(id) {
        this.buffer.config[id] = 0; // Reseta configs
        this.freeIndices.push(id);  // Guarda o índice para reuso
    }

    // Redimenciona Buffers
    resize() {
        this.length = Math.floor(this.length * (this.length > 1024 ? 1.5 : 2));

        for (const key in this.buffer) {
            const oldArray = this.buffer[key];
            const newArray = new oldArray.constructor(this.length); // Cria novo do mesmo tipo
            newArray.set(oldArray); // COPIA os dados antigos para o novo buffer
            this.buffer[key] = newArray;
        }
    }

    // Adiciona um Novo Objeto
    push({ pos, speed, mass, friction, restitution, radius, fill, stroke, config }) {
        let offset = 0;
        if (this.freeIndices.length > 0) offset = this.freeIndices.pop(); // Reutiliza espaço vazio
        else {
            if (this.count >= this.length) this.resize(); // Redimenciona caso tenha mais objetos que o suportado
            offset = this.count++; // Nova quantidade de objetos
        }

        // Set Data
        this.buffer.x[offset] = pos?.x || 0;
        this.buffer.y[offset] = pos?.y || 0;
        this.buffer.vx[offset] = speed?.x || 0;
        this.buffer.vy[offset] = speed?.y || 0;
        this.buffer.mass[offset] = mass ?? 1;
        this.buffer.friction[offset] = friction ?? .001;
        this.buffer.restitution[offset] = restitution ?? .9;
        this.buffer.radius[offset] = radius ?? 5;
        this.buffer.fill[offset] = fill || 0xffffffff;
        this.buffer.stroke[offset] = stroke?.color || 0x000000ff;
        this.buffer.sLength[offset] = stroke?.length || 1;
        this.buffer.config[offset] = config || 0x00;
    }

    // STATIC (Bit 0 / Valor 1)
    setIsStatic(id, v) {
        if (v) this.buffer.config[id] |= 1;  // Liga o bit 0
        else this.buffer.config[id] &= ~1;  // Desliga o bit 0
    }

    // SENSOR (Bit 1 / Valor 2)
    setIsSensor(id, v) {
        if (v) this.buffer.config[id] |= 2;  // Liga o bit 1
        else this.buffer.config[id] &= ~2;  // Desliga o bit 1
    }

    // Aplica Força a um objeto com base força * tempo
    apllyForce(id, fx, fy, dt) {
        const isStatic = (this.buffer.config[id] & 1) !== 0;
        this.buffer.vx[id] += (fx * dt) * isStatic;
        this.buffer.vy[id] += (fy * dt) * isStatic;
    }

    // Executa Apenas as particulas existentes
    forEach(dt, action = (id) => null) {
        const { x, y, vx, vy, config } = this.buffer;
        for (let i = 0; i < this.count; i++) { // count para apenas particuas concideradas existentes
            action(i) // atualizações personalizadas
            
            // Atualiza Posição dos Objetos
            const isStatic = (config[i] & 1) !== 0;
            x[i] += (vx[i] * dt) * isStatic;
            y[i] += (vy[i] * dt) * isStatic;
        };
    }
}

/// Simulando 1 frame
const particles = new ParticleSystem(10000); // geran 0 particulas && Grenciador de Particulas
const dt = .0016;

// Warm-up (Aquece o motor V8)
particles.forEach(id => particles.update(id, dt));

// Medição com alta precisão
const start = performance.now();

particles.push({ pos: { x: 1 } });
particles.forEach(dt, id => {
    particles.apllyForce(id, 0, 9.8, dt);
});

const end = performance.now(); // ~1.ms/-

console.log(`[time]: ${(end - start).toFixed(2)} ms`);
console.log(`[memory]: ${((process.memoryUsage().heapUsed - inicial) / 10000).toFixed(1)} bytes`);
console.log(`[count]: ${particles.count}/${particles.length}`);

// <10k | -20.ms |
//  10k | ~20.ms | ~1.5 bytes | -Complexo