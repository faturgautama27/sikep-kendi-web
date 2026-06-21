import type {
  ChecklistTemplate,
  ChecklistItem,
  ChecklistExecution,
} from '@shared/models';

export class LoadChecklistTemplates {
  static readonly type = '[Checklist] Load Templates';
  readonly type = LoadChecklistTemplates.type;
}

export class CreateChecklistTemplate {
  static readonly type = '[Checklist] Create Template';
  readonly type = CreateChecklistTemplate.type;
  constructor(
    public readonly input: Omit<ChecklistTemplate, 'id' | 'createdAt' | 'currentVersionId'>,
    public readonly items: Omit<ChecklistItem, 'id' | 'templateVersionId'>[],
  ) {}
}

export class PublishTemplateVersion {
  static readonly type = '[Checklist] Publish Template Version';
  readonly type = PublishTemplateVersion.type;
  constructor(
    public readonly templateId: string,
    public readonly items: Omit<ChecklistItem, 'id' | 'templateVersionId'>[],
  ) {}
}

export class LoadDueChecklists {
  static readonly type = '[Checklist] Load Due';
  readonly type = LoadDueChecklists.type;
  constructor(public readonly driverId: string) {}
}

export class SubmitChecklistExecution {
  static readonly type = '[Checklist] Submit Execution';
  readonly type = SubmitChecklistExecution.type;
  constructor(public readonly execution: Omit<ChecklistExecution, 'id'>) {}
}
