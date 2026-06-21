import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { APP_ENV } from '@core/data-access/app-env.token';
import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
import { AUDIT_DATA, type AuditDataPort } from '@core/data-access/ports/audit-data.port';
import type { AuditLog } from '@shared/models';

import { LoadAuditLogs, FilterAuditLogs, ExportAuditLog } from './audit.actions';

export interface AuditStateModel {
  logs: AuditLog[];
  filter: {
    from?: string;
    to?: string;
    actorId?: string;
    role?: string;
    entity?: string;
    action?: string;
  };
}

const INITIAL: AuditStateModel = { logs: [], filter: {} };

@State<AuditStateModel>({ name: 'audit', defaults: INITIAL })
@Injectable()
export class AuditState {
  private readonly env = inject(APP_ENV);
  private readonly data = inject<AuditDataPort>(AUDIT_DATA);

  private mapAudit(raw: Record<string, unknown>): AuditLog {
    return {
      id: String(raw['id'] ?? ''),
      actorId: String(raw['actorId'] ?? 'system'),
      actorName: String((raw['actor'] as { fullName?: string } | undefined)?.fullName ?? 'System'),
      role: ((raw['actorRole'] as AuditLog['role'] | undefined) ?? 'system'),
      action: String(raw['action'] ?? '-'),
      entity: String(raw['entity'] ?? '-'),
      entityId: raw['entityId'] ? String(raw['entityId']) : null,
      entityRef: null,
      before: (raw['before'] as Record<string, unknown> | null | undefined) ?? null,
      after: (raw['after'] as Record<string, unknown> | null | undefined) ?? null,
      occurredAt: String(raw['occurredAt'] ?? new Date().toISOString()),
      ip: String(raw['ip'] ?? raw['ipAddress'] ?? '-'),
      userAgent: String(raw['userAgent'] ?? '-'),
      prevHash: String(raw['prevHash'] ?? '-'),
      hash: String(raw['hash'] ?? '-'),
    };
  }

  @Selector()
  static logs(state: AuditStateModel): AuditLog[] {
    const { filter } = state;
    let logs = state.logs;
    if (filter.from) logs = logs.filter((l) => l.occurredAt >= filter.from!);
    if (filter.to) logs = logs.filter((l) => l.occurredAt <= filter.to!);
    if (filter.actorId) logs = logs.filter((l) => l.actorId === filter.actorId);
    if (filter.role) logs = logs.filter((l) => l.role === filter.role);
    if (filter.entity) logs = logs.filter((l) => l.entity === filter.entity);
    if (filter.action) logs = logs.filter((l) => l.action === filter.action);
    return logs;
  }

  @Selector()
  static filter(state: AuditStateModel): AuditStateModel['filter'] {
    return state.filter;
  }

  @Action(HydrateFromFixtures)
  hydrate(ctx: StateContext<AuditStateModel>, action: HydrateFromFixtures) {
    ctx.patchState({ logs: action.payload.auditLogs as AuditLog[] });
  }

  @Action(LoadAuditLogs)
  load(ctx: StateContext<AuditStateModel>) {
    if (this.env.previewMode) return;
    return this.data.list(ctx.getState().filter).pipe(
      tap((result) => {
        const logs = result.data.map((row) => this.mapAudit(row as unknown as Record<string, unknown>));
        ctx.patchState({ logs });
      }),
    );
  }

  @Action(FilterAuditLogs)
  applyFilter(ctx: StateContext<AuditStateModel>, action: FilterAuditLogs) {
    ctx.patchState({ filter: action.filter });
    if (!this.env.previewMode) {
      ctx.dispatch(new LoadAuditLogs());
    }
  }

  @Action(ExportAuditLog)
  export(_ctx: StateContext<AuditStateModel>, _action: ExportAuditLog) {
    // Preview Mode: tidak ekspor riil. Halaman akan menampilkan toast "ekspor di preview mode di-skip".
  }
}
