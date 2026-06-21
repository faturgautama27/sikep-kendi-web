import type { Vehicle, VehicleDocument, OdometerReading } from '@shared/models';

export class LoadVehicles {
  static readonly type = '[Vehicles] Load List';
  readonly type = LoadVehicles.type;
}

export class CreateVehicle {
  static readonly type = '[Vehicles] Create';
  readonly type = CreateVehicle.type;
  constructor(public readonly input: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>) {}
}

export class UpdateVehicle {
  static readonly type = '[Vehicles] Update';
  readonly type = UpdateVehicle.type;
  constructor(public readonly id: string, public readonly patch: Partial<Vehicle>) {}
}

export class RetireVehicle {
  static readonly type = '[Vehicles] Retire';
  readonly type = RetireVehicle.type;
  constructor(public readonly id: string) {}
}

export class AddVehicleDocument {
  static readonly type = '[Vehicles] Add Document';
  readonly type = AddVehicleDocument.type;
  constructor(public readonly vehicleId: string, public readonly doc: Omit<VehicleDocument, 'id'>) {}
}

export class AddBaselinePhotos {
  static readonly type = '[Vehicles] Add Baseline Photos';
  readonly type = AddBaselinePhotos.type;
  constructor(public readonly vehicleId: string, public readonly imageIds: string[]) {}
}

export class RecordOdometer {
  static readonly type = '[Vehicles] Record Odometer';
  readonly type = RecordOdometer.type;
  constructor(public readonly vehicleId: string, public readonly reading: Omit<OdometerReading, 'id'>) {}
}
