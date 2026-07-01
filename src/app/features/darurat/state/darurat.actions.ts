import { DaruratFilter, DaruratCreateInput } from '@core/data-access/ports/darurat-data.port';

export class LoadDarurat {
  static readonly type = '[Darurat] Load';
  readonly type = LoadDarurat.type;
  constructor(public readonly query?: DaruratFilter) {}
}

export class GetLaporanDaruratDetail {
  static readonly type = '[Darurat] Get Detail';
  readonly type = GetLaporanDaruratDetail.type;
  constructor(public readonly id: string) {}
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

export class VerifikasiDaruratFaseA {
  static readonly type = '[Darurat] Verifikasi Fase A';
  readonly type = VerifikasiDaruratFaseA.type;
  constructor(
    public readonly id: string,
    public readonly approved: boolean,
    public readonly alasan?: string,
    public readonly komentar?: string,
  ) {}
}

export class SubmitReimbursementDarurat {
  static readonly type = '[Darurat] Submit Reimbursement';
  readonly type = SubmitReimbursementDarurat.type;
  constructor(
    public readonly id: string,
    public readonly payload: { totalReimbursement: number, fotoNotaIds: number[], fotoSetelahPerbaikanIds: number[] },
  ) {}
}

export class InputShsDarurat {
  static readonly type = '[Darurat] Input SHS';
  readonly type = InputShsDarurat.type;
  constructor(public readonly id: string, public readonly items: any[]) {}
}

export class VerifikasiVerifikatorDarurat {
  static readonly type = '[Darurat] Verifikasi Verifikator';
  readonly type = VerifikasiVerifikatorDarurat.type;
  constructor(
    public readonly id: string,
    public readonly approved: boolean,
    public readonly alasan?: string,
    public readonly komentar?: string,
  ) {}
}

export class PptkApproveDarurat {
  static readonly type = '[Darurat] PPTK Approve';
  readonly type = PptkApproveDarurat.type;
  constructor(
    public readonly id: string,
    public readonly approved: boolean,
    public readonly alasan?: string,
    public readonly komentar?: string,
  ) {}
}

export class UploadBuktiPembayaranDarurat {
  static readonly type = '[Darurat] Upload Bukti Pembayaran';
  readonly type = UploadBuktiPembayaranDarurat.type;
  constructor(public readonly id: string, public readonly imageId: number) {}
}
