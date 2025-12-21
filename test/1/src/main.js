/// main.js
//
/// Incializations
// Canvas
const canvas = document.getElementById('canvas');
canvas.background = 0x5293e2e2;
//
// UI Param
const st = document.getElementById('status');
//
// Particle System
let particles = new ParticleSystem(50000);
particles.update(canvas); // Warm-up (Aquece o motor V8)
//
/// Update Function
//
canvas.main = function () {
    /// Updates
    //
    if (particles.count < particles.length) Array.from({ length: 1000 }).forEach(() => {
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

    const [length, isOverflow] = particles.update(canvas);

    st.textContent = `FPS: ${canvas.fps.toFixed(2)} Particles: ${length/6}/${particles.count}`;

    /// Renderings
    //
    canvas.dispatchDraw(length/6, isOverflow);
};
//
/// Start the loop
//
canvas.run();