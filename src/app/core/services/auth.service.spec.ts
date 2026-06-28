import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('mappa ruolo in roles e salva la sessione JWT', async () => {
    const sessionPromise = firstValueFrom(service.login('operatore1', 'password123'));

    const request = httpMock.expectOne('/api/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ username: 'operatore1', password: 'password123' });

    request.flush({
      token: 'jwt-token-1',
      username: 'operatore1',
      ruolo: 'OPERATORE'
    });

    const session = await sessionPromise;

    expect(session.username).toBe('operatore1');
    expect(session.roles).toEqual(['OPERATORE']);
    expect(session.authToken).toBe('jwt-token-1');
    expect(localStorage.getItem('pa-session')).toContain('jwt-token-1');
  });

  it('mappa roles con prefisso ROLE_', async () => {
    const sessionPromise = firstValueFrom(service.login('responsabile1', 'password123'));

    const request = httpMock.expectOne('/api/auth/login');
    request.flush({
      token: 'jwt-token-2',
      username: 'responsabile1',
      roles: ['ROLE_RESPONSABILE', 'ROLE_NON_VALIDO']
    });

    const session = await sessionPromise;

    expect(session.roles).toEqual(['RESPONSABILE']);
  });

  it('mappa authorities come fallback', async () => {
    const sessionPromise = firstValueFrom(service.login('operatore1', 'password123'));

    const request = httpMock.expectOne('/api/auth/login');
    request.flush({
      token: 'jwt-token-3',
      username: 'operatore1',
      authorities: ['ROLE_OPERATORE']
    });

    const session = await sessionPromise;

    expect(session.roles).toEqual(['OPERATORE']);
  });
});

