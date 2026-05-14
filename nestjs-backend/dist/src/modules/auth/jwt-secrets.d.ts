import * as jwt from 'jsonwebtoken';
export declare function getJwtSigningSecret(): string;
export declare function getJwtVerifySecrets(): string[];
export declare function jwtSecretOrKeyProvider(_request: unknown, rawJwtToken: string, done: (err: Error | null, secret?: string) => void): void;
export declare function verifyJwtWithRotation<T = jwt.JwtPayload>(token: string): T;
