import type { Pengajuan, ApprovalPolicy, PengajuanStatus, PengajuanJenis } from '@shared/models';

export class LoadPengajuan {
  static readonly type = '[Pengajuan] Load List';
  readonly type = LoadPengajuan.type;
  constructor(public readonly filter?: { status?: PengajuanStatus; jenis?: PengajuanJenis; vehicleId?: string }) {}
}

export class CreatePengajuan {
  static readonly type = '[Pengajuan] Create';
  readonly type = CreatePengajuan.type;
  constructor(
    public readonly input: Omit<
      Pengajuan,
      | 'id'
      | 'nomor'
      | 'status'
      | 'createdAt'
      | 'approvalSteps'
      | 'workOrderId'
      | 'submittedAt'
      | 'approvedAt'
      | 'rejectedAt'
    >,
  ) {}
}

export class UpdatePengajuan {
  static readonly type = '[Pengajuan] Update';
  readonly type = UpdatePengajuan.type;
  constructor(
    public readonly id: string,
    public readonly input: Partial<Omit<
      Pengajuan,
      | 'id'
      | 'nomor'
      | 'status'
      | 'createdAt'
      | 'approvalSteps'
      | 'workOrderId'
      | 'submittedAt'
      | 'approvedAt'
      | 'rejectedAt'
    >>,
  ) {}
}

export class SubmitPengajuan {
  static readonly type = '[Pengajuan] Submit';
  readonly type = SubmitPengajuan.type;
  constructor(public readonly id: string) {}
}

export class ApprovePengajuan {
  static readonly type = '[Pengajuan] Approve';
  readonly type = ApprovePengajuan.type;
  constructor(
    public readonly id: string,
    public readonly vendorId: string,
    public readonly komentarVerifikasi?: string,
  ) {}
}

export class RejectPengajuan {
  static readonly type = '[Pengajuan] Reject';
  readonly type = RejectPengajuan.type;
  constructor(public readonly id: string, public readonly reason: string) {}
}

export class UpdateApprovalPolicies {
  static readonly type = '[Pengajuan] Update Approval Policies';
  readonly type = UpdateApprovalPolicies.type;
  constructor(public readonly policies: ApprovalPolicy[]) {}
}
