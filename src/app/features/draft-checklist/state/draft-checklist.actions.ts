export class LoadDraftChecklist {
  static readonly type = '[DraftChecklist] Load';
  readonly type = LoadDraftChecklist.type;
  constructor(public readonly workOrderId: string) {}
}

export class CreateDraftChecklist {
  static readonly type = '[DraftChecklist] Create';
  readonly type = CreateDraftChecklist.type;
  constructor(
    public readonly workOrderId: string,
    public readonly payload: Record<string, unknown>,
  ) {}
}

export class SubmitDraft {
  static readonly type = '[DraftChecklist] Submit';
  readonly type = SubmitDraft.type;
  constructor(public readonly id: string) {}
}

/** @deprecated gunakan ApproveDraftPb */
export class ApproveDraft {
  static readonly type = '[DraftChecklist] Approve';
  readonly type = ApproveDraft.type;
  constructor(public readonly id: string) {}
}

/** PB menyetujui draft checklist → DISETUJUI_PB */
export class ApproveDraftPb {
  static readonly type = '[DraftChecklist] ApprovePb';
  readonly type = ApproveDraftPb.type;
  constructor(
    public readonly workOrderId: string,
    public readonly id: string,
  ) {}
}

/** @deprecated gunakan RejectDraftPb */
export class RejectDraft {
  static readonly type = '[DraftChecklist] Reject';
  readonly type = RejectDraft.type;
  constructor(public readonly id: string, public readonly notesRejection: string) {}
}

/** PB menolak draft checklist → DITOLAK_PB, vendor bisa revisi */
export class RejectDraftPb {
  static readonly type = '[DraftChecklist] RejectPb';
  readonly type = RejectDraftPb.type;
  constructor(
    public readonly workOrderId: string,
    public readonly id: string,
    public readonly notesRejection: string,
  ) {}
}

/** PPTK menyetujui draft checklist → DISETUJUI_PPTK */
export class ApproveDraftPptk {
  static readonly type = '[DraftChecklist] ApprovePptk';
  readonly type = ApproveDraftPptk.type;
  constructor(
    public readonly workOrderId: string,
    public readonly id: string,
    public readonly pptkCatatan?: string,
  ) {}
}

/** PPTK menolak draft checklist → DITOLAK_PPTK, vendor bisa revisi */
export class RejectDraftPptk {
  static readonly type = '[DraftChecklist] RejectPptk';
  readonly type = RejectDraftPptk.type;
  constructor(
    public readonly workOrderId: string,
    public readonly id: string,
    public readonly pptkAlasanPenolakan: string,
  ) {}
}
