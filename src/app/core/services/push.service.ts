import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { PushNotifications } from '@capacitor/push-notifications';
import { APP_ENV } from '@core/data-access/app-env.token';

@Injectable({
  providedIn: 'root',
})
export class PushService {
  private readonly http = inject(HttpClient);
  private readonly messageService = inject(MessageService);
  private readonly env = inject(APP_ENV);

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
