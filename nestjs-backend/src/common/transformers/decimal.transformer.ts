import { ValueTransformer } from 'typeorm';

/**
 * Driver-agnostic numeric transformer.
 *
 * Postgres/MariaDB return `numeric`/`decimal` columns as **strings** (lossless),
 * SQLite returns them as numbers. This transformer normalizes the read side so
 * the entity property is always a JS `number` (or `null`), regardless of driver.
 *
 * Use on money/precision columns: `@Column({ type: 'decimal', precision: 12, scale: 2, transformer: decimalTransformer })`.
 */
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null): number | null | undefined => value,
  from: (value?: string | number | null): number | null => {
    if (value === null || value === undefined) return value ?? null;
    const n = typeof value === 'number' ? value : parseFloat(value);
    return Number.isNaN(n) ? null : n;
  },
};
