import type { PassInput } from '../types.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function parsePassInput(body: unknown): PassInput | null {
  if (!isRecord(body)) {
    return null;
  }
  const name = nonEmptyString(body.name);
  const document = nonEmptyString(body.document);
  if (name === null || document === null) {
    return null;
  }
  return { name, document };
}
