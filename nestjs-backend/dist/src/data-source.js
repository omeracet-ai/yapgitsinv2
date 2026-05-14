"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const dotenv_1 = require("dotenv");
const typeorm_1 = require("typeorm");
const path_1 = require("path");
const paths_1 = require("./common/paths");
(0, dotenv_1.config)({ path: (0, path_1.join)(paths_1.APP_ROOT, `.env.${process.env.NODE_ENV ?? 'development'}`) });
(0, dotenv_1.config)({ path: (0, path_1.join)(paths_1.APP_ROOT, '.env') });
const dbType = process.env.DB_TYPE || 'sqlite';
function resolveSqlitePath(name) {
    return name === ':memory:' || (0, path_1.isAbsolute)(name) ? name : (0, path_1.join)(paths_1.APP_ROOT, name);
}
const baseOptions = {
    entities: [`${__dirname}/**/*.entity{.ts,.js}`],
    migrations: [`${__dirname}/migrations/*{.ts,.js}`],
    synchronize: false,
};
let options;
if (dbType === 'sqlite') {
    options = {
        type: 'sqlite',
        database: resolveSqlitePath(process.env.DB_DATABASE || process.env.DB_NAME || 'hizmet_db.sqlite'),
        ...baseOptions,
    };
}
else if (dbType === 'mysql') {
    options = {
        type: 'mysql',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '3306', 10),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || process.env.DB_DATABASE,
        charset: 'utf8mb4_unicode_ci',
        ...baseOptions,
    };
}
else {
    options = {
        type: 'postgres',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE || process.env.DB_NAME,
        ...baseOptions,
    };
}
exports.default = new typeorm_1.DataSource(options);
//# sourceMappingURL=data-source.js.map