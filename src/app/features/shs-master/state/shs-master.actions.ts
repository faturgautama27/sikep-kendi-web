import { ShsMasterCreateInput } from '@core/data-access/ports/shs-master-data.port';

export class LoadShsMaster {
  static readonly type = '[SHS Master] Load';
}

export class CreateShsMaster {
  static readonly type = '[SHS Master] Create';
  constructor(public readonly payload: ShsMasterCreateInput) {}
}

export class UpdateShsMaster {
  static readonly type = '[SHS Master] Update';
  constructor(public readonly id: number, public readonly payload: Partial<ShsMasterCreateInput>) {}
}

export class DeleteShsMaster {
  static readonly type = '[SHS Master] Delete';
  constructor(public readonly id: number) {}
}
