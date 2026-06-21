import type { RegulationVersion, RegulationRule } from '@shared/models';

export class LoadRegulations {
  static readonly type = '[Regulations] Load List';
  readonly type = LoadRegulations.type;
}

export class PublishRegulationVersion {
  static readonly type = '[Regulations] Publish Version';
  readonly type = PublishRegulationVersion.type;
  constructor(
    public readonly regulationId: string,
    public readonly newVersion: Omit<RegulationVersion, 'id' | 'publishedAt' | 'rules'>,
    public readonly rules: Omit<RegulationRule, 'id' | 'regulationVersionId'>[],
    public readonly summary: string,
  ) {}
}

export class ImportRegulations {
  static readonly type = '[Regulations] Import';
  readonly type = ImportRegulations.type;
  constructor(public readonly file: File) {}
}

export class LoadRegulationVersion {
  static readonly type = '[Regulations] Load Version';
  readonly type = LoadRegulationVersion.type;
  constructor(
    public readonly regulationId: string,
    public readonly versionId: string,
  ) {}
}
