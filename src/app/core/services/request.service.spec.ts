import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { RequestService } from './request.service';

describe('RequestService', () => {
  let service: RequestService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(RequestService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('filtra lato client per nome richiedente mantenendo gli altri parametri server-side', async () => {
    const pagePromise = firstValueFrom(
      service.list({
        stato: '',
        protocollo: ' PR-001 ',
        nomeRichiedente: ' Mario ',
        cognomeRichiedente: ' Rossi ',
        fromDate: '2026-01-01',
        toDate: '2026-01-31',
        page: 0,
        size: 1
      })
    );

    const request = httpMock.expectOne((req) => req.url === '/api/richieste');

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('numeroProtocollo')).toBe('PR-001');
    expect(request.request.params.get('cognomeRichiedente')).toBe('Rossi');
    expect(request.request.params.get('fromDate')).toBe('2026-01-01');
    expect(request.request.params.get('toDate')).toBe('2026-01-31');
    expect(request.request.params.get('nomeRichiedente')).toBeNull();

    request.flush({
      content: [
        {
          id: 1,
          numeroProtocollo: 'PR-001',
          nomeRichiedente: 'Luigi',
          cognomeRichiedente: 'Rossi',
          richiedente: '',
          oggetto: 'Accesso agli atti',
          descrizione: 'Descrizione',
          stato: 'PRESENTATA'
        }
      ],
      page: 0,
      size: 1,
      totalElements: 2,
      totalPages: 2
    });

    const secondPageRequest = httpMock.expectOne(
      (req) => req.url === '/api/richieste' && req.params.get('page') === '1'
    );

    expect(secondPageRequest.request.params.get('nomeRichiedente')).toBeNull();
    expect(secondPageRequest.request.params.get('cognomeRichiedente')).toBe('Rossi');

    secondPageRequest.flush({
      content: [
        {
          id: 2,
          numeroProtocollo: 'PR-001',
          nomeRichiedente: 'Mario',
          cognomeRichiedente: 'Rossi',
          richiedente: '',
          oggetto: 'Accesso agli atti 2',
          descrizione: 'Descrizione 2',
          stato: 'PRESENTATA'
        }
      ],
      page: 1,
      size: 1,
      totalElements: 2,
      totalPages: 2
    });

    const page = await pagePromise;

    expect(page.totalElements).toBe(1);
    expect(page.content[0]?.richiedente).toBe('Mario Rossi');
  });
});
