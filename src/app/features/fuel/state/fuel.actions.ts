import type { FuelTransaction } from '@shared/models';

export class LoadFuelTransactions {
  static readonly type = '[Fuel] Load Transactions';
  readonly type = LoadFuelTransactions.type;
}

export class RecordFuelTransaction {
  static readonly type = '[Fuel] Record Transaction';
  readonly type = RecordFuelTransaction.type;
  constructor(public readonly input: Omit<FuelTransaction, 'id' | 'createdAt'>) {}
}

export class LoadFuelQuotas {
  static readonly type = '[Fuel] Load Quotas';
  readonly type = LoadFuelQuotas.type;
}
