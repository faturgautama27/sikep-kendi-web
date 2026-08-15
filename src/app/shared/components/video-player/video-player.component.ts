import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Reusable video player component for displaying uploaded videos.
 * Supports mp4, mov, avi, 3gp, mkv via HTML5 <video> element.
 */
@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative rounded-lg overflow-hidden bg-black">
      <video
        [src]="src()"
        [controls]="controls()"
        [muted]="muted()"
        [autoplay]="false"
        preload="metadata"
        [class]="styleClass()"
        (error)="onError()"
      >
        Browser Anda tidak mendukung pemutaran video.
      </video>
      @if (hasError) {
        <div class="absolute inset-0 flex items-center justify-center bg-slate-100">
          <div class="text-center text-slate-400">
            <i class="pi pi-video text-3xl block mb-2"></i>
            <p class="text-xs">Video tidak dapat diputar</p>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoPlayerComponent {
  readonly src = input.required<string>();
  readonly controls = input<boolean>(true);
  readonly muted = input<boolean>(false);
  readonly styleClass = input<string>('w-full max-h-96 object-contain');

  protected hasError = false;

  protected onError(): void {
    this.hasError = true;
  }
}
