/**
 * TypeORM CLI DataSource — used by `npm run migration:*` scripts.
 *
 * Runtime app config lives in `app.module.ts`. This file exists so the
 * TypeORM CLI can connect without bootstrapping the whole Nest app.
 *
 * Usage:
 *   npm run migration:generate -- src/migrations/MyChange
 *   npm run migration:run
 *   npm run migration:revert
 */
import 'reflect-metadata';
import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { isAbsolute, join } from 'path';
import { APP_ROOT } from './common/paths';

const dbType = process.env.DB_TYPE || 'sqlite';

/**
 * Resolve the SQLite database path against APP_ROOT (not process.cwd(), which is
 * C:\Windows\System32\inetsrv under iisnode). `:memory:` and absolute paths pass through.
 */
function resolveSqlitePath(name: string): string {
  return name === ':memory:' || isAbsolute(name) ? name : join(APP_ROOT, name);
}

const baseOptions = {
  // Glob both .ts (CLI w/ ts-node) and .js (compiled prod) so this file works in both contexts.
  entities: [`${__dirname}/**/*.entity{.ts,.js}`],
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
  synchronize: false,
};

let options: DataSourceOptions;

if (dbType === 'sqlite') {
  options = {
    type: 'sqlite',
    database: resolveSqlitePath(
      process.env.DB_DATABASE || process.env.DB_NAME || 'hizmet_db.sqlite',
    ),
    ...baseOptions,
  };
} else if (dbType === 'mysql') {
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
} else {
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

export default new DataSource(options);
