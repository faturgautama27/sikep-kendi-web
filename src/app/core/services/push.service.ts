import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { Store } from '@ngxs/store';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { PushNotifications } from '@capacitor/push-notifications';
import { APP_ENV } from '@core/data-access/app-env.token';
import { LoadNotifications } from '@features/notifications/state';
import { LoadPengajuan } from '@features/pengajuan/state';
import { LoadWorkOrders } from '@features/work-orders/state';
import { LoadDarurat } from '@features/darurat/state';
import { LoadVehicles } from '@features/vehicles/state';

@Injectable({
  providedIn: 'root',
})
export class PushService {
  private readonly http = inject(HttpClient);
  private readonly messageService = inject(MessageService);
  private readonly store = inject(Store);
  private readonly env = inject(APP_ENV);

  /**
   * Dispatch LoadNotifications selalu (refresh inbox), lalu dispatch
   * action domain spesifik berdasarkan entityKind dari payload data.
   */
  private dispatchReloadFor(data: Record<string, string> | undefined): void {
    const actions: object[] = [new LoadNotifications()];
    switch (data?.['entityKind']) {
      case 'pengajuan': actions.push(new LoadPengajuan()); break;
      case 'work_order': actions.push(new LoadWorkOrders()); break;
      case 'darurat': actions.push(new LoadDarurat()); break;
      case 'kendaraan': actions.push(new LoadVehicles()); break;
    }
    this.store.dispatch(actions);
  }

  async init() {
    if (this.env.isMobile) {
      await this.initCapacitorPush();
    } else {
      await this.initWebPush();
    }
  }

  private async initWebPush() {
    if (!('Notification' in window)) return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    try {
      const app = initializeApp(this.env.firebaseConfig);
      const messaging = getMessaging(app);

      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { type: 'classic' });
      await navigator.serviceWorker.ready;

      const currentToken = await getToken(messaging, {
        vapidKey: this.env.firebaseConfig?.vapidKey,
        serviceWorkerRegistration: registration
      });
      if (currentToken) {
        await this.registerToken(currentToken, 'web');
        
        // Debug: Pastikan browser benar-benar bisa memunculkan Notifikasi
        if (Notification.permission === 'granted') {
           new Notification('SiKeP KenDI Terhubung!', { body: 'Web Push berhasil diinisialisasi.' });
        }
      }

      onMessage(messaging, (payload: any) => {
        console.log('messaging payload =>', payload);

        const title = payload.notification?.title || payload.data?.title || 'Notifikasi Baru';
        const body = payload.notification?.body || payload.data?.body;

        // 1. Tampilkan OS-level Notification (Native Web Push)
        if (Notification.permission === 'granted') {
          new Notification(title, {
            body: body,
            icon: '/favicon.ico'
          });
        }

        // 2. Tampilkan Toast UI dalam Web
        this.messageService.add({
          severity: 'info',
          summary: title,
          detail: body,
          life: 5000,
        });

        // 3. Refresh state yang relevan berdasarkan entityKind
        this.dispatchReloadFor(payload.data);
      });

      // FALLBACK DEBUG: Tangkap raw message dari Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('Raw SW Message received:', event.data);
        if (event.data && event.data.isFirebaseMessaging) {
          const payload = event.data;
          const title = payload.notification?.title || payload.data?.title || 'Notifikasi Baru (Raw)';
          const body = payload.notification?.body || payload.data?.body;
          if (Notification.permission === 'granted') {
            new Notification(title, { body: body, icon: '/favicon.ico' });
          }
          this.messageService.add({
            severity: 'info',
            summary: title,
            detail: body,
            life: 5000,
          });
        }
      });
    } catch (err) {
      console.error('Error initializing web push', err);
    }
  }

  private async initCapacitorPush() {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') return;

    // Add listeners BEFORE registering
    await PushNotifications.addListener('registration', async (token) => {
      console.log('Push token received:', token.value);
      await this.registerToken(token.value, 'android');
    });

    await PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on registration: ', error);
    });

    await PushNotifications.register();

    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      this.messageService.add({
        severity: 'info',
        summary: notification.title || 'Notifikasi Baru',
        detail: notification.body,
        life: 5000,
      });

      // Refresh state yang relevan berdasarkan entityKind
      this.dispatchReloadFor(notification.data as Record<string, string>);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ', notification);
    });
  }

  private registerToken(token: string, platform: string) {
    return new Promise<void>((resolve) => {
      this.http
        .post(`${this.env.apiBaseUrl}/notifications/device-token`, { token, platform })
        .subscribe({
          next: () => resolve(),
          error: (err) => {
            console.error('Failed to register device token', err);
            resolve();
          },
        });
    });
  }
}
