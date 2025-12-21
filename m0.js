/// Testing Class Otimization
const inicial = process.memoryUsage().heapUsed;

/// Gerenciador de Particulas
//
class ParticleSystem {
    constructor(length) {
        this.count = 0;            // numero de objetos exisetntes
        this.stride = 16;          // numero de dados
        this.length = length ?? 1; // numero de objetos maximos
        this.buffer = new ArrayBuffer(this.length * this.stride * 4); // buffer em bytes brutos (dados: 12, slot: 4 bytes)
        this.f32 = new Float32Array(this.buffer); // datas floats
        this.u32 = new Uint32Array(this.buffer);  // datas uints
    }

    // Para "Remover" sem causar Garbage Collector
    release(offset) {
        if (this.count <= 0) return;

        // 1. Localiza a última partícula viva no buffer
        const lastOffset = (this.count - 1) * this.stride;

        // 2. Se a partícula a ser removida não for a última, movemos a última para cá
        // Copia os 16 slots da última partícula para a posição 'offset'
        if (offset !== lastOffset) this.u32.set(this.u32.subarray(lastOffset, lastOffset + this.stride), offset);

        // 3. Decrementamos o contador. A última agora é considerada "morta" ou espaço livre
        this.count--;
    }


    // Redimenciona Buffers
    resize() {
        // 1. Calcula o novo tamanho (dobra ou cresce 50%)
        const newLength = Math.floor(this.length * (this.length > 1024 ? 1.5 : 2));

        // 2. Cria um novo Buffer com o novo tamanho total (partículas * slots * 4 bytes)
        const newBuffer = new ArrayBuffer(newLength * this.stride * 4);

        // 3. Copia os dados do buffer antigo para o novo
        // Usamos Uint32Array para a cópia pois é eficiente para mover bits brutos
        new Uint32Array(newBuffer).set(new Uint32Array(this.buffer));

        // 4. Atualiza a referência principal
        this.buffer = newBuffer;
        this.length = newLength;

        // 5. RECRIA as visões (Views) apontando para o novo buffer
        // Isso é vital, senão o f32 continuaria apontando para o buffer antigo (menor)
        this.f32 = new Float32Array(this.buffer);
        this.u32 = new Uint32Array(this.buffer);
    }

    // Adiciona um Novo Objeto
    push(x, y, speed, mass, friction, restitution, radius, fill, stroke, config) {
        // Se estiver cheio, redimensiona
        if (this.count >= this.length) this.resize();

        // Com Swap and Pop, o próximo espaço livre é sempre o final da lista viva
        const offset = this.count * this.stride;
        this.count++;

        // Set datas floats and uints
        // ordenando em renderização
        this.f32[offset + 0] = x || 0;
        this.f32[offset + 1] = y || 0;
        this.f32[offset + 2] = radius ?? 5;
        this.f32[offset + 3] = stroke?.length || 1;
        this.u32[offset + 4] = fill || 0xffffffff;
        this.u32[offset + 5] = stroke?.color || 0x000000ff;

        this.f32[offset + 6] = speed?.x || 0;
        this.f32[offset + 7] = speed?.y || 0;
        this.f32[offset + 8] = mass ?? 1;
        this.f32[offset + 9] = friction ?? .001;
        this.f32[offset + 10] = restitution ?? .9;
        this.u32[offset + 11] = config || 0x00;
    }

    // Aplica Força a um objeto com base força * tempo
    apllyForce(offset, fx, fy, dt) {
        const isStatic = 1 - (this.u32[offset + 11] & 1); // verfica se e movel

        // Atualiza velocidade
        this.f32[offset + 6] += (fx * dt) * isStatic;
        this.f32[offset + 7] += (fy * dt) * isStatic;
    }

    // Executa Apenas as particulas existentes
    update(canvas) {
        if (!canvas) return; // verifica se canvas existe

        // Update Buffer canvas
        const isOverflow = this.length * 6 > canvas._f32.length;
        if (isOverflow) {
            canvas._f32 = new Float32Array(Math.ceil(this.length * 12));
            canvas._u32 = new Uint32Array(canvas._f32.buffer);
        }

        const { deltaTime, width, height, _f32, _u32 } = canvas;
        const stride = this.stride;
        const count = this.count; 
        const f32 = this.f32; 
        const u32 = this.u32;

        let destOffset = 0;
        const size = count * stride;
        for (let offset = 0; offset < size; offset += stride) {
            // Máscara bitwise para evitar IFs (isStatic)
            const isStatic = 1 - (u32[offset + 11] & 1);

            // Atualização direta
            f32[offset + 0] += f32[offset + 6] * deltaTime * isStatic;
            f32[offset + 1] += f32[offset + 7] * deltaTime * isStatic;

            // Frustum Culling Simplificado
            if (f32[offset + 0] > -f32[offset + 2] && f32[offset + 0] < width + f32[offset + 2] && f32[offset + 1] > -f32[offset + 2] && f32[offset + 1] < height + f32[offset + 2]) {
                // Cópia manual é mais rápida que subarray().set() para blocos pequenos (6 slots)
                _f32[destOffset + 0] = f32[offset + 0]; // x
                _f32[destOffset + 1] = f32[offset + 1]; // y
                _f32[destOffset + 2] = f32[offset + 2]; // radius
                _f32[destOffset + 3] = f32[offset + 3]; // stroke width
                _u32[destOffset + 4] = u32[offset + 4]; // fill (bitcast via float view)
                _u32[destOffset + 5] = u32[offset + 5]; // stroke color
                destOffset += 6
            }
        }

        return [destOffset, isOverflow];
    }
}

/// Simulando 1 frame
const size = 100000; // 100.000
const particles = new ParticleSystem(size); // geran 0 particulas && Grenciador de Particulas
const canvas = { deltaTime: .0016, width: 100, height: 100, _f32: new Float32Array(size * 6), _u32: new Float32Array(size * 6) };

// Warm-up (Aquece o motor V8)
particles.update(canvas);

// Medição com alta precisão
const start = performance.now();

particles.push(1);
particles.update(canvas); // ~.01 ms

const end = performance.now(); // ~.2 ms/-

console.log(`[time]: ${(end - start).toFixed(2)} ms`);
console.log(`[memory]: ${((process.memoryUsage().heapUsed - inicial) / 10000).toFixed(1)} bytes`);
console.log(`[count]: ${particles.count}/${particles.length}`);

// <100k | -2.ms |
//  100k | ~2.ms | ~1.0 bytes | +/-Complexo