export class LoadVerifikasi {
  static readonly type = '[Verifikasi] Load';
  readonly type = LoadVerifikasi.type;
  constructor(public readonly workOrderId: string) {}
}

export class SimpanShs {
  static readonly type = '[Verifikasi] Simpan SHS';
  readonly type = SimpanShs.type;
  constructor(public readonly workOrderId: string, public readonly items: Record<string, unknown>[]) {}
}

export class SetujuiVerifikasi {
  static readonly type = '[Verifikasi] Setujui';
  readonly type = SetujuiVerifikasi.type;
  constructor(public readonly workOrderId: string) {}
}

export class MintaRevisiVerifikasi {
  static readonly type = '[Verifikasi] Minta Revisi';
  readonly type = MintaRevisiVerifikasi.type;
  constructor(public readonly workOrderId: string, public readonly catatanRevisi: string) {}
}
