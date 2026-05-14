"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.processImage = processImage;
const path_1 = require("path");
const fs = __importStar(require("fs"));
const sharp = require('sharp');
async function processImage(buf, baseDir, baseName, opts = {}) {
    const sizes = opts.sizes ?? [1024, 640, 320];
    const jpegQ = opts.jpegQuality ?? 80;
    const webpQ = opts.webpQuality ?? 80;
    const avifQ = opts.avifQuality ?? 60;
    const writeLegacy = opts.writeLegacy ?? true;
    if (!fs.existsSync(baseDir))
        fs.mkdirSync(baseDir, { recursive: true });
    const variants = [];
    for (const size of sizes) {
        let pipeline = sharp(buf);
        if (opts.cover) {
            pipeline = pipeline.resize(size, size, { fit: 'cover', position: 'center' });
        }
        else {
            pipeline = pipeline.resize({ width: size, withoutEnlargement: true });
        }
        const resized = await pipeline.toBuffer();
        const jpegName = `${baseName}-${size}.jpg`;
        const webpName = `${baseName}-${size}.webp`;
        const avifName = `${baseName}-${size}.avif`;
        await sharp(resized).jpeg({ quality: jpegQ, mozjpeg: true }).toFile((0, path_1.join)(baseDir, jpegName));
        await sharp(resized).webp({ quality: webpQ }).toFile((0, path_1.join)(baseDir, webpName));
        try {
            await sharp(resized).avif({ quality: avifQ, effort: 4 }).toFile((0, path_1.join)(baseDir, avifName));
        }
        catch {
        }
        variants.push({ size, jpeg: jpegName, webp: webpName, avif: avifName });
    }
    let legacyJpeg = null;
    if (writeLegacy) {
        const largest = sizes[0];
        const src = (0, path_1.join)(baseDir, `${baseName}-${largest}.jpg`);
        legacyJpeg = `${baseName}.jpg`;
        fs.copyFileSync(src, (0, path_1.join)(baseDir, legacyJpeg));
    }
    return { variants, legacyJpeg };
}
//# sourceMappingURL=image-pipeline.js.map