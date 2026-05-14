"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decimalTransformer = void 0;
exports.decimalTransformer = {
    to: (value) => value,
    from: (value) => {
        if (value === null || value === undefined)
            return value ?? null;
        const n = typeof value === 'number' ? value : parseFloat(value);
        return Number.isNaN(n) ? null : n;
    },
};
//# sourceMappingURL=decimal.transformer.js.map