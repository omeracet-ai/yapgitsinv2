"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MONEY_SCALE = void 0;
exports.tlToMinor = tlToMinor;
exports.minorToTl = minorToTl;
exports.formatMinor = formatMinor;
exports.addMinor = addMinor;
exports.subMinor = subMinor;
exports.pctOfMinor = pctOfMinor;
exports.MONEY_SCALE = 100;
function tlToMinor(tl) {
    if (tl === null || tl === undefined)
        return null;
    return Math.round(tl * exports.MONEY_SCALE);
}
function minorToTl(minor) {
    if (minor === null || minor === undefined)
        return null;
    return minor / exports.MONEY_SCALE;
}
function formatMinor(minor, locale = 'tr-TR') {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 2,
    }).format(minor / exports.MONEY_SCALE);
}
function addMinor(...vals) {
    return vals.reduce((s, v) => s + v, 0);
}
function subMinor(a, b) {
    return a - b;
}
function pctOfMinor(minor, pct) {
    return Math.round((minor * pct) / 100);
}
//# sourceMappingURL=money.util.js.map