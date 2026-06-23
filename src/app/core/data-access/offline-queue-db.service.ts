import { Injectable, inject } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { APP_ENV, AppEnvironment } from './app-env.token';

export interface OfflineQueueItem {
  id?: number;
  type: string;
  payload: string; // JSON
  createdAt: string;
  retries: number;
  status: 'PENDING' | 'DONE' | 'FAILED' | 'ERROR';
  lastError?: string;
}

@Injectable({ providedIn: 'root' })
export class OfflineQueueDbService {
  private sqlite: SQLiteConnection;
  private db!: SQLiteDBConnection;
  private isReady = false;
  private readonly env = inject(APP_ENV);

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  async initDb(): Promise<void> {
    if (!this.env.isMobile) return; // Do not initialize if not in mobile/capacitor
    if (this.isReady) return;

    try {
      this.db = await this.sqlite.createConnection(
        'sikepkendi_offline',
        false,
        'no-encryption',
        1,
        false
      );
      await this.db.open();
      
      // Buat skema tabel offline_queue
      const schema = `
        CREATE TABLE IF NOT EXISTS offline_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          payload TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          retries INTEGER DEFAULT 0,
          status TEXT NOT NULL,
          lastError TEXT
        );
      `;
      await this.db.execute(schema);
      this.isReady = true;
    } catch (e) {
      console.error('OfflineQueueDbService init error', e);
    }
  }

  async enqueue(type: string, payload: any): Promise<void> {
    if (!this.isReady) return;
    const jsonPayload = JSON.stringify(payload);
    const createdAt = new Date().toISOString();
    const query = `
      INSERT INTO offline_queue (type, payload, createdAt, status) 
      VALUES (?, ?, ?, 'PENDING')
    `;
    await this.db.run(query, [type, jsonPayload, createdAt]);
  }

  async getPendingItems(): Promise<OfflineQueueItem[]> {
    if (!this.isReady) return [];
    const query = `
      SELECT * FROM offline_queue 
      WHERE status IN ('PENDING', 'ERROR') AND retries < 3 
      ORDER BY id ASC
    `;
    const res = await this.db.query(query);
    return res.values as OfflineQueueItem[] || [];
  }

  async markStatus(id: number, status: 'DONE' | 'FAILED' | 'ERROR', errorMessage?: string): Promise<void> {
    if (!this.isReady) return;
    
    if (status === 'ERROR') {
      const query = `
        UPDATE offline_queue 
        SET status = ?, retries = retries + 1, lastError = ? 
        WHERE id = ?
      `;
      await this.db.run(query, [status, errorMessage || '', id]);
    } else {
      const query = `
        UPDATE offline_queue 
        SET status = ?, lastError = ? 
        WHERE id = ?
      `;
      await this.db.run(query, [status, errorMessage || '', id]);
    }
  }
}
