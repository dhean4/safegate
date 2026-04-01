import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div class="w-full max-w-sm">
        <!-- Logo -->
        <div class="mb-8 text-center">
          <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
            <svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 01.39 17.04c3.18 1.254 6.572 1.748 9.61.946a11.935 11.935 0 006.498-3.33 11.942 11.942 0 003.3-6.5A11.96 11.96 0 0117.04.39 11.96 11.96 0 009 1.964z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-white">SafeGate Admin</h1>
          <p class="mt-1 text-sm text-gray-500">Sign in to access the audit dashboard</p>
        </div>

        <!-- Card -->
        <div class="rounded-2xl border border-gray-800 bg-gray-900 p-8">
          <!-- Error -->
          @if (error()) {
            <div class="mb-5 rounded-lg border border-red-800 bg-red-900/40 px-4 py-3 text-sm text-red-400">
              {{ error() }}
            </div>
          }

          <form (ngSubmit)="submit()">
            <div class="space-y-4">
              <div>
                <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Username
                </label>
                <input
                  type="text"
                  [(ngModel)]="username"
                  name="username"
                  autocomplete="username"
                  required
                  class="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="admin"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Password
                </label>
                <input
                  type="password"
                  [(ngModel)]="password"
                  name="password"
                  autocomplete="current-password"
                  required
                  class="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              [disabled]="isLoading()"
              class="mt-6 flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
            >
              @if (isLoading()) {
                <svg class="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Signing in…
              } @else {
                Sign in
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  isLoading = signal(false);
  error = signal<string | null>(null);

  submit(): void {
    if (!this.username || !this.password) return;
    this.isLoading.set(true);
    this.error.set(null);

    this.auth.login(this.username, this.password).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/admin']);
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err?.error?.detail ?? 'Invalid username or password';
        this.error.set(msg);
      },
    });
  }
}
