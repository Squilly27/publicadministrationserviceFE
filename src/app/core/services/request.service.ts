import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import {
  Allegato,
  CambioStatoPayload,
  PagedResult,
  RichiestaAccessoAtti,
  RichiestaFilter,
  RichiestaPayload,
  StoricoStato
} from '../models/request.model';

@Injectable({ providedIn: 'root' })
export class RequestService {
  private readonly http = inject(HttpClient);
  private readonly basePath = `${API_CONFIG.baseUrl}${API_CONFIG.richiestePath}`;

  private typeSafeStoricoFromDettaglio(
    response: RichiestaAccessoAtti & { storico?: Array<StoricoStato & { utenteCambio?: string }> }
  ): StoricoStato[] {
    return (response.storico ?? []).map((item) => ({
      ...item,
      utente: item.utente ?? item.utenteCambio ?? '-'
    }));
  }

  list(filter: RichiestaFilter): Observable<PagedResult<RichiestaAccessoAtti>> {
    let params = new HttpParams()
      .set('page', filter.page)
      .set('size', filter.size)
      .set('sort', 'id,desc');

    if (filter.stato) params = params.set('stato', filter.stato);
    if (filter.protocollo) params = params.set('numeroProtocollo', filter.protocollo.trim());
    if (filter.richiedente) params = params.set('cognomeRichiedente', filter.richiedente.trim());
    if (filter.fromDate) params = params.set('fromDate', filter.fromDate);
    if (filter.toDate) params = params.set('toDate', filter.toDate);

    return this.http
      .get<PagedResult<RichiestaAccessoAtti> | RichiestaAccessoAtti[]>(this.basePath, {
        params
      })
      .pipe(map((response) => this.normalizePage(response, filter.page, filter.size)));
  }

  getById(id: number): Observable<RichiestaAccessoAtti> {
    return this.http
      .get<RichiestaAccessoAtti>(`${this.basePath}/${id}`)
      .pipe(map((response) => this.normalizeRichiesta(response)));
  }

  create(payload: RichiestaPayload): Observable<RichiestaAccessoAtti | null> {
    return this.http
      .post<RichiestaAccessoAtti | null>(this.basePath, payload)
      .pipe(map((response) => (response ? this.normalizeRichiesta(response) : null)));
  }

  update(id: number, payload: RichiestaPayload): Observable<RichiestaAccessoAtti | null> {
    return this.http
      .put<RichiestaAccessoAtti | null>(`${this.basePath}/${id}`, payload)
      .pipe(map((response) => (response ? this.normalizeRichiesta(response) : null)));
  }

  changeState(id: number, payload: CambioStatoPayload): Observable<RichiestaAccessoAtti> {
    return this.http
      .post<RichiestaAccessoAtti>(`${this.basePath}/${id}/cambio-stato`, payload)
      .pipe(map((response) => this.normalizeRichiesta(response)));
  }

  getStorico(id: number): Observable<StoricoStato[]> {
    return this.http
      .get<RichiestaAccessoAtti & { storico?: Array<StoricoStato & { utenteCambio?: string }> }>(
        `${this.basePath}/${id}`
      )
      .pipe(map((response) => this.typeSafeStoricoFromDettaglio(response)));
  }

  getAllegati(id: number): Observable<Allegato[]> {
    return this.http.get<Allegato[]>(`${this.basePath}/${id}/allegati`);
  }

  uploadAllegato(id: number, file: File): Observable<Allegato> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Allegato>(`${this.basePath}/${id}/allegati`, formData);
  }

  downloadAllegato(id: number, allegatoId: number): Observable<Blob> {
    return this.http.get(`${this.basePath}/${id}/allegati/${allegatoId}/download`, {
      responseType: 'blob'
    });
  }

  private normalizePage(
    response: PagedResult<RichiestaAccessoAtti> | RichiestaAccessoAtti[],
    page: number,
    size: number
  ): PagedResult<RichiestaAccessoAtti> {
    if (Array.isArray(response)) {
      return {
        content: response.map((item) => this.normalizeRichiesta(item)),
        page,
        size,
        totalElements: response.length,
        totalPages: 1
      };
    }

    return {
      ...response,
      content: response.content.map((item) => this.normalizeRichiesta(item))
    };
  }

  private normalizeRichiesta(item: RichiestaAccessoAtti): RichiestaAccessoAtti {
    const nome = item.nomeRichiedente?.trim() ?? '';
    const cognome = item.cognomeRichiedente?.trim() ?? '';
    const richiedente = `${nome} ${cognome}`.trim() || item.richiedente || '-';

    return {
      ...item,
      richiedente
    };
  }
}

