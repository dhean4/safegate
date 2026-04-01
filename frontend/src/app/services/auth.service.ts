import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const API_BASE = environment.apiUrl;
const TOKEN_KEY = 'safegate_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private _currentUser = signal<{ username: string } | null>(null);

  isAuthenticated = computed(() => !!this._token());
  currentUser = this._currentUser.asReadonly();

  login(username: string, password: string): Observable<{ access_token: string; token_type: string }> {
    return this.http
      .post<{ access_token: string; token_type: string }>(`${API_BASE}/api/auth/login`, {
        username,
        password,
      })
      .pipe(
        tap((res) => {
          localStorage.setItem(TOKEN_KEY, res.access_token);
          this._token.set(res.access_token);
          this._currentUser.set({ username });
        }),
      );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this._token.set(null);
    this._currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this._token();
  }
}
