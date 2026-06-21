import type { SpjExternal, InternalKind } from '@shared/models';

export class LoadSpj {
  static readonly type = '[SPJ] Load List';
  readonly type = LoadSpj.type;
}

export class UploadSpj {
  static readonly type = '[SPJ] Upload';
  readonly type = UploadSpj.type;
  constructor(
    public readonly input: Omit<
      SpjExternal,
      'id' | 'status' | 'uploadedAt' | 'daysSinceUpload' | 'match' | 'followUp' | 'candidates'
    >,
  ) {}
}

export class ResolveAmbiguousMatch {
  static readonly type = '[SPJ] Resolve Ambiguous';
  readonly type = ResolveAmbiguousMatch.type;
  constructor(
    public readonly spjId: string,
    public readonly candidate: { kind: InternalKind; id: string },
  ) {}
}

export class MarkNeedsFollowUp {
  static readonly type = '[SPJ] Mark Needs Follow Up';
  readonly type = MarkNeedsFollowUp.type;
  constructor(public readonly spjId: string, public readonly alasan: string, public readonly langkah: string) {}
}

export class LoadSpjReport {
  static readonly type = '[SPJ] Load Report';
  readonly type = LoadSpjReport.type;
  constructor(public readonly from: string, public readonly to: string) {}
}
