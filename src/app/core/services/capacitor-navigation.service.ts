import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { App as CapacitorApp } from '@capacitor/app';
import { environment } from '../../../environments/environment';
import { MessageService } from 'primeng/api';

/**
 * Service untuk menangani navigasi khusus di Capacitor (native APK).
 * 
 * Tanggung jawab:
 * 1. Intercept tombol back hardware untuk navigate ke previous route, bukan exit app
 * 2. Prevent app exit kecuali user sudah di root level
 * 3. Provide manual refresh method (karena F5 tidak bekerja di APK)
 * 4. Handle pull-to-refresh gesture untuk memuat data ulang
 */
@Injectable({
  providedIn: 'root',
})
export class CapacitorNavigationService {
  private router = inject(Router);
  private messageService = inject(MessageService);
  private lastBackPressTime = 0;
  private readonly DOUBLE_BACK_EXIT_THRESHOLD = 2000; // ms
  
  // Signal untuk tracking state refresh dari parent component
  readonly isRefreshing = signal(false);

  /**
   * Initialize Capacitor navigation handlers.
   * Hanya berjalan jika app berjalan di mobile native environment.
   */
  initialize(): void {
    // Skip initialization jika bukan mobile environment
    if (!environment.isMobile) {
      return;
    }

    this.setupHardwareBackButton();
  }

  /**
   * Setup handler untuk tombol back hardware.
   * 
   * Behavior:
   * - Jika ada route history, navigate back
   * - Jika sudah di root, press back 2x dalam 2 detik untuk exit
   * - First back press: show toast "Tekan sekali lagi untuk keluar"
   * - Second back press dalam 2 detik: close app
   */
  private setupHardwareBackButton(): void {
    CapacitorApp.addListener('backButton', async ({ canGoBack }) => {
      // Jika bisa navigate back (ada history route), go back
      if (canGoBack) {
        window.history.back();
        return;
      }

      // Di root level: implement double-tap to exit
      const now = Date.now();
      const isDoubleTap =
        now - this.lastBackPressTime < this.DOUBLE_BACK_EXIT_THRESHOLD;

      if (isDoubleTap) {
        // Double tap detected, exit app
        CapacitorApp.exitApp();
      } else {
        // First tap, show toast and wait for second tap
        this.lastBackPressTime = now;
        this.messageService.add({
          severity: 'info',
          summary: 'Keluar Aplikasi',
          detail: 'Tekan sekali lagi untuk keluar dari aplikasi',
          life: 2000,
        });
      }
    });
  }

  /**
   * Manual refresh method untuk mobile app.
   * Reload halaman aplikasi tanpa exit.
   * 
   * Digunakan ketika user tidak bisa pull-to-refresh
   * atau membutuhkan hard refresh.
   */
  refreshPage(): void {
    this.isRefreshing.set(true);
    try {
      window.location.reload();
    } finally {
      this.isRefreshing.set(false);
    }
  }

  /**
   * Navigate back menggunakan window.history.back().
   * Lebih reliable di native app dibanding Angular Router.back().
   */
  navigateBack(): void {
    window.history.back();
  }

  /**
   * Trigger refresh dari parent component.
   * Component parent (seperti dashboard, darurat list) bisa call method ini
   * ketika user pull-to-refresh atau click refresh button.
   */
  triggerRefresh(): void {
    this.isRefreshing.set(true);
    // Parent component akan observe signal ini dan reload data
    // Setelah data selesai diload, parent component harus set isRefreshing ke false
  }

  /**
   * Notify bahwa refresh selesai.
   * Dipanggil dari parent component setelah data selesai diload.
   */
  completeRefresh(): void {
    this.isRefreshing.set(false);
  }
}
