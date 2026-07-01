import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RuoloUtente } from '../models/auth.model';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const loginTree = {} as UrlTree;
  const richiesteTree = {} as UrlTree;

  const authServiceMock: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    hasAnyRole: ReturnType<typeof vi.fn>;
  } = {
    isAuthenticated: vi.fn(),
    hasAnyRole: vi.fn()
  };

  const routerMock = {
    createUrlTree: vi.fn((commands: string[]) => {
      if (commands[0] === '/login') {
        return loginTree;
      }

      return richiesteTree;
    })
  } as unknown as Router;

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });
  });

  it('redirects to login if the user is not authenticated', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result).toBe(loginTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
  });

  it('allows ADMIN when a role is required', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.hasAnyRole.mockReturnValue(true);

    const route = { data: { requiredRole: 'OPERATORE' satisfies RuoloUtente } } as never;
    const result = TestBed.runInInjectionContext(() => authGuard(route, {} as never));

    expect(result).toBe(true);
    expect(authServiceMock.hasAnyRole).toHaveBeenCalledWith(['OPERATORE', 'ADMIN']);
  });

  it('redirects to requests list when role is missing', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.hasAnyRole.mockReturnValue(false);

    const route = { data: { requiredRole: 'RESPONSABILE' satisfies RuoloUtente } } as never;
    const result = TestBed.runInInjectionContext(() => authGuard(route, {} as never));

    expect(result).toBe(richiesteTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/richieste']);
  });
});


