import { describe, expect, it } from 'vitest';
import { getAllowedTransitions, getAllowedTransitionsForRole } from './workflow.util';

describe('workflow util', () => {
  it('returns expected transitions for IN_ISTRUTTORIA', () => {
    expect(getAllowedTransitions('IN_ISTRUTTORIA')).toEqual([
      'RICHIESTA_INTEGRAZIONE',
      'ACCOLTA',
      'RESPINTA'
    ]);
  });

  it('returns empty transitions for CHIUSA', () => {
    expect(getAllowedTransitions('CHIUSA')).toEqual([]);
  });

  it('allows RESPONSABILE to advance a PRESENTATA request beyond IN_ISTRUTTORIA', () => {
    expect(getAllowedTransitionsForRole('PRESENTATA', true)).toEqual([
      'IN_ISTRUTTORIA',
      'RICHIESTA_INTEGRAZIONE',
      'ACCOLTA',
      'RESPINTA'
    ]);
  });
});

