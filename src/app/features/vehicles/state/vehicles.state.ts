import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { APP_ENV } from '@core/data-access/app-env.token';
import { HydrateFromFixtures } from '@core/data-access/fixtures.action';
import { VEHICLE_DATA, type VehicleDataPort } from '@core/data-access/ports/vehicle-data.port';
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
  private readonly env = inject(APP_ENV);
  private readonly data = inject<VehicleDataPort>(VEHICLE_DATA);

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
  load(ctx: StateContext<VehiclesStateModel>) {
    if (this.env.previewMode) return;
    return this.data.list().pipe(
      tap((list) => {
        ctx.patchState({ list });
      }),
    );
  }

  @Action(CreateVehicle)
  create(ctx: StateContext<VehiclesStateModel>, action: CreateVehicle) {
    if (!this.env.previewMode) {
      return this.data.create(action.input).pipe(
        tap((created) => {
          ctx.patchState({ list: [created, ...ctx.getState().list] });
          ctx.dispatch(new LoadVehicles());
        }),
      );
    }

    const newVehicle: Vehicle = {
      ...action.input,
      id: generateId('v'),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    ctx.patchState({ list: [...ctx.getState().list, newVehicle] });
    return;
  }

  @Action(UpdateVehicle)
  update(ctx: StateContext<VehiclesStateModel>, action: UpdateVehicle) {
    if (!this.env.previewMode) {
      return this.data.update(action.id, action.patch).pipe(
        tap((updatedFromApi) => {
          const state = ctx.getState();
          ctx.patchState({
            list: state.list.map((v) => (v.id === updatedFromApi.id ? updatedFromApi : v)),
          });
        }),
      );
    }

    const updated = ctx.getState().list.map((v) =>
      v.id === action.id ? { ...v, ...action.patch, updatedAt: nowIso() } : v,
    );
    ctx.patchState({ list: updated });
    return;
  }

  @Action(RetireVehicle)
  retire(ctx: StateContext<VehiclesStateModel>, action: RetireVehicle) {
    if (!this.env.previewMode) {
      return this.data.retire(action.id).pipe(
        tap((retiredFromApi) => {
          const state = ctx.getState();
          ctx.patchState({
            list: state.list.map((v) => (v.id === retiredFromApi.id ? retiredFromApi : v)),
          });
          ctx.dispatch(new LoadVehicles());
        }),
      );
    }

    const updated = ctx.getState().list.map((v) =>
      v.id === action.id ? { ...v, status: 'retired' as const, updatedAt: nowIso() } : v,
    );
    ctx.patchState({ list: updated });
    return;
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
    if (!this.env.previewMode) {
      return this.data.addOdometerReading(action.vehicleId, action.reading).pipe(
        tap((newReading) => {
          ctx.patchState({
            odometerReadings: [newReading, ...ctx.getState().odometerReadings],
            list: ctx.getState().list.map((v) =>
              v.id === action.vehicleId
                ? { ...v, odometerCurrent: newReading.valueKm, updatedAt: nowIso() }
                : v,
            ),
          });
        }),
      );
    }

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
    return;
  }
}
