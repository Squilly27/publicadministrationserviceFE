import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
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
    const params = this.buildListParams(filter);

    if (filter.nomeRichiedente?.trim()) {
      return this.listWithClientSideNomeFilter(filter, params);
    }

    return this.getListPage(params, filter.page, filter.size);
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

  private buildListParams(filter: RichiestaFilter): HttpParams {
    let params = new HttpParams().set('sort', 'id,desc');

    if (filter.stato) params = params.set('stato', filter.stato);
    if (filter.protocollo) params = params.set('numeroProtocollo', filter.protocollo.trim());
    if (filter.cognomeRichiedente) {
      params = params.set('cognomeRichiedente', filter.cognomeRichiedente.trim());
    }
    if (filter.fromDate) params = params.set('fromDate', filter.fromDate);
    if (filter.toDate) params = params.set('toDate', filter.toDate);

    return params;
  }

  private getListPage(
    baseParams: HttpParams,
    page: number,
    size: number
  ): Observable<PagedResult<RichiestaAccessoAtti>> {
    const params = baseParams.set('page', page).set('size', size);

    return this.http
      .get<PagedResult<RichiestaAccessoAtti> | RichiestaAccessoAtti[]>(this.basePath, {
        params
      })
      .pipe(map((response) => this.normalizePage(response, page, size)));
  }

  private listWithClientSideNomeFilter(
    filter: RichiestaFilter,
    baseParams: HttpParams
  ): Observable<PagedResult<RichiestaAccessoAtti>> {
    return this.getListPage(baseParams, 0, filter.size).pipe(
      switchMap((firstPage) => {
        if (firstPage.totalPages <= 1) {
          return of([firstPage]);
        }

        const remainingPages = Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
          this.getListPage(baseParams, index + 1, filter.size)
        );

        return forkJoin([of(firstPage), ...remainingPages]);
      }),
      map((pages) => pages.flatMap((page) => page.content)),
      map((items) => this.filterAndPaginateByRichiedente(items, filter))
    );
  }

  private filterAndPaginateByRichiedente(
    items: RichiestaAccessoAtti[],
    filter: RichiestaFilter
  ): PagedResult<RichiestaAccessoAtti> {
    const normalizedNome = filter.nomeRichiedente?.trim().toLocaleLowerCase() ?? '';
    const normalizedCognome = filter.cognomeRichiedente?.trim().toLocaleLowerCase() ?? '';
    const filteredItems = items.filter((item) => {
      const searchableText = this.buildRichiedenteSearchText(item);
      return (
        (!normalizedNome || searchableText.includes(normalizedNome)) &&
        (!normalizedCognome || searchableText.includes(normalizedCognome))
      );
    });
    const totalElements = filteredItems.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / filter.size));
    const startIndex = filter.page * filter.size;

    return {
      content: filteredItems.slice(startIndex, startIndex + filter.size),
      page: filter.page,
      size: filter.size,
      totalElements,
      totalPages
    };
  }

  private buildRichiedenteSearchText(item: RichiestaAccessoAtti): string {
    return [item.nomeRichiedente, item.cognomeRichiedente, item.richiedente]
      .filter((value): value is string => Boolean(value?.trim()))
      .join(' ')
      .trim()
      .toLocaleLowerCase();
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

    const content = Array.isArray(response.content) ? response.content : [];
    const normalizedPage = Number.isFinite(response.page) && response.page >= 0 ? response.page : page;
    const normalizedSize = Number.isFinite(response.size) && response.size > 0 ? response.size : size;
    const normalizedTotalElements =
      Number.isFinite(response.totalElements) && response.totalElements >= 0
        ? response.totalElements
        : content.length;
    const normalizedTotalPages =
      Number.isFinite(response.totalPages) && response.totalPages > 0
        ? response.totalPages
        : Math.max(1, Math.ceil(normalizedTotalElements / normalizedSize));

    return {
      ...response,
      page: normalizedPage,
      size: normalizedSize,
      totalElements: normalizedTotalElements,
      totalPages: normalizedTotalPages,
      content: content.map((item) => this.normalizeRichiesta(item))
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
