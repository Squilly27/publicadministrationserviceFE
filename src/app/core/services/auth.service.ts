import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { RuoloUtente, SessionUser } from '../models/auth.model';

const STORAGE_KEY = 'pa-session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly sessionState = signal<SessionUser | null>(this.loadSession());

  readonly session = computed(() => this.sessionState());
  readonly isAuthenticated = computed(() => this.sessionState() !== null);

  login(username: string, password: string): Observable<SessionUser> {
    return this.http
      .post<{ token?: string; username?: string; ruolo?: string; roles?: string[]; authorities?: string[] }>(
        `${API_CONFIG.baseUrl}${API_CONFIG.authLoginPath}`,
        { username, password }
      )
      .pipe(
        map((response) => {
          if (!response.token) {
            throw new Error('Token JWT non presente nella risposta di login.');
          }

          const roleSource = response.roles ?? response.authorities ?? (response.ruolo ? [response.ruolo] : []);
          const normalizedRoles = roleSource
            .map((role) => role.replace('ROLE_', ''))
            .filter((role): role is RuoloUtente =>
              role === 'OPERATORE' || role === 'RESPONSABILE' || role === 'ADMIN'
            );

          return {
            username: response.username ?? username,
            roles: normalizedRoles,
            authToken: response.token
          } satisfies SessionUser;
        }),
        tap((session) => this.setSession(session))
      );
  }

  logout(): void {
    this.sessionState.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  hasRole(role: RuoloUtente): boolean {
    return this.sessionState()?.roles.includes(role) ?? false;
  }

  hasAnyRole(roles: RuoloUtente[]): boolean {
    const sessionRoles = this.sessionState()?.roles;
    return roles.some((role) => sessionRoles?.includes(role));
  }

  private setSession(session: SessionUser): void {
    this.sessionState.set(session);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  private loadSession(): SessionUser | null {
    const rawSession = localStorage.getItem(STORAGE_KEY);
    if (!rawSession) {
      return null;
    }

    try {
      return JSON.parse(rawSession) as SessionUser;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }
}

