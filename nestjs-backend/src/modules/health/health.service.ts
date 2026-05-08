import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkg = require('../../../package.json') as { version: string };

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  uptime: number;
  version: string;
  database: { connected: boolean; latencyMs: number };
  env: string;
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getHealth(): Promise<HealthResponse> {
    let dbConnected = false;
    let latencyMs = 0;
    let dbOk = true;
    const start = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      latencyMs = Date.now() - start;
      dbConnected = true;
    } catch {
      latencyMs = Date.now() - start;
      dbOk = false;
    }

    let status: 'ok' | 'degraded' | 'down' = 'ok';
    if (!dbOk) status = 'down';
    else if (latencyMs > 1000) status = 'degraded';

    return {
      status,
      uptime: Math.floor(process.uptime()),
      version: pkg.version,
      database: { connected: dbConnected, latencyMs },
      env: process.env.NODE_ENV ?? 'development',
      timestamp: new Date().toISOString(),
    };
  }
}
