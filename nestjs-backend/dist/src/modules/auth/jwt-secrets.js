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
exports.getJwtSigningSecret = getJwtSigningSecret;
exports.getJwtVerifySecrets = getJwtVerifySecrets;
exports.jwtSecretOrKeyProvider = jwtSecretOrKeyProvider;
exports.verifyJwtWithRotation = verifyJwtWithRotation;
const jwt = __importStar(require("jsonwebtoken"));
function getJwtSigningSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret)
        throw new Error('JWT_SECRET ortam değişkeni tanımlanmamış');
    return secret;
}
function getJwtVerifySecrets() {
    return [process.env.JWT_SECRET, process.env.JWT_SECRET_PREVIOUS].filter((s) => !!s);
}
function jwtSecretOrKeyProvider(_request, rawJwtToken, done) {
    const secrets = getJwtVerifySecrets();
    if (secrets.length === 0) {
        done(new Error('JWT_SECRET ortam değişkeni tanımlanmamış'));
        return;
    }
    for (const secret of secrets) {
        try {
            jwt.verify(rawJwtToken, secret);
            done(null, secret);
            return;
        }
        catch {
        }
    }
    done(null, secrets[0]);
}
function verifyJwtWithRotation(token) {
    const secrets = getJwtVerifySecrets();
    let lastErr = new Error('JWT_SECRET ortam değişkeni tanımlanmamış');
    for (const secret of secrets) {
        try {
            return jwt.verify(token, secret);
        }
        catch (err) {
            lastErr = err;
        }
    }
    throw lastErr;
}
//# sourceMappingURL=jwt-secrets.js.map