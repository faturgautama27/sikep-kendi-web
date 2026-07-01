export class LoadWorkOrders {
  static readonly type = '[WorkOrders] Load List';
  readonly type = LoadWorkOrders.type;
}

export class GetWorkOrderDetail {
  static readonly type = '[WorkOrders] Get Detail';
  readonly type = GetWorkOrderDetail.type;
  constructor(public readonly workOrderId: string) {}
}

export class AssignVendor {
  static readonly type = '[WorkOrders] Assign Vendor';
  readonly type = AssignVendor.type;
  constructor(
    public readonly workOrderId: string,
    public readonly vendorId: string,
  ) {}
}

export class ApprovePPTK {
  static readonly type = '[WorkOrders] Approve PPTK';
  readonly type = ApprovePPTK.type;
  constructor(public readonly workOrderId: string) {}
}

export class RejectPPTK {
  static readonly type = '[WorkOrders] Reject PPTK';
  readonly type = RejectPPTK.type;
  constructor(public readonly workOrderId: string, public readonly catatan: string) {}
}
