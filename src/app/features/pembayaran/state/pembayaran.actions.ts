export class LoadPembayaran {
  static readonly type = '[Pembayaran] Load';
  readonly type = LoadPembayaran.type;
  constructor(public readonly workOrderId: string) {}
}

export class ProsesPembayaran {
  static readonly type = '[Pembayaran] Proses';
  readonly type = ProsesPembayaran.type;
  constructor(public readonly workOrderId: string, public readonly payload: Record<string, unknown>) {}
}

export class UploadBuktiTransfer {
  static readonly type = '[Pembayaran] Upload Bukti';
  readonly type = UploadBuktiTransfer.type;
  constructor(public readonly workOrderId: string, public readonly payload: Record<string, unknown>) {}
}
