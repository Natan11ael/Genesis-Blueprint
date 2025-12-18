/// Particle.js
//
class Particle {
    constructor({ pos, speed, mass, friction, restitution, radius, fill, stroke, config }) {
        // Motion properties
        this.motion = [pos?.x, pos?.y, speed?.x, speed?.y] ?? [0, 0, 0, 0];

        // Physical properties
        this.physical = [mass, friction, restitution, radius] ?? [1, .001, .9, 10];

        // Visual properties
        this.style = [fill, stroke?.color, stroke?.length] || [0xffffffff, 0x000000ff, 1];

        // Configuration
        this.status = [config?.isStatic, config?.isSensor] ?? [false, false];
    }

    apllyForce(fx, fy, dt) {
        // Update speed based on applied force
        if (this.status[0]) return;
        this.motion[2] += fx * dt;
        this.motion[3] += fy * dt;
    }

    update(dt) {
        // Update position based on speed
        if (this.status[0]) return;
        this.motion[0] += this.motion[2] * dt;
        this.motion[1] += this.motion[3] * dt;
    }
}