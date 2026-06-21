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

export class ApproveDraft {
  static readonly type = '[DraftChecklist] Approve';
  readonly type = ApproveDraft.type;
  constructor(public readonly id: string) {}
}

export class RejectDraft {
  static readonly type = '[DraftChecklist] Reject';
  readonly type = RejectDraft.type;
  constructor(public readonly id: string, public readonly notesRejection: string) {}
}
