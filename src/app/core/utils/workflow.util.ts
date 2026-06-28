import { StatoRichiesta } from '../models/request.model';

const WORKFLOW_MAP: Record<StatoRichiesta, StatoRichiesta[]> = {
  PRESENTATA: ['IN_ISTRUTTORIA'],
  IN_ISTRUTTORIA: ['RICHIESTA_INTEGRAZIONE', 'ACCOLTA', 'RESPINTA'],
  RICHIESTA_INTEGRAZIONE: ['IN_ISTRUTTORIA', 'RESPINTA'],
  ACCOLTA: ['CHIUSA'],
  RESPINTA: ['CHIUSA'],
  CHIUSA: []
};

export function getAllowedTransitions(stato: StatoRichiesta): StatoRichiesta[] {
  return WORKFLOW_MAP[stato];
}

export interface StatoBadge {
  label: string;
  color: string;
  background: string;
}

const STATO_BADGE_MAP: Record<StatoRichiesta, StatoBadge> = {
  PRESENTATA:             { label: 'Presentata',             color: '#1e40af', background: '#dbeafe' },
  IN_ISTRUTTORIA:         { label: 'In istruttoria',         color: '#92400e', background: '#fef3c7' },
  RICHIESTA_INTEGRAZIONE: { label: 'Integrazione richiesta', color: '#7c3aed', background: '#ede9fe' },
  ACCOLTA:                { label: 'Accolta',                color: '#065f46', background: '#d1fae5' },
  RESPINTA:               { label: 'Respinta',               color: '#991b1b', background: '#fee2e2' },
  CHIUSA:                 { label: 'Chiusa',                 color: '#374151', background: '#f3f4f6' }
};

export function getStatoBadge(stato: StatoRichiesta): StatoBadge {
  return STATO_BADGE_MAP[stato];
}

export function getAllowedTransitionsForRole(
  stato: StatoRichiesta,
  isResponsabile: boolean
): StatoRichiesta[] {
  const baseTransitions = getAllowedTransitions(stato);
  if (!isResponsabile || stato !== 'PRESENTATA') {
    return baseTransitions;
  }

  return ['IN_ISTRUTTORIA', ...WORKFLOW_MAP.IN_ISTRUTTORIA];
}

