/// main.js
//
/// Incializations
//
const canvas = document.getElementById('canvas');
canvas.background = 0x5293e2e2;
//
// UI Param
const st = document.getElementById('status');
//
// Particle System
let particles = new ParticleSystem(50000);
//
/// Update Function
//
canvas.main = function () {
    /// Updates
    //
    if (particles.count < particles.length) Array.from({ length: 100 }).forEach(() => {
        particles.push({
            x: canvas.width / 2, 
            y: canvas.height / 2,
            speed: { x: random({ min: -20, max: 20, type: 'f' }), y: random({ min: -20, max: 20, type: 'f' }) },
            radius: random({ min: 3, max: 5 }),
            fill: random({ type: 'h' }),
            stroke: {
                length: 1,
                color: random({ type: 'h' }),
            }
        })
    });

    const isOverflow = canvas.updateBuffer(particles.length)
    const [f32, u32] = particles.update(canvas);
    canvas.bufferData.set(f32);
    canvas.uint32Data.set(u32);

    st.textContent = `FPS: ${canvas.fps.toFixed(2)} Particles: ${f32.length/6}/${particles.count}`;

    /// Renderings
    //
    canvas.dispatchDraw(f32.length/6, isOverflow);
};
//
/// Start the loop
//
canvas.run();