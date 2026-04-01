import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';

import { GatewayService } from '../../services/gateway.service';
import { AuthService } from '../../services/auth.service';
import {
  AuditEntry,
  AuditStats,
  AuditLogResponse,
} from '../../models/safety.models';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('150ms ease-out', style({ opacity: 1 })),
      ]),
    ]),
  ],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-white">Audit Log</h1>
          <p class="mt-1 text-sm text-gray-400">
            Full trace of every request through the safety gateway.
          </p>
        </div>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2 text-xs text-gray-500">
            @if (refreshing()) {
              <svg class="h-3 w-3 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            }
            Auto-refresh 30s
          </div>
          <!-- User info + logout -->
          <div class="flex items-center gap-2">
            @if (currentUser()) {
              <span class="text-xs text-gray-400">{{ currentUser()!.username }}</span>
            }
            <button
              (click)="logout()"
              class="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-gray-500 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <!-- Stats cards -->
      @if (stats(); as s) {
        <div @fadeIn class="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div class="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <p class="text-xs text-gray-500">Total Requests</p>
            <p class="mt-1 text-2xl font-bold text-white">{{ s.total_requests }}</p>
          </div>
          <div class="rounded-xl border border-red-900 bg-gray-900 p-4">
            <p class="text-xs text-gray-500">Block Rate</p>
            <p class="mt-1 text-2xl font-bold text-red-400">
              {{ (s.block_rate * 100).toFixed(1) }}%
            </p>
          </div>
          <div class="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <p class="text-xs text-gray-500">Top Category</p>
            <p class="mt-1 truncate text-base font-bold text-orange-400">
              {{ s.top_categories[0]?.name ?? '—' }}
            </p>
          </div>
          <div class="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <p class="text-xs text-gray-500">Avg Risk Score</p>
            <p class="mt-1 text-2xl font-bold text-yellow-400">
              {{ (s.avg_risk_score * 100).toFixed(1) }}%
            </p>
          </div>
        </div>
      }

      <!-- Filter bar -->
      <div class="flex items-center gap-2">
        @for (v of verdictFilters; track v) {
          <button
            (click)="setFilter(v)"
            class="rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors"
            [class]="filterButtonClass(v)"
          >
            {{ v }}
          </button>
        }
        <span class="ml-auto text-xs text-gray-500">
          {{ logData()?.total ?? 0 }} entries
        </span>
      </div>

      <!-- Table -->
      <div class="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        @if (isLoading()) {
          <div class="flex items-center justify-center p-12">
            <svg class="h-6 w-6 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        } @else if (entries().length === 0) {
          <div class="p-12 text-center text-gray-500">
            No entries yet. Submit some prompts in the Chat view.
          </div>
        } @else {
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-800 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th class="px-4 py-3">Time</th>
                <th class="px-4 py-3">Verdict</th>
                <th class="px-4 py-3">Risk</th>
                <th class="hidden px-4 py-3 md:table-cell">Categories</th>
                <th class="px-4 py-3">Prompt</th>
                <th class="hidden px-4 py-3 sm:table-cell">ms</th>
              </tr>
            </thead>
            <tbody>
              @for (entry of entries(); track entry.id) {
                <tr
                  @fadeIn
                  class="border-b border-gray-800/50 transition-colors hover:bg-gray-800/40"
                >
                  <td class="px-4 py-3 text-xs text-gray-400">
                    {{ formatTime(entry.timestamp) }}
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      [class]="verdictBadgeClass(entry.verdict)"
                    >
                      {{ entry.verdict }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <div class="w-16 overflow-hidden rounded-full bg-gray-800">
                        <div
                          class="h-1.5 rounded-full transition-all"
                          [class]="riskBarClass(entry.risk_score)"
                          [style.width.%]="entry.risk_score * 100"
                        ></div>
                      </div>
                      <span class="text-xs text-gray-400">
                        {{ (entry.risk_score * 100).toFixed(0) }}%
                      </span>
                    </div>
                  </td>
                  <td class="hidden px-4 py-3 md:table-cell">
                    <div class="flex flex-wrap gap-1">
                      @for (cat of triggeredCats(entry); track cat) {
                        <span class="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-orange-400">
                          {{ cat }}
                        </span>
                      }
                    </div>
                  </td>
                  <td class="max-w-xs px-4 py-3">
                    <span class="truncate block text-xs text-gray-300" [title]="entry.original_prompt">
                      {{ truncate(entry.original_prompt, 60) }}
                    </span>
                  </td>
                  <td class="hidden px-4 py-3 text-xs text-gray-500 sm:table-cell">
                    {{ entry.processing_time_ms }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <!-- Pagination -->
      @if ((logData()?.total ?? 0) > pageSize) {
        <div class="flex items-center justify-center gap-3">
          <button
            (click)="prevPage()"
            [disabled]="currentPage() === 1"
            class="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-gray-600 hover:text-white disabled:opacity-40"
          >
            Previous
          </button>
          <span class="text-xs text-gray-500">
            Page {{ currentPage() }} of {{ totalPages() }}
          </span>
          <button
            (click)="nextPage()"
            [disabled]="currentPage() >= totalPages()"
            class="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-gray-600 hover:text-white disabled:opacity-40"
          >
            Next
          </button>
        </div>
      }
    </div>
  `,
})
export class AdminComponent implements OnInit, OnDestroy {
  private gateway = inject(GatewayService);
  private auth = inject(AuthService);

  currentUser = this.auth.currentUser;

  stats = signal<AuditStats | null>(null);
  logData = signal<AuditLogResponse | null>(null);
  isLoading = signal(false);
  refreshing = signal(false);
  filter = signal<string>('ALL');
  currentPage = signal(1);
  pageSize = 20;

  entries = computed(() => this.logData()?.entries ?? []);
  totalPages = computed(() =>
    Math.max(1, Math.ceil((this.logData()?.total ?? 0) / this.pageSize)),
  );

  verdictFilters = ['ALL', 'ALLOW', 'REWRITE', 'BLOCK'];
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.load();
    this.refreshTimer = setInterval(() => this.refresh(), 30_000);
  }

  ngOnDestroy() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  logout(): void {
    this.auth.logout();
  }

  private load() {
    this.isLoading.set(true);
    this.gateway.getAuditStats().subscribe({
      next: (s) => this.stats.set(s),
      error: () => {},
    });
    this.fetchLog();
  }

  private refresh() {
    this.refreshing.set(true);
    this.gateway.getAuditStats().subscribe({
      next: (s) => this.stats.set(s),
      error: () => {},
    });
    this.gateway
      .getAuditLog(
        this.currentPage(),
        this.pageSize,
        this.filter() !== 'ALL' ? this.filter() : undefined,
      )
      .subscribe({
        next: (d) => {
          this.logData.set(d);
          this.refreshing.set(false);
        },
        error: () => this.refreshing.set(false),
      });
  }

  private fetchLog() {
    this.isLoading.set(true);
    this.gateway
      .getAuditLog(
        this.currentPage(),
        this.pageSize,
        this.filter() !== 'ALL' ? this.filter() : undefined,
      )
      .subscribe({
        next: (d) => {
          this.logData.set(d);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
  }

  setFilter(v: string) {
    this.filter.set(v);
    this.currentPage.set(1);
    this.fetchLog();
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.fetchLog();
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.fetchLog();
    }
  }

  filterButtonClass(v: string): string {
    const active = this.filter() === v;
    if (active) {
      const map: Record<string, string> = {
        ALL: 'bg-indigo-600 text-white',
        ALLOW: 'bg-green-700 text-white',
        REWRITE: 'bg-yellow-700 text-white',
        BLOCK: 'bg-red-700 text-white',
      };
      return map[v] ?? 'bg-gray-700 text-white';
    }
    return 'border border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white';
  }

  verdictBadgeClass(v: string): string {
    if (v === 'ALLOW') return 'bg-green-900 text-green-300';
    if (v === 'REWRITE') return 'bg-yellow-900 text-yellow-300';
    if (v === 'BLOCK') return 'bg-red-900 text-red-300';
    return 'bg-gray-800 text-gray-300';
  }

  riskBarClass(score: number): string {
    if (score >= 0.8) return 'bg-red-500';
    if (score >= 0.5) return 'bg-yellow-500';
    return 'bg-green-500';
  }

  triggeredCats(entry: AuditEntry): string[] {
    try {
      const cats = JSON.parse(entry.categories_triggered) as Array<{
        name: string;
        triggered: boolean;
      }>;
      return cats.filter((c) => c.triggered).map((c) => c.name);
    } catch {
      return [];
    }
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  truncate(s: string, n: number): string {
    return s.length > n ? s.slice(0, n) + '…' : s;
  }
}
