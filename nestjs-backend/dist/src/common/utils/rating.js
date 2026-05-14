"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bayesianAvg = bayesianAvg;
exports.wilsonScore = wilsonScore;
function bayesianAvg(ratings, m = 4.0, C = 10) {
    const sum = ratings.reduce((a, b) => a + b, 0);
    return (C * m + sum) / (C + ratings.length);
}
function wilsonScore(positive, total) {
    if (total === 0)
        return 0;
    const z = 1.96;
    const phat = positive / total;
    return ((phat + (z * z) / (2 * total) - z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * total)) / total)) /
        (1 + (z * z) / total));
}
//# sourceMappingURL=rating.js.map