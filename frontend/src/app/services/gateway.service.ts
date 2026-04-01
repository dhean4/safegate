import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthService } from './auth.service';
import {
  AnalyzeResponse,
  AuditLogResponse,
  AuditStats,
} from '../models/safety.models';
import { environment } from '../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class GatewayService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  getAuthHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private handle401<T>(source: Observable<T>): Observable<T> {
    return source.pipe(
      catchError((err) => {
        if (err.status === 401) this.auth.logout();
        return throwError(() => err);
      }),
    );
  }

  analyzePrompt(prompt: string): Observable<AnalyzeResponse> {
    return this.http.post<AnalyzeResponse>(`${API_BASE}/api/analyze`, {
      prompt,
    });
  }

  getAuditLog(
    page = 1,
    limit = 20,
    verdict?: string,
  ): Observable<AuditLogResponse> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (verdict && verdict !== 'ALL') {
      params = params.set('verdict', verdict);
    }
    return this.handle401(
      this.http.get<AuditLogResponse>(`${API_BASE}/api/audit`, {
        params,
        headers: this.getAuthHeaders(),
      }),
    );
  }

  getAuditStats(): Observable<AuditStats> {
    return this.handle401(
      this.http.get<AuditStats>(`${API_BASE}/api/audit/stats`, {
        headers: this.getAuthHeaders(),
      }),
    );
  }
}
