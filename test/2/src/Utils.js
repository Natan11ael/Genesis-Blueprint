/// Utils.js
//
const random = ({ min, max, type = 'i', digits = 1 }) => {
    if (type === 'i') return Math.floor(Math.random() * (max - min + 1)) + min;
    if (type === 'f') return Math.random() * (max - min) + min;
    if (type === 'h') {
        const maxVal = Math.pow(16, digits) - 1;
        const num = (Math.random() * (maxVal + 1)) >>> 0;
        return num.toString(16).padStart(digits, '0');
    }

    throw new Error("Tipo de randomização inválido. Use um tipo existente. ['i', 'f', 'h']");

};