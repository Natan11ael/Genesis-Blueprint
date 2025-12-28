/// Utils.js
//
const random = ({ min, max, type = 'i' }) => {
    if (type === 'i') return Math.floor(Math.random() * (max - min + 1)) + min;
    else if (type === 'f') return Math.random() * (max - min) + min;
    else if (type === 'h') return (Math.random() * 0xFFFFFFFF) >>> 0;
    else {
        // Lança um erro que para a execução e avisa o desenvolvedor
        throw new Error("Tipo de randomização inválido. Use um tipo existente. ['i', 'f', 'h']");
    }
};