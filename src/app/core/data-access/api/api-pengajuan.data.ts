import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of, switchMap } from 'rxjs';
import type { Pengajuan, ApprovalPolicy } from '@shared/models';
import type {
  PengajuanDataPort,
  PengajuanFilter,
  PengajuanCreateInput,
} from '../ports/pengajuan-data.port';
import { APP_ENV } from '../app-env.token';

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  meta?: Record<string, unknown>;
}

type ApiPengajuanRow = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class ApiPengajuanData implements PengajuanDataPort {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  private url(path: string): string {
    return `${this.env.apiBaseUrl}${path}`;
  }

  private mapStatus(status: string | undefined): Pengajuan['status'] {
    switch ((status ?? '').toUpperCase()) {
      case 'MENUNGGU_VERIFIKASI':
        return 'menunggu_verifikasi';
      case 'TERVERIFIKASI':
        return 'terverifikasi';
      case 'DITOLAK':
        return 'ditolak';
      case 'WORK_ORDER_TERBUAT':
        return 'work_order_terbuat';
      case 'DRAFT':
      case 'DIAJUKAN':
      default:
        return 'draft';
    }
  }

  private mapJenis(jenis: string | undefined): Pengajuan['jenis'] {
    const value = (jenis ?? '').toUpperCase();
    if (value === 'SERVIS_RUTIN' || value === 'PERBAIKAN_KERUSAKAN' || value === 'GANTI_SPARE_PART') {
      return value as Pengajuan['jenis'];
    }
    return 'PERBAIKAN_KERUSAKAN';
  }

  private mapPengajuan(raw: any, warnings?: string[]): Pengajuan {
    const id = String(raw['id'] ?? '');
    const createdAt = String(raw['createdAt'] ?? new Date().toISOString());
    const fotos = Array.isArray(raw['fotos'])
      ? (raw['fotos'] as Array<{ image?: any }>).map((row) => ({
          ...row.image,
          url: row.image.url
        })).filter(Boolean)
      : [];

    const jenisRaw = (raw['jenis'] as string | undefined) ?? (raw['jenisPengajuan'] as string | undefined);

    const odometer = raw['kendaraan'] ? Number(raw['kendaraan']['odometerSaatIni']) : 0;
    console.log(odometer);

    return {
      id,
      nomor: String(raw['nomor'] ?? `PMNT-${String(raw['id'] ?? '-').padStart(4, '0')}`),
      jenis: this.mapJenis(jenisRaw),
      vehicleId: String(raw['vehicleId'] ?? raw['kendaraanId'] ?? ''),
      vehiclePlate: String((raw['kendaraan'] as { nomorPolisi?: string } | undefined)?.nomorPolisi ?? '-'),
      vehicleMerk: String((raw['kendaraan'] as { merk?: string } | undefined)?.merk ?? '-'),
      vehicleModel: String((raw['kendaraan'] as { model?: string } | undefined)?.model ?? '-'),
      vehicleTahun: Number((raw['kendaraan'] as { tahun?: number } | undefined)?.tahun ?? 0),
      regulationVersionId: String(raw['regulationVersionId'] ?? raw['regulasiVersiId'] ?? '-'),
      judul: String(raw['judul'] ?? raw['deskripsiKerusakan'] ?? 'Pengajuan Pemeliharaan'),
      deskripsi: String(raw['deskripsi'] ?? raw['deskripsiKerusakan'] ?? '-'),
      kategoriKerusakan: (raw['kategoriKerusakan'] as string | null | undefined) ?? null,
      totalEstimasi: Number(raw['totalEstimasi'] ?? 0),
      odometerSaatPengajuan: odometer,
      status: this.mapStatus(raw['status'] as string | undefined),
      createdBy: String(raw['createdBy'] ?? raw['pengemudiId'] ?? 'system'),
      createdByName: String((raw['pengemudi'] as { fullName?: string } | undefined)?.fullName ?? '-'),
      sourceExecutionId: (raw['sourceExecutionId'] as string | null | undefined) ?? null,
      sourceItemId: (raw['sourceItemId'] as string | null | undefined) ?? null,
      spareparts: Array.isArray(raw['spareparts']) ? (raw['spareparts'] as Pengajuan['spareparts']) : [],
      approvalSteps: Array.isArray(raw['approvalSteps']) ? (raw['approvalSteps'] as Pengajuan['approvalSteps']) : [],
      workOrderId: (raw['workOrderId'] as string | null | undefined) ?? null,
      photos: fotos as Pengajuan['photos'],
      createdAt,
      updatedAt: (raw['updatedAt'] as string | undefined) ?? createdAt,
      submittedAt: (raw['submittedAt'] as string | null | undefined) ?? null,
      approvedAt: (raw['approvedAt'] as string | null | undefined) ?? null,
      rejectedAt: (raw['rejectedAt'] as string | null | undefined) ?? null,
      verifikasiOlehId: (raw['verifikasiOlehId'] as string | null | undefined) ?? null,
      verifikasiAt: (raw['verifikasiAt'] as string | null | undefined) ?? null,
      komentarVerifikasi: (raw['komentarVerifikasi'] as string | null | undefined) ?? null,
      alasanPenolakan: (raw['alasanPenolakan'] as string | null | undefined) ?? null,
      warnings,
    };
  }

  private unwrapOne(resp: ApiEnvelope<ApiPengajuanRow> | ApiPengajuanRow): ApiPengajuanRow {
    return (resp as ApiEnvelope<ApiPengajuanRow>).data ?? (resp as ApiPengajuanRow);
  }

  private unwrapMany(
    resp:
      | Pengajuan[]
      | { data?: ApiPengajuanRow[] }
      | ApiEnvelope<ApiPengajuanRow[]>,
  ): ApiPengajuanRow[] {
    if (Array.isArray(resp)) {
      return resp as unknown as ApiPengajuanRow[];
    }
    return (resp as ApiEnvelope<ApiPengajuanRow[]>).data
      ?? (resp as { data?: ApiPengajuanRow[] }).data
      ?? [];
  }

  list(filter?: PengajuanFilter): Observable<Pengajuan[]> {
    let params = new HttpParams();
    if (filter?.status) params = params.set('status', filter.status.toUpperCase());
    if (filter?.jenis) params = params.set('jenisPengajuan', filter.jenis.toUpperCase());
    if (filter?.vehicleId) params = params.set('kendaraanId', filter.vehicleId);
    if (filter?.pengemudiId) params = params.set('pengemudiId', filter.pengemudiId);
    return this.http
      .get<Pengajuan[] | { data?: ApiPengajuanRow[] } | ApiEnvelope<ApiPengajuanRow[]>>(this.url('/pengajuan'), {
        params,
      })
      .pipe(
        map((resp) => this.unwrapMany(resp).map((row) => this.mapPengajuan(row))),
      );
  }

  getById(id: string): Observable<Pengajuan> {
    return this.http
      .get<ApiPengajuanRow | ApiEnvelope<ApiPengajuanRow>>(this.url(`/pengajuan/${id}`))
      .pipe(
        map((resp) => this.mapPengajuan(this.unwrapOne(resp))),
      );
  }

  create(input: PengajuanCreateInput): Observable<Pengajuan> {
    return this.http
      .post<ApiPengajuanRow | ApiEnvelope<ApiPengajuanRow>>(this.url('/pengajuan'), {
        clientUuid: crypto.randomUUID(),
        kendaraanId: Number(input.vehicleId),
        jenisPengajuan: input.jenis.toUpperCase(),
        deskripsiKerusakan: input.deskripsi || input.judul,
        odometerSaatPengajuan: input.odometerSaatPengajuan ? Number(input.odometerSaatPengajuan) : 0,
        fotoIds: input.fotoIds || [],
      })
      .pipe(
        map((resp: any) => this.mapPengajuan(this.unwrapOne(resp), resp.warnings)),
      );
  }

  update(id: string, input: Partial<PengajuanCreateInput>): Observable<Pengajuan> {
    const payload: any = {};
    if (input.vehicleId !== undefined) payload.kendaraanId = Number(input.vehicleId);
    if (input.jenis !== undefined) payload.jenisPengajuan = input.jenis.toUpperCase();
    if (input.deskripsi !== undefined) payload.deskripsiKerusakan = input.deskripsi;
    if (input.odometerSaatPengajuan !== undefined) payload.odometerSaatPengajuan = Number(input.odometerSaatPengajuan);
    if (input.fotoIds !== undefined) payload.fotoIds = input.fotoIds;
    
    return this.http
      .patch<ApiPengajuanRow | ApiEnvelope<ApiPengajuanRow>>(this.url(`/pengajuan/${id}`), payload)
      .pipe(
        map((resp) => this.mapPengajuan(this.unwrapOne(resp))),
      );
  }

  submit(id: string): Observable<Pengajuan> {
    return this.getById(id);
  }

  approve(id: string, vendorId: string, komentarVerifikasi?: string): Observable<Pengajuan> {
    return this.http
      .post(this.url(`/pengajuan/${id}/approve`), {
        vendorId,
        komentarVerifikasi,
      })
      .pipe(switchMap(() => this.getById(id)));
  }

  reject(id: string, reason: string): Observable<Pengajuan> {
    return this.http
      .post(this.url(`/pengajuan/${id}/reject`), { alasanPenolakan: reason })
      .pipe(switchMap(() => this.getById(id)));
  }

  listApprovalPolicies(): Observable<ApprovalPolicy[]> {
    return of([]);
  }

  updateApprovalPolicies(policies: ApprovalPolicy[]): Observable<ApprovalPolicy[]> {
    return of(policies);
  }
}
