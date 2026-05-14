"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bayesianAverage = bayesianAverage;
exports.wilsonScore = wilsonScore;
function bayesianAverage(sumRatings, count, C = 10, m = 4.0) {
    const denom = C + count;
    if (denom <= 0)
        return m;
    return (C * m + sumRatings) / denom;
}
function wilsonScore(positive, total, z = 1.96) {
    if (total <= 0)
        return 0;
    const p = positive / total;
    const z2 = z * z;
    const num = p + z2 / (2 * total) - z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total);
    const den = 1 + z2 / total;
    return num / den;
}
//# sourceMappingURL=rating.util.js.map