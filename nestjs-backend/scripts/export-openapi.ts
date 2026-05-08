/**
 * Phase 108 — OpenAPI spec exporter
 * Boots the Nest app in offline mode (no listen), builds the Swagger document
 * matching main.ts metadata, then writes it to nestjs-backend/openapi.json.
 *
 * Run: npm run openapi:export
 */
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from '../src/app.module';

async function exportSpec() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('Yapgitsin API')
    .setDescription('Yapgitsin v2 — auto-generated OpenAPI spec')
    .setVersion('2.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT-auth',
    )
    .build();

  const doc = SwaggerModule.createDocument(app, config);
  const outPath = path.join(process.cwd(), 'openapi.json');
  fs.writeFileSync(outPath, JSON.stringify(doc, null, 2));
  await app.close();
  console.log(`Exported OpenAPI spec → ${outPath}`);
  process.exit(0);
}

void exportSpec().catch((err) => {
  console.error('OpenAPI export failed:', err);
  process.exit(1);
});
