import { DaruratFilter, DaruratCreateInput } from '@core/data-access/ports/darurat-data.port';

export class LoadDarurat {
  static readonly type = '[Darurat] Load';
  readonly type = LoadDarurat.type;
  constructor(public readonly query?: DaruratFilter) {}
}

export class CreateDarurat {
  static readonly type = '[Darurat] Create';
  readonly type = CreateDarurat.type;
  constructor(public readonly payload: DaruratCreateInput) {}
}

export class UpdateDarurat {
  static readonly type = '[Darurat] Update';
  readonly type = UpdateDarurat.type;
  constructor(public readonly id: string, public readonly payload: Partial<DaruratCreateInput>) {}
}

export class VerifikasiDarurat {
  static readonly type = '[Darurat] Verifikasi';
  readonly type = VerifikasiDarurat.type;
  constructor(
    public readonly id: string,
    public readonly approved: boolean,
    public readonly alasan?: string,
  ) {}
}

export class ApproveReimburseDarurat {
  static readonly type = '[Darurat] Approve Reimburse';
  readonly type = ApproveReimburseDarurat.type;
  constructor(public readonly id: string) {}
}
