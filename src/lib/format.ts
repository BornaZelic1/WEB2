import type { PassDto, PassRow } from '../types.js';

const displayFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Zagreb',
  dateStyle: 'medium',
  timeStyle: 'medium',
});

export function toIsoSeconds(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function formatDateTime(date: Date): string {
  return displayFormatter.format(date);
}

export function toPassDto(row: PassRow): PassDto {
  return {
    id: row.id,
    name: row.name,
    document: row.document,
    issuedAt: toIsoSeconds(row.issued_at),
    status: row.status,
  };
}
