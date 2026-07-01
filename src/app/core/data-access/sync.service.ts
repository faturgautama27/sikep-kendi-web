import { Injectable, inject } from '@angular/core';
import { Network } from '@capacitor/network';
import { firstValueFrom } from 'rxjs';

import { OfflineQueueDbService, OfflineQueueItem } from './offline-queue-db.service';
import { PENGAJUAN_DATA } from './ports/pengajuan-data.port';
import { DARURAT_DATA } from './ports/darurat-data.port';
import { VEHICLE_DATA } from './ports/vehicle-data.port';

import { IMAGE_DATA } from './ports/image-data.port';

@Injectable({ providedIn: 'root' })
export class SyncService {
  private offlineDb = inject(OfflineQueueDbService);
  private pengajuanData = inject(PENGAJUAN_DATA);
  private daruratData = inject(DARURAT_DATA);
  private vehicleData = inject(VEHICLE_DATA);
  private imageData = inject(IMAGE_DATA);
  
  private isSyncing = false;

  async initSyncListener() {
    Network.addListener('networkStatusChange', async status => {
      if (status.connected) {
        await this.startSync();
      }
    });

    const status = await Network.getStatus();
    if (status.connected) {
      await this.startSync();
    }
  }

  async startSync() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const pendingItems = await this.offlineDb.getPendingItems();
      for (const item of pendingItems) {
        await this.processItem(item);
      }
    } finally {
      this.isSyncing = false;
    }
  }

  private async processItem(item: OfflineQueueItem) {
    if (!item.id) return;
    try {
      const payload = JSON.parse(item.payload);
      
      // Handle offline photos if present
      if (payload.offlinePhotos && payload.offlinePhotos.length > 0) {
        payload.fotoIds = payload.fotoIds || [];
        for (const base64 of payload.offlinePhotos) {
          const file = await this.base64ToFile(base64, 'offline-photo.jpg');
          const uploaded = await firstValueFrom(this.imageData.upload(file, {
            tokenId: crypto.randomUUID(),
            entityKind: 'pengajuan',
            entityId: payload.clientUuid || '0',
            kategori: 'kerusakan',
            capturedAtClient: new Date().toISOString()
          }));
          if (uploaded?.id) {
            payload.fotoIds.push(uploaded.id);
          }
        }
        delete payload.offlinePhotos;
      }
      
      switch (item.type) {
        case 'CREATE_PENGAJUAN':
          await firstValueFrom(this.pengajuanData.create(payload));
          break;
        case 'CREATE_DARURAT':
          await firstValueFrom(this.daruratData.create(payload));
          break;
        case 'RECORD_ODOMETER':
          await firstValueFrom(this.vehicleData.addOdometerReading(payload.vehicleId, payload.reading));
          break;
        case 'SUBMIT_REIMBURSEMENT_DARURAT':
          await firstValueFrom(this.daruratData.submitReimbursement(payload.id, payload.payload));
          break;
        default:
          throw new Error('Unknown sync type: ' + item.type);
      }
      
      await this.offlineDb.markStatus(item.id, 'DONE');
    } catch (e: any) {
      const status = e.status || e.statusCode;
      if (status === 409) {
        await this.offlineDb.markStatus(item.id, 'DONE');
      } else if (status === 422) {
        await this.offlineDb.markStatus(item.id, 'FAILED', e.message);
      } else {
        await this.offlineDb.markStatus(item.id, 'ERROR', e.message);
      }
    }
  }

  private async base64ToFile(base64: string, filename: string): Promise<File> {
    const res = await fetch(base64);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
  }
}
