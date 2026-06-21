import type { WorkOrderProgress, WorkOrderEvidence } from '@shared/models';

export class LoadWorkOrders {
  static readonly type = '[WorkOrders] Load List';
  readonly type = LoadWorkOrders.type;
}

export class AssignWorkOrder {
  static readonly type = '[WorkOrders] Assign';
  readonly type = AssignWorkOrder.type;
  constructor(
    public readonly workOrderId: string,
    public readonly vendorId: string,
  ) {}
}

export class UpdateProgress {
  static readonly type = '[WorkOrders] Update Progress';
  readonly type = UpdateProgress.type;
  constructor(
    public readonly workOrderId: string,
    public readonly progress: Omit<WorkOrderProgress, 'id'>,
  ) {}
}

export class AddEvidence {
  static readonly type = '[WorkOrders] Add Evidence';
  readonly type = AddEvidence.type;
  constructor(
    public readonly workOrderId: string,
    public readonly evidence: Omit<WorkOrderEvidence, 'id'>,
  ) {}
}

export class CompleteWorkOrder {
  static readonly type = '[WorkOrders] Complete';
  readonly type = CompleteWorkOrder.type;
  constructor(
    public readonly workOrderId: string,
    public readonly notes: string,
  ) {}
}

export class ValidateWorkOrder {
  static readonly type = '[WorkOrders] Validate';
  readonly type = ValidateWorkOrder.type;
  constructor(
    public readonly workOrderId: string,
    public readonly accepted: boolean,
    public readonly reason?: string,
  ) {}
}
