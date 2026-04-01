import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen bg-gray-950 text-gray-100">
      <!-- Navigation -->
      <nav class="border-b border-gray-800 bg-gray-900">
        <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div class="flex h-16 items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                <svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 01.39 17.04c3.18 1.254 6.572 1.748 9.61.946a11.935 11.935 0 006.498-3.33 11.942 11.942 0 003.3-6.5A11.96 11.96 0 0117.04.39 11.96 11.96 0 009 1.964z" />
                </svg>
              </div>
              <span class="text-lg font-bold tracking-tight text-white">SafeGate</span>
              <span class="hidden text-xs text-gray-500 sm:block">AI Content Safety Gateway</span>
            </div>
            <div class="flex gap-1">
              <a
                routerLink="/chat"
                routerLinkActive="bg-indigo-600 text-white"
                [routerLinkActiveOptions]="{ exact: false }"
                class="rounded-md px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
              >
                Chat
              </a>
              <a
                routerLink="/admin"
                routerLinkActive="bg-indigo-600 text-white"
                [routerLinkActiveOptions]="{ exact: false }"
                class="rounded-md px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
              >
                Admin
              </a>
            </div>
          </div>
        </div>
      </nav>

      <!-- Page content -->
      <main class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <router-outlet />
      </main>
    </div>
  `,
})
export class App {}
