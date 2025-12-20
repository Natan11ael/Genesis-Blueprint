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
        this._f32 = new Uint32Array(this.length * 6);
        this._u32 = new Uint32Array(this.length * 6);
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
        this._f32 = new Float32Array(this.length * 6);
        this._u32 = new Uint32Array(this.length * 6);
    }

    // Adiciona um Novo Objeto
    push({ x, y, speed, mass, friction, restitution, radius, fill, stroke, config }) {
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
    update(dt) {
        let destOffset = 0;

        const len = this.count * this.stride; // count para apenas particuas concideradas existentes
        for (let offset = 0; offset < len; offset += this.stride) {
            // 1. Atualiza Posição dos Objetos
            const isStatic = 1 - (this.u32[offset + 11] & 1);
            this.f32[offset + 0] += (this.f32[offset + 6] * dt) * isStatic;
            this.f32[offset + 1] += (this.f32[offset + 7] * dt) * isStatic;

            // 2.
            // Copia s 6 slots de uma vez (X, Y, Rad, Stk, Fill, StkCol)
            // subarray + set é otimizado via memcpy no C++ do motor V8
            this._f32.set(this.f32.subarray(offset, offset + 6), destOffset);
            this._u32.set(this.u32.subarray(offset, offset + 6), destOffset);
            destOffset += 6; // offset destion
        };

        return [this._f32.subarray(0, destOffset), this._u32.subarray(0, destOffset)];
    }
}

/// Simulando 1 frame
const particles = new ParticleSystem(10000); // geran 0 particulas && Grenciador de Particulas
const dt = .0016;

// Warm-up (Aquece o motor V8)
particles.update(() => null);

// Medição com alta precisão
const start = performance.now();

particles.push({ x: 1 });
const data = particles.update(dt);

const end = performance.now(); // ~.6 ms/-

console.log(`[time]: ${(end - start).toFixed(2)} ms`);
console.log(`[memory]: ${((process.memoryUsage().heapUsed - inicial) / 10000).toFixed(1)} bytes`);
console.log(`[count]: ${particles.count}/${particles.length}`);

// <10k | -15.ms |
//  10k | ~15.ms | ~1.0 bytes | +/-Complexo