import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';

import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
import type { Driver, DriverAssignment, DriverViolation } from '@shared/models';

import {
  LoadDrivers,
  CreateDriver,
  AssignDriverToVehicle,
  EndAssignment,
  RecordViolation,
} from './drivers.actions';

export interface DriversStateModel {
  list: Driver[];
  assignments: DriverAssignment[];
  violations: DriverViolation[];
}

const INITIAL: DriversStateModel = { list: [], assignments: [], violations: [] };

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

@State<DriversStateModel>({ name: 'drivers', defaults: INITIAL })
@Injectable()
export class DriversState {
  @Selector()
  static list(state: DriversStateModel): Driver[] {
    return state.list;
  }

  @Selector()
  static assignments(state: DriversStateModel): DriverAssignment[] {
    return state.assignments;
  }

  @Selector()
  static activeAssignments(state: DriversStateModel): DriverAssignment[] {
    return state.assignments.filter((a) => a.endAt === null);
  }

  @Selector()
  static violations(state: DriversStateModel): DriverViolation[] {
    return state.violations;
  }

  @Action(HydrateFromFixtures)
  hydrate(ctx: StateContext<DriversStateModel>, action: HydrateFromFixtures) {
    ctx.patchState({
      list: action.payload.drivers as Driver[],
      assignments: action.payload.driverAssignments as DriverAssignment[],
      violations: action.payload.driverViolations as DriverViolation[],
    });
  }

  @Action(LoadDrivers)
  load(_ctx: StateContext<DriversStateModel>) {}

  @Action(CreateDriver)
  create(ctx: StateContext<DriversStateModel>, action: CreateDriver) {
    const newDriver: Driver = {
      ...action.input,
      id: generateId('drv'),
      createdAt: new Date().toISOString(),
    };
    ctx.patchState({ list: [...ctx.getState().list, newDriver] });
  }

  @Action(AssignDriverToVehicle)
  assign(ctx: StateContext<DriversStateModel>, action: AssignDriverToVehicle) {
    // Validasi: tolak assignment utama jika sudah ada utama aktif untuk driver tsb.
    if (action.assignment.mode === 'utama') {
      const hasActiveUtama = ctx.getState().assignments.some(
        (a) => a.driverId === action.assignment.driverId && a.mode === 'utama' && a.endAt === null,
      );
      if (hasActiveUtama) {
        throw new Error('Supir sudah memiliki penugasan utama aktif');
      }
    }
    const newAssignment: DriverAssignment = {
      ...action.assignment,
      id: generateId('asg'),
    };
    ctx.patchState({ assignments: [...ctx.getState().assignments, newAssignment] });
  }

  @Action(EndAssignment)
  endAssignment(ctx: StateContext<DriversStateModel>, action: EndAssignment) {
    const updated = ctx.getState().assignments.map((a) =>
      a.id === action.assignmentId ? { ...a, endAt: new Date().toISOString() } : a,
    );
    ctx.patchState({ assignments: updated });
  }

  @Action(RecordViolation)
  recordViolation(ctx: StateContext<DriversStateModel>, action: RecordViolation) {
    const newViolation: DriverViolation = {
      ...action.violation,
      id: generateId('vio'),
    };
    ctx.patchState({ violations: [...ctx.getState().violations, newViolation] });
  }
}
