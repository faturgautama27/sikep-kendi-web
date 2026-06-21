import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';

import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
import type { Vehicle, VehicleDocument, OdometerReading } from '@shared/models';

import {
  LoadVehicles,
  CreateVehicle,
  UpdateVehicle,
  RetireVehicle,
  AddVehicleDocument,
  AddBaselinePhotos,
  RecordOdometer,
} from './vehicles.actions';

export interface VehiclesStateModel {
  list: Vehicle[];
  documents: VehicleDocument[];
  odometerReadings: OdometerReading[];
}

const INITIAL: VehiclesStateModel = {
  list: [],
  documents: [],
  odometerReadings: [],
};

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

@State<VehiclesStateModel>({
  name: 'vehicles',
  defaults: INITIAL,
})
@Injectable()
export class VehiclesState {
  @Selector()
  static list(state: VehiclesStateModel): Vehicle[] {
    return state.list;
  }

  @Selector()
  static activeVehicles(state: VehiclesStateModel): Vehicle[] {
    return state.list.filter((v) => v.status === 'active');
  }

  @Selector()
  static documents(state: VehiclesStateModel): VehicleDocument[] {
    return state.documents;
  }

  @Selector()
  static odometerReadings(state: VehiclesStateModel): OdometerReading[] {
    return state.odometerReadings;
  }

  static byId(id: string) {
    return (state: VehiclesStateModel): Vehicle | undefined => state.list.find((v) => v.id === id);
  }

  static documentsForVehicle(vehicleId: string) {
    return (state: VehiclesStateModel): VehicleDocument[] =>
      state.documents.filter((d) => d.vehicleId === vehicleId);
  }

  static odometerForVehicle(vehicleId: string) {
    return (state: VehiclesStateModel): OdometerReading[] =>
      state.odometerReadings.filter((o) => o.vehicleId === vehicleId);
  }

  @Action(HydrateFromFixtures)
  hydrate(ctx: StateContext<VehiclesStateModel>, action: HydrateFromFixtures) {
    ctx.patchState({
      list: action.payload.vehicles as Vehicle[],
      documents: action.payload.vehicleDocuments as VehicleDocument[],
      odometerReadings: action.payload.odometerReadings as OdometerReading[],
    });
  }

  @Action(LoadVehicles)
  load(_ctx: StateContext<VehiclesStateModel>) {
    // Preview Mode: data already hydrated from fixtures; nothing to fetch.
  }

  @Action(CreateVehicle)
  create(ctx: StateContext<VehiclesStateModel>, action: CreateVehicle) {
    const newVehicle: Vehicle = {
      ...action.input,
      id: generateId('v'),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    ctx.patchState({ list: [...ctx.getState().list, newVehicle] });
  }

  @Action(UpdateVehicle)
  update(ctx: StateContext<VehiclesStateModel>, action: UpdateVehicle) {
    const updated = ctx.getState().list.map((v) =>
      v.id === action.id ? { ...v, ...action.patch, updatedAt: nowIso() } : v,
    );
    ctx.patchState({ list: updated });
  }

  @Action(RetireVehicle)
  retire(ctx: StateContext<VehiclesStateModel>, action: RetireVehicle) {
    const updated = ctx.getState().list.map((v) =>
      v.id === action.id ? { ...v, status: 'retired' as const, updatedAt: nowIso() } : v,
    );
    ctx.patchState({ list: updated });
  }

  @Action(AddVehicleDocument)
  addDocument(ctx: StateContext<VehiclesStateModel>, action: AddVehicleDocument) {
    const newDoc: VehicleDocument = {
      ...action.doc,
      id: generateId('vdoc'),
      vehicleId: action.vehicleId,
    };
    ctx.patchState({ documents: [...ctx.getState().documents, newDoc] });
  }

  @Action(AddBaselinePhotos)
  addBaseline(_ctx: StateContext<VehiclesStateModel>, _action: AddBaselinePhotos) {
    // Preview Mode: image entities live in ImagesState. No-op here.
  }

  @Action(RecordOdometer)
  recordOdometer(ctx: StateContext<VehiclesStateModel>, action: RecordOdometer) {
    // Validasi monoton: tolak jika nilai < terakhir.
    const last = ctx
      .getState()
      .odometerReadings.filter((o) => o.vehicleId === action.vehicleId)
      .sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1))[0];
    if (last && action.reading.valueKm < last.valueKm) {
      throw new Error(`Odometer ${action.reading.valueKm} < terakhir ${last.valueKm}`);
    }
    const newReading: OdometerReading = {
      ...action.reading,
      id: generateId('odo'),
      vehicleId: action.vehicleId,
    };
    ctx.patchState({
      odometerReadings: [...ctx.getState().odometerReadings, newReading],
      list: ctx.getState().list.map((v) =>
        v.id === action.vehicleId
          ? { ...v, odometerCurrent: newReading.valueKm, updatedAt: nowIso() }
          : v,
      ),
    });
  }
}
