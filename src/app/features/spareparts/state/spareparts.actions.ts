import type { Sparepart, Vendor } from '@shared/models';

export class LoadSpareparts {
  static readonly type = '[Spareparts] Load List';
  readonly type = LoadSpareparts.type;
}

export class CreateSparepart {
  static readonly type = '[Spareparts] Create';
  readonly type = CreateSparepart.type;
  constructor(public readonly input: Omit<Sparepart, 'id' | 'createdAt'>) {}
}

export class UpdateSparepartPrice {
  static readonly type = '[Spareparts] Update Price';
  readonly type = UpdateSparepartPrice.type;
  constructor(
    public readonly sparepartId: string,
    public readonly newPrice: number,
    public readonly changedBy: string,
    public readonly changedByName: string,
  ) {}
}

export class LoadVendors {
  static readonly type = '[Spareparts] Load Vendors';
  readonly type = LoadVendors.type;
}

export class CreateVendor {
  static readonly type = '[Spareparts] Create Vendor';
  readonly type = CreateVendor.type;
  constructor(public readonly input: Omit<Vendor, 'id' | 'createdAt'>) {}
}

export class LoadPriceHistory {
  static readonly type = '[Spareparts] Load Price History';
  readonly type = LoadPriceHistory.type;
  constructor(public readonly sparepartId: string) {}
}
