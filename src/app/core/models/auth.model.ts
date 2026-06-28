export type RuoloUtente = 'OPERATORE' | 'RESPONSABILE';

export interface SessionUser {
  username: string;
  roles: RuoloUtente[];
  authToken: string;
}

