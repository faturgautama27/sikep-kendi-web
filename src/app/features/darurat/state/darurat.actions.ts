export class LoadDarurat {
  static readonly type = '[Darurat] Load';
  readonly type = LoadDarurat.type;
}

export class CreateDarurat {
  static readonly type = '[Darurat] Create';
  readonly type = CreateDarurat.type;
  constructor(public readonly payload: Record<string, unknown>) {}
}

export class VerifikasiDarurat {
  static readonly type = '[Darurat] Verifikasi';
  readonly type = VerifikasiDarurat.type;
  constructor(
    public readonly id: string,
    public readonly accepted: boolean,
    public readonly notes?: string,
  ) {}
}

export class ApproveReimburseDarurat {
  static readonly type = '[Darurat] Approve Reimburse';
  readonly type = ApproveReimburseDarurat.type;
  constructor(public readonly id: string) {}
}
