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
let particles = [];
let particlesView = [];
//
/// Update Function
//
canvas.main = function () {
    /// Updates
    //
    if (particles.length < 60000) Array.from({ length: 100 }).forEach(() => {
        particles.push(new Particle({
            pos: { x: canvas.width / 2, y: canvas.height / 2 },
            speed: { x: random({ min: -20, max: 20, type: 'f' }), y: random({ min: -20, max: 20, type: 'f' }) },
            radius: random({ min: 3, max: 6 }),
            fill: random({ type: 'h' }),
            stroke: {
                length: 1,
                color: random({ type: 'h' }),
            }
        }))
    });
    const len = particles.length;
    let lenView = 0;

    let isOverflow = canvas.updateBuffer(len)
    particles.update((_) => {
        _.update(this.deltaTime);

        if (_.motion[0] > 0 - _.physical[3] && _.motion[0] < canvas.width + _.physical[3] &&
            _.motion[1] > 0 - _.physical[3] && _.motion[1] < canvas.height + _.physical[3]) {
            canvas.updateVertexData(lenView, _);
            lenView++;
        }
    });

    st.textContent = `FPS: ${canvas.fps.toFixed(2)} Particles: ${lenView}/${len}`;

    /// Renderings
    //
    canvas.dispatchDraw(lenView, isOverflow);
};
//
/// Start the loop
//
canvas.run();