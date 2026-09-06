import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { PageHeaderComponent } from '@core/layout';
import { AdminDataPort } from '@core/data-access/ports/admin-data.port';
import type {
  EwsHistoryFilter,
  EwsHistoryItem,
  EwsStatistics,
  EwsTrendData,
  Severity,
  TriggerKind,
} from '@shared/models';
import { TRIGGER_KIND_LABELS, ENTITY_KIND_LABELS } from '@shared/models';
import { DatePickerModule } from 'primeng/datepicker';

interface SelectOption<T = string> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-ews-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    DatePickerModule,
    CardModule,
    ChartModule,
    SelectModule,
    TableModule,
    TagModule,
    TooltipModule,
    ProgressSpinnerModule,
    PageHeaderComponent,
  ],
  templateUrl: './ews-history.component.html',
  styleUrls: ['./ews-history.component.scss'],
})
export class EwsHistoryComponent implements OnInit {
  private readonly adminPort = inject(AdminDataPort);

  protected readonly items = signal<EwsHistoryItem[]>([]);
  protected readonly statistics = signal<EwsStatistics | null>(null);
  protected readonly trends = signal<EwsTrendData[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  // Filter signals
  protected readonly startDate = signal<Date | null>(null);
  protected readonly endDate = signal<Date | null>(null);
  protected readonly selectedTrigger = signal<TriggerKind | 'all'>('all');
  protected readonly selectedSeverity = signal<Severity | 'all'>('all');
  protected readonly selectedEntity = signal<string>('all');
  protected readonly selectedStatus = signal<'read' | 'unread' | 'all'>('all');

  // Pagination
  protected readonly currentPage = signal(1);
  protected readonly perPage = signal(50);
  protected readonly totalPages = signal(0);
  protected readonly totalItems = signal(0);

  // Options for dropdowns
  protected readonly triggerOptions: SelectOption<TriggerKind | 'all'>[] = [
    { label: 'Semua Trigger', value: 'all' },
    ...Object.entries(TRIGGER_KIND_LABELS).map(([key, label]) => ({
      label,
      value: key as TriggerKind,
    })),
  ];

  protected readonly severityOptions: SelectOption<Severity | 'all'>[] = [
    { label: 'Semua Severity', value: 'all' },
    { label: 'Kritis', value: 'critical' },
    { label: 'Peringatan', value: 'warning' },
    { label: 'Info', value: 'info' },
  ];

  protected readonly entityOptions: SelectOption[] = [
    { label: 'Semua Entitas', value: 'all' },
    ...Object.entries(ENTITY_KIND_LABELS).map(([key, label]) => ({
      label,
      value: key,
    })),
  ];

  protected readonly statusOptions: SelectOption[] = [
    { label: 'Semua Status', value: 'all' },
    { label: 'Belum Dibaca', value: 'unread' },
    { label: 'Sudah Dibaca', value: 'read' },
  ];

  // Chart data
  protected readonly trendChartData = computed(() => {
    const trendsData = this.trends();
    if (!trendsData.length) return null;

    return {
      labels: trendsData.map((t) => this.formatDate(t.date)),
      datasets: [
        {
          label: 'Kritis',
          data: trendsData.map((t) => t.critical),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Peringatan',
          data: trendsData.map((t) => t.warning),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Info',
          data: trendsData.map((t) => t.info),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
        },
      ],
    };
  });

  protected readonly chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Trend Notifikasi EWS (30 Hari Terakhir)',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  ngOnInit() {
    this.loadData();
  }

  protected loadData() {
    this.loading.set(true);
    this.error.set(null);

    const filter: EwsHistoryFilter = {
      startDate: this.startDate() ? this.formatDateToString(this.startDate()!) : null,
      endDate: this.endDate() ? this.formatDateToString(this.endDate()!) : null,
      triggerKind: this.selectedTrigger(),
      severity: this.selectedSeverity(),
      entityKind: this.selectedEntity(),
      status: this.selectedStatus(),
    };

    this.adminPort.getEwsHistory(filter, this.currentPage(), this.perPage()).subscribe({
      next: (response) => {
        console.log('EWS History Response:', response);
        
        this.items.set(response.data || []);
        this.statistics.set(response.statistics || {} as EwsStatistics);
        this.trends.set(response.trends || []);
        this.totalItems.set(response.total || 0);
        this.totalPages.set(response.totalPages || 0);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('EWS History Error:', err);
        this.error.set(err.message || 'Gagal memuat data EWS History');
        this.loading.set(false);
      },
    });
  }

  protected applyFilter() {
    this.currentPage.set(1);
    this.loadData();
  }

  protected resetFilter() {
    this.startDate.set(null);
    this.endDate.set(null);
    this.selectedTrigger.set('all');
    this.selectedSeverity.set('all');
    this.selectedEntity.set('all');
    this.selectedStatus.set('all');
    this.currentPage.set(1);
    this.loadData();
  }

  protected onPageChange(page: number) {
    this.currentPage.set(page);
    this.loadData();
  }

  protected severityLabel(severity: Severity): string {
    const labels: Record<Severity, string> = {
      critical: 'Kritis',
      warning: 'Peringatan',
      info: 'Info',
    };
    return labels[severity];
  }

  protected severityTagSeverity(severity: Severity): 'danger' | 'warn' | 'info' {
    const map: Record<Severity, 'danger' | 'warn' | 'info'> = {
      critical: 'danger',
      warning: 'warn',
      info: 'info',
    };
    return map[severity];
  }

  protected triggerLabel(kind: TriggerKind): string {
    return TRIGGER_KIND_LABELS[kind] || kind;
  }

  protected entityLabel(kind: string | null): string {
    if (!kind) return '—';
    return ENTITY_KIND_LABELS[kind] || kind;
  }

  protected formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
    });
  }

  private formatDateToString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  protected exportExcel() {
    // TODO: Implement Excel export
    alert('Fitur export Excel akan segera ditambahkan');
  }

  protected exportPdf() {
    // TODO: Implement PDF export
    alert('Fitur export PDF akan segera ditambahkan');
  }
}
