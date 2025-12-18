// Testing Class Otimization
const inicial = process.memoryUsage().heapUsed;

class Particle {
    constructor({ pos, speed, mass, friction, restitution, radius, fill, stroke, config }) {
        // Motion properties
        this.motion = [pos?.x, pos?.y, speed?.x, speed?.y] ?? [0, 0, 0, 0];

        // Physical properties
        this.physical = [mass, friction, restitution] ?? [1, .001, .9];

        // Visual properties
        this.radius = radius ?? 10;
        this.style = [fill, stroke?.color, stroke?.length] || [0xffffffff, 0x000000ff, 1];

        // Configuration
        this.status = [config?.isStatic, config?.isSensor] ?? [false, false];
    }

    apllyForce(fx, fy, dt) {
        // Update speed based on applied force
        if (!this.status[0]) {
            this.motion[2] += fx * dt;
            this.motion[3] += fy * dt;
        }
    }

    update(dt) {
        // Update position based on speed
        if (!this.status[0]) {
            this.motion[0] += this.motion[2] * dt;
            this.motion[1] += this.motion[3] * dt;
        }
    }
}

// Simulando 1 frame
let particles = Array.from({ length: 10000 }, () => new Particle({})); // gerando n conteudo
const dt = .0016;

console.time('[time]');

particles.push(new Particle({}));
particles.filter((_) => {
    _.apllyForce(0, 0, dt)
    _.update(dt);

    return (_.motion[0] > 0 - _.radius && _.motion[1] > 0 - _.radius);
});

console.timeEnd('[time]'); // ~.6-.7 ms
console.log(`[memory]: ${((process.memoryUsage().heapUsed - inicial) / 10000).toFixed(1)} bytes`);

// ~30 ms | ~450 bytes | -Complexo