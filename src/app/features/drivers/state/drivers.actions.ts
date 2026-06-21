import type { Driver, DriverAssignment, DriverViolation } from '@shared/models';

export class LoadDrivers {
  static readonly type = '[Drivers] Load List';
  readonly type = LoadDrivers.type;
}

export class CreateDriver {
  static readonly type = '[Drivers] Create';
  readonly type = CreateDriver.type;
  constructor(public readonly input: Omit<Driver, 'id' | 'createdAt'>) {}
}

export class AssignDriverToVehicle {
  static readonly type = '[Drivers] Assign To Vehicle';
  readonly type = AssignDriverToVehicle.type;
  constructor(public readonly assignment: Omit<DriverAssignment, 'id'>) {}
}

export class EndAssignment {
  static readonly type = '[Drivers] End Assignment';
  readonly type = EndAssignment.type;
  constructor(public readonly assignmentId: string) {}
}

export class RecordViolation {
  static readonly type = '[Drivers] Record Violation';
  readonly type = RecordViolation.type;
  constructor(public readonly violation: Omit<DriverViolation, 'id'>) {}
}
