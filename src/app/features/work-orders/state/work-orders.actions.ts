import type { ShsItemInput } from '@core/data-access/ports/work-order-data.port';

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

// Step D: PB input SHS mapping
export class SaveShsMapping {
  static readonly type = '[WorkOrders] Save SHS Mapping';
  readonly type = SaveShsMapping.type;
  constructor(public readonly workOrderId: string, public readonly items: ShsItemInput[]) {}
}

// Step D: PB review (approve/reject) after SHS mapping
export class PbReviewShs {
  static readonly type = '[WorkOrders] PB Review SHS';
  readonly type = PbReviewShs.type;
  constructor(
    public readonly workOrderId: string,
    public readonly approved: boolean,
    public readonly catatan?: string,
    public readonly alasanPenolakan?: string,
  ) {}
}

// Step E: Vendor submit invoice
export class SubmitInvoice {
  static readonly type = '[WorkOrders] Submit Invoice';
  readonly type = SubmitInvoice.type;
  constructor(
    public readonly workOrderId: string,
    public readonly invoiceImageId: number,
    public readonly invoiceDraftImageId?: number,
  ) {}
}

// Step F: Verifikator review invoice
export class VerifikatorReview {
  static readonly type = '[WorkOrders] Verifikator Review';
  readonly type = VerifikatorReview.type;
  constructor(
    public readonly workOrderId: string,
    public readonly approved: boolean,
    public readonly catatan?: string,
    public readonly alasanPenolakan?: string,
  ) {}
}

// Step G: PPTK unified approve/reject
export class PptkDecision {
  static readonly type = '[WorkOrders] PPTK Decision';
  readonly type = PptkDecision.type;
  constructor(
    public readonly workOrderId: string,
    public readonly approved: boolean,
    public readonly komentar?: string,
    public readonly alasan?: string,
  ) {}
}
