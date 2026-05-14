"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddTokenVersion1747267200000 = void 0;
class AddTokenVersion1747267200000 {
    name = 'AddTokenVersion1747267200000';
    async up(qr) {
        try {
            await qr.query(`ALTER TABLE users ADD COLUMN tokenVersion integer NOT NULL DEFAULT 0`);
        }
        catch (err) {
            const msg = err.message || '';
            if (!/duplicate column name/i.test(msg))
                throw err;
        }
    }
    async down(qr) {
        try {
            await qr.query(`ALTER TABLE users DROP COLUMN tokenVersion`);
        }
        catch {
        }
    }
}
exports.AddTokenVersion1747267200000 = AddTokenVersion1747267200000;
//# sourceMappingURL=1747267200000-AddTokenVersion.js.map