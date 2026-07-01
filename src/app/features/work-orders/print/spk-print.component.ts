import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { WORKORDER_DATA } from '@core/data-access/ports/work-order-data.port';
import { WorkOrder } from '@shared/models';

@Component({
  selector: 'app-spk-print',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spk-print.component.html',
  styleUrls: ['./print.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpkPrintComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private dataPort = inject(WORKORDER_DATA);

  protected readonly wo = signal<WorkOrder | null>(null);
  protected readonly printDate = new Date();

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.dataPort.getById(id).subscribe(res => {
        this.wo.set(res);
        setTimeout(() => window.print(), 500); // Auto print after rendering
      });
    }
  }

  protected goBack() {
    window.history.back();
  }
}
