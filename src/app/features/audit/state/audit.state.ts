import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';

import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
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
  load(_ctx: StateContext<AuditStateModel>) {}

  @Action(FilterAuditLogs)
  applyFilter(ctx: StateContext<AuditStateModel>, action: FilterAuditLogs) {
    ctx.patchState({ filter: action.filter });
  }

  @Action(ExportAuditLog)
  export(_ctx: StateContext<AuditStateModel>, _action: ExportAuditLog) {
    // Preview Mode: tidak ekspor riil. Halaman akan menampilkan toast "ekspor di preview mode di-skip".
  }
}
