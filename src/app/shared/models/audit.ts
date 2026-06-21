import type { Uuid, Timestamp } from './common';
import type { RoleName } from './user';

export interface AuditLog {
  id: Uuid;
  actorId: Uuid;
  actorName: string;
  role: RoleName | 'system';
  action: string; // 'created' | 'updated' | 'deleted' | 'login' | 'login_failed' | etc
  entity: string; // 'Vehicle' | 'Pengajuan' | 'SpjExternal' | etc
  entityId: Uuid | null;
  entityRef: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  occurredAt: Timestamp;
  ip: string;
  userAgent: string;
  prevHash: string;
  hash: string;
}
