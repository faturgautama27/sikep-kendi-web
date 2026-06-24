export class LoadPenawaran {
  static readonly type = '[Penawaran] Load';
  readonly type = LoadPenawaran.type;
  constructor(public readonly workOrderId: string) {}
}

export class CreatePenawaran {
  static readonly type = '[Penawaran] Create';
  readonly type = CreatePenawaran.type;
  constructor(public readonly workOrderId: string, public readonly payload: Record<string, unknown>) {}
}

export class SubmitPenawaran {
  static readonly type = '[Penawaran] Submit';
  readonly type = SubmitPenawaran.type;
  constructor(public readonly id: string) {}
}

export class RequestRevisiPenawaran {
  static readonly type = '[Penawaran] Request Revisi';
  readonly type = RequestRevisiPenawaran.type;
  constructor(public readonly id: string, public readonly catatanPerubahan: string) {}
}

export class SubmitRevisiPenawaran {
  static readonly type = '[Penawaran] Submit Revisi';
  readonly type = SubmitRevisiPenawaran.type;
  constructor(public readonly id: string, public readonly payload: Record<string, unknown>) {}
}

export class UploadInvoice {
  static readonly type = '[Penawaran] Upload Invoice';
  readonly type = UploadInvoice.type;
  constructor(public readonly workOrderId: string, public readonly id: string, public readonly payload: Record<string, unknown>) {}
}
