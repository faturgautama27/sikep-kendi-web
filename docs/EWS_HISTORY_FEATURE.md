# EWS History Feature

## Overview
Fitur EWS (Early Warning System) History adalah dashboard untuk tracking, monitoring, dan analisis notifikasi Early Warning System di SiKeP KenDI.

## Features

### 1. Dashboard Statistics
- Total notifikasi EWS
- Breakdown by severity (Critical, Warning, Info)
- Unread count dan escalated count
- Time-based statistics (24 hours, 7 days, 30 days)

### 2. Trend Chart
- Line chart showing notification trends over last 30 days
- Separate lines for Critical, Warning, and Info severity
- Visual representation of EWS patterns

### 3. Advanced Filtering
- **Date Range**: Filter by start date and end date
- **Trigger Type**: Filter by specific EWS trigger (e.g., document_expired, sim_expiring)
- **Severity**: Filter by critical, warning, or info
- **Entity Type**: Filter by entity (Vehicle, Driver, WorkOrder, etc.)
- **Read Status**: Filter by read/unread status

### 4. Data Table
Display columns:
- Severity badge with icon
- Trigger type label
- Title and message
- Entity type and reference (with link)
- Recipient name
- Channels sent (in_app, email, etc.)
- Timestamp
- Read status (with tooltip)
- Escalation indicator

### 5. Export Functions
- Export to Excel (planned)
- Export to PDF (planned)

## API Endpoint

### GET `/api/admin/ews-history`

**Query Parameters:**
```typescript
{
  page?: number;          // Default: 1
  perPage?: number;       // Default: 50, Max: 100
  startDate?: string;     // Format: YYYY-MM-DD
  endDate?: string;       // Format: YYYY-MM-DD
  triggerKind?: string;   // 'all' or specific trigger kind
  severity?: string;      // 'all' | 'critical' | 'warning' | 'info'
  entityKind?: string;    // 'all' or specific entity kind
  status?: string;        // 'all' | 'read' | 'unread'
  recipientId?: number;   // Filter by specific user
}
```

**Response:**
```typescript
{
  data: EwsHistoryItem[];
  statistics: {
    totalNotifications: number;
    criticalCount: number;
    warningCount: number;
    infoCount: number;
    unreadCount: number;
    escalatedCount: number;
    byTriggerKind: Record<string, number>;
    byEntityKind: Record<string, number>;
    last24Hours: number;
    last7Days: number;
    last30Days: number;
  };
  trends: Array<{
    date: string;
    critical: number;
    warning: number;
    info: number;
    total: number;
  }>;
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
```

## Trigger Types

| Trigger Kind | Label | Description |
|--------------|-------|-------------|
| `document_expiring` | Dokumen Akan Kadaluarsa | Document expiring soon |
| `document_expired` | Dokumen Kadaluarsa | Document already expired |
| `sim_expiring` | SIM Akan Kadaluarsa | Driver license expiring |
| `sim_expired` | SIM Kadaluarsa | Driver license expired |
| `service_due_km` | Servis Jatuh Tempo (KM) | Service due by kilometer |
| `service_due_time` | Servis Jatuh Tempo (Waktu) | Service due by time |
| `deviation_unresponded` | Deviasi Belum Direspon | Deviation not responded |
| `pengajuan_stuck` | Pengajuan Terhenti | Submission stuck |
| `budget_threshold` | Threshold Anggaran | Budget threshold reached |
| `spj_unmatched_7d` | SPJ Belum Match >7 Hari | SPJ unmatched > 7 days |
| `spj_unmatched_14d` | SPJ Belum Match >14 Hari | SPJ unmatched > 14 days |
| `recurring_deviation` | Deviasi Berulang | Recurring deviation |
| `over_quota_bbm` | BBM Melebihi Quota | Fuel over quota |

## Entity Types

- **Vehicle**: Kendaraan
- **Driver**: Pengemudi
- **WorkOrder**: Work Order
- **Pengajuan**: Pengajuan Pemeliharaan
- **SpjExternal**: SPJ External

## Database Schema

### Enhanced Notifications Table
```sql
ALTER TABLE notifications ADD COLUMN (
  trigger_kind VARCHAR(255),
  trigger_label VARCHAR(255),
  entity_kind VARCHAR(255),
  entity_id BIGINT UNSIGNED,
  entity_ref VARCHAR(255),
  channels_sent JSON,
  read_at TIMESTAMP NULL,
  escalated_at TIMESTAMP NULL,
  link VARCHAR(255),
  
  INDEX idx_trigger_kind (trigger_kind),
  INDEX idx_entity_kind (entity_kind),
  INDEX idx_recipient_trigger (recipient_id, trigger_kind),
  INDEX idx_created_severity (created_at, severity)
);
```

## Usage Example

### Creating EWS Notification
```php
use App\Services\NotificationService;

$notificationService->dispatch([
    'recipientIds' => [1, 2, 3],
    'title' => 'SIM Akan Kadaluarsa',
    'message' => 'SIM A milik Budi akan kadaluarsa dalam 30 hari',
    'severity' => 'warning',
    'triggerKind' => 'sim_expiring',
    'triggerLabel' => 'SIM Akan Kadaluarsa',
    'entityKind' => 'Driver',
    'entityId' => 123,
    'entityRef' => 'Budi Santoso',
    'link' => '/drivers/123',
    'email' => true,
    'escalate' => false,
    'dedupKey' => 'sim_expiring_driver_123_2025_01',
]);
```

## Frontend Route

**URL**: `/ews-history`

**Permission Required**: `user.manage` (Admin only)

## Components

### Frontend
- `ews-history.component.ts` - Main component with signals
- `ews-history.component.html` - Template
- `ews-history.component.scss` - Styles
- `ews-history.ts` (models) - TypeScript interfaces

### Backend
- `EarlyWarningController::history()` - Main endpoint
- `NotificationService::dispatch()` - Enhanced to support EWS fields
- Migration: `2025_01_16_000001_enhance_notifications_for_ews.php`

## Migration Steps

1. Run migration:
```bash
php artisan migrate
```

2. Update existing notifications (if needed):
```sql
-- Example: Update existing notifications with trigger_kind
UPDATE notifications 
SET trigger_kind = 'service_due_km',
    trigger_label = 'Servis Jatuh Tempo (KM)'
WHERE title LIKE '%servis%' AND title LIKE '%km%';
```

## Future Enhancements

1. **Export Functions**
   - Excel export with PHPSpreadsheet
   - PDF export with DomPDF

2. **Real-time Updates**
   - WebSocket integration for live notifications
   - Auto-refresh dashboard

3. **Advanced Analytics**
   - Prediction models for recurring issues
   - Entity-specific dashboards
   - Custom report builder

4. **Email Digest**
   - Daily/weekly summary reports
   - Scheduled email digests for admins

## Testing

### Frontend
```bash
cd sikep-kendi-web
npm run dev
# Navigate to http://localhost:4200/ews-history
```

### Backend
```bash
cd sikep-kendi-laravel
php artisan serve
# Test endpoint: GET http://localhost:8000/api/admin/ews-history
```

## Permissions

Only users with `user.manage` permission can access EWS History dashboard.

## Notes

- All EWS notifications should have `trigger_kind` set
- Use `dedup_key` to prevent duplicate notifications within 24 hours
- Escalated notifications have `escalated_at` timestamp
- Channels sent are stored as JSON array: `["IN_APP", "EMAIL"]`
