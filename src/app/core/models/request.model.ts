export type StatoRichiesta =
  | 'PRESENTATA'
  | 'IN_ISTRUTTORIA'
  | 'RICHIESTA_INTEGRAZIONE'
  | 'ACCOLTA'
  | 'RESPINTA'
  | 'CHIUSA';

export interface RichiestaAccessoAtti {
  id: number;
  numeroProtocollo: string;
  richiedente: string;
  nomeRichiedente?: string;
  cognomeRichiedente?: string;
  emailRichiedente?: string;
  telefonoRichiedente?: string;
  oggetto: string;
  descrizione: string;
  stato: StatoRichiesta;
  dataPresentazione?: string;
  dataUltimoAggiornamento?: string;
}

export interface StoricoStato {
  id: number;
  statoPrecedente: StatoRichiesta | null;
  statoNuovo: StatoRichiesta;
  nota?: string;
  utente: string;
  dataCambio: string;
}

export interface Allegato {
  id: number;
  nomeFile: string;
  contentType?: string;
  dimensione?: number;
  dataUpload?: string;
}

export interface RichiestaFilter {
  stato?: StatoRichiesta | '';
  protocollo?: string;
  nomeRichiedente?: string;
  cognomeRichiedente?: string;
  fromDate?: string;
  toDate?: string;
  page: number;
  size: number;
}

export interface PagedResult<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface CambioStatoPayload {
  statoNuovo: StatoRichiesta;
  nota?: string;
}

export interface RichiestaPayload {
  numeroProtocollo: string;
  nomeRichiedente: string;
  cognomeRichiedente: string;
  emailRichiedente: string;
  telefonoRichiedente?: string;
  oggetto: string;
  descrizione: string;
}
