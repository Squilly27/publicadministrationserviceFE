# Gestione richieste di accesso agli atti - Frontend Angular

Frontend Angular per la prova tecnica in ambito Pubblica Amministrazione.

## Funzionalita implementate (versione base)

- login operatori con autenticazione JWT verso backend
- elenco richieste con filtri (stato, protocollo, richiedente, date) e paginazione
- dettaglio richiesta
- form creazione e modifica richiesta
- cambio stato con workflow client-side coerente con la traccia
- sezione allegati con upload/download
- sezione storico stati
- gestione errori HTTP e redirect su `401`

## Prerequisiti

- Node.js 20+
- npm
- backend Spring Boot in esecuzione (default dev: `http://localhost:8081`)

## Avvio locale

Il frontend usa `proxy.conf.json` per inoltrare le chiamate `/api` al backend locale.

```powershell
npm install
npm start
```

Apri `http://localhost:4200`.

## Endpoint backend attesi

Configurati in `src/app/core/config/api.config.ts`:

- `POST /api/auth/login`
- `GET /api/richieste`
- `GET /api/richieste/{id}`
- `POST /api/richieste`
- `PUT /api/richieste/{id}`
- `POST /api/richieste/{id}/cambio-stato`
- `GET /api/richieste/{id}/allegati`
- `POST /api/richieste/{id}/allegati`
- `GET /api/richieste/{id}/allegati/{allegatoId}/download`

Nota: lo storico stati viene letto dal dettaglio richiesta (`GET /api/richieste/{id}`) nel campo `storico`.

## Test e build

```powershell
npm test
npm run build
```

## Note di integrazione

- il frontend assume ruoli normalizzati `OPERATORE` e `RESPONSABILE`
- dopo il login il token JWT viene inviato come header `Authorization: Bearer <token>`
- i filtri lista usano query param backend `stato`, `numeroProtocollo`, `cognomeRichiedente`, `page`, `size`, `sort`
- il workflow stati lato UI e in `src/app/core/utils/workflow.util.ts`
- se il backend espone path diversi, aggiorna `src/app/core/config/api.config.ts`
