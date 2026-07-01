export type RuoloUtente = 'OPERATORE' | 'RESPONSABILE' | 'ADMIN';

export interface SessionUser {
  username: string;
  roles: RuoloUtente[];
  authToken: string;
}

