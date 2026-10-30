export type PassStatus = 'ACTIVE' | 'CANCELLED';

export interface PassRow {
  id: string;
  name: string;
  document: string;
  issued_at: Date;
  status: PassStatus;
}

export interface PassDto {
  id: string;
  name: string;
  document: string;
  issuedAt: string;
  status: PassStatus;
}

export interface PassStats {
  total: number;
  active: number;
}
