# Gestione richieste di accesso agli atti - Frontend Angular

Guida completa del frontend Angular per la gestione di richieste di accesso agli atti.

## 1) Obiettivo del servizio

Questa applicazione permette di:

- autenticare utenti con JWT
- consultare l'elenco richieste con filtri e paginazione
- creare e modificare richieste
- gestire il workflow degli stati
- caricare/scaricare allegati
- consultare lo storico cambi stato

Il frontend e progettato per parlare con backend Spring Boot esposto sotto `/api`.

## 2) Stack tecnico

- Angular 22 (standalone components, signals, computed)
- RxJS 7
- HTTP Interceptors per token e gestione errori globali
- Vitest + TestBed Angular per unit test

Riferimenti principali:

- `src/main.ts`
- `src/app/app.config.ts`
- `package.json`

## 3) Architettura applicativa

### Core

- `src/app/core/models`: tipi e interfacce dati
- `src/app/core/services`: servizi HTTP e sessione auth
- `src/app/core/guards`: protezione route
- `src/app/core/interceptors`: Bearer token + gestione 401
- `src/app/core/utils`: regole workflow e badge stato

### Features

- `src/app/features/auth/login-page.component.ts`
- `src/app/features/requests/request-list-page.component.ts`
- `src/app/features/requests/request-form-page.component.ts`
- `src/app/features/requests/request-detail-page.component.ts`

### Shell app

- `src/app/app.ts`
- `src/app/app.html`
- `src/app/app.routes.ts`

## 4) Routing e navigazione

Definito in `src/app/app.routes.ts`.

- `/login`: pagina login (pubblica)
- `/richieste`: lista richieste (autenticato)
- `/richieste/nuova`: nuova richiesta (autenticato + ruolo OPERATORE o ADMIN)
- `/richieste/:id/modifica`: modifica richiesta (autenticato + ruolo OPERATORE o ADMIN)
- `/richieste/:id`: dettaglio richiesta (autenticato)
- fallback: redirect a `/richieste`

Il controllo accessi route avviene in `src/app/core/guards/auth.guard.ts`.

## 5) Autenticazione e sessione

Gestita da `src/app/core/services/auth.service.ts`.

Flusso login:

1. submit credenziali in `login-page.component.ts`
2. `POST /api/auth/login`
3. mapping ruoli backend in frontend
4. salvataggio sessione in localStorage
5. redirect su `/richieste`

Formato sessione (`SessionUser`):

- `username`
- `roles`
- `authToken`

Storage key:

- localStorage: `pa-session`

Ruoli supportati:

- `OPERATORE`
- `RESPONSABILE`
- `ADMIN`

## 6) Autorizzazione (chi puo fare cosa)

Controlli principali:

- route-level: `auth.guard.ts` con `requiredRole`
- component-level: metodi `hasRole` / `hasAnyRole`

Matrice sintetica:

- **OPERATORE**
  - puo creare/modificare richieste
  - puo caricare allegati
  - non puo cambiare stato
- **RESPONSABILE**
  - puo cambiare stato
  - non ha upload allegati nel dettaglio
- **ADMIN**
  - puo accedere alle route protette da `requiredRole`
  - puo creare/modificare richieste
  - puo cambiare stato
  - puo caricare allegati

## 7) Interceptors HTTP

Configurati in `src/app/app.config.ts`.

- `src/app/core/interceptors/basic-auth.interceptor.ts`
  - aggiunge header `Authorization: Bearer <token>` se token presente
- `src/app/core/interceptors/error.interceptor.ts`
  - su `401` esegue logout e redirect a `/login`

## 8) Gestione richieste (feature richieste)

## Lista richieste

File: `src/app/features/requests/request-list-page.component.ts`

Funzioni principali:

- filtri per stato/protocollo/richiedente/date
- paginazione con `page`, `size`, `totalPages`
- visualizzazione badge stato
- link a dettaglio richiesta

## Form richiesta (nuova/modifica)

File: `src/app/features/requests/request-form-page.component.ts`

Funzioni principali:

- modalita create o edit in base alla presenza di `id` in route
- validazioni form (required, email, minLength descrizione)
- submit unico che decide `create` o `update`
- persistenza bozza su sessionStorage in modalita nuova richiesta

Storage key bozza:

- sessionStorage: `pa-new-request-draft`

## Dettaglio richiesta

File: `src/app/features/requests/request-detail-page.component.ts`

Funzioni principali:

- visualizzazione dati principali richiesta
- cambio stato con nota
- gestione allegati (upload/download)
- storico stati

Messaggi errore e permessi sono gestiti localmente nel componente.

## 9) Workflow stati

Definito in `src/app/core/utils/workflow.util.ts`.

Transizioni base:

- `PRESENTATA -> IN_ISTRUTTORIA`
- `IN_ISTRUTTORIA -> RICHIESTA_INTEGRAZIONE | ACCOLTA | RESPINTA`
- `RICHIESTA_INTEGRAZIONE -> IN_ISTRUTTORIA | RESPINTA`
- `ACCOLTA -> CHIUSA`
- `RESPINTA -> CHIUSA`

Regola ruolo:

- per profilo autorizzato al cambio stato (RESPONSABILE/ADMIN), da `PRESENTATA` possono comparire anche transizioni avanzate.

Compatibilita backend:

- nel dettaglio richiesta esiste una logica che, se necessario, forza passaggio intermedio a `IN_ISTRUTTORIA` prima dello stato finale.

## 10) Modelli dati principali

File: `src/app/core/models/request.model.ts`, `src/app/core/models/auth.model.ts`.

Tipi chiave:

- `RuoloUtente`
- `SessionUser`
- `StatoRichiesta`
- `RichiestaAccessoAtti`
- `RichiestaPayload`
- `CambioStatoPayload`
- `Allegato`
- `StoricoStato`
- `RichiestaFilter`
- `PagedResult<T>`

## 11) API backend attese

Configurazione base in `src/app/core/config/api.config.ts`:

- `baseUrl: /api`
- `authLoginPath: /auth/login`
- `richiestePath: /richieste`

Endpoint usati dal frontend:

- `POST /api/auth/login`
- `GET /api/richieste`
- `GET /api/richieste/{id}`
- `POST /api/richieste`
- `PUT /api/richieste/{id}`
- `POST /api/richieste/{id}/cambio-stato`
- `GET /api/richieste/{id}/allegati`
- `POST /api/richieste/{id}/allegati`
- `GET /api/richieste/{id}/allegati/{allegatoId}/download`

Nota: lo storico e ottenuto dal dettaglio richiesta.

## 12) Configurazione ambiente locale

Prerequisiti:

- Node.js 20+
- npm
- backend avviato (default: `http://localhost:8081`)

Proxy dev (`proxy.conf.json`): inoltra `/api` al backend locale.

Avvio:

```powershell
npm install
npm start
```

Applicazione disponibile su `http://localhost:4200`.

## 13) Script disponibili

Da `package.json`:

- `npm start`: avvio dev server
- `npm run build`: build produzione
- `npm run watch`: build in watch mode
- `npm test`: test unitari

## 14) Test presenti

- `src/app/core/services/auth.service.spec.ts`
  - login, mapping ruoli, supporto `ADMIN`, helper ruoli
- `src/app/core/guards/auth.guard.spec.ts`
  - redirect non autenticato, bypass admin, deny ruoli mancanti
- `src/app/core/utils/workflow.util.spec.ts`
  - transizioni workflow
- `src/app/app.spec.ts`
  - smoke test shell applicativa

Esecuzione:

```powershell
npm test -- --watch=false
```

## 15) Error handling e fallback

- `401`: logout + redirect login (interceptor globale)
- login con `status 0`: messaggio backend non raggiungibile
- parsing JSON sessione/bozza non valido: pulizia storage e fallback sicuro
- errori API nei componenti: messaggio backend se presente, altrimenti fallback locale

## 16) Punti di estensione consigliati

- aggiungere test su `RequestService` e componenti requests/login
- centralizzare testi UI in costanti/i18n
- aggiungere spinner globali e notifica toast unificata
- introdurre policy lato UI piu granulare (claim/permessi)

## 17) Quick checklist operativa

- backend avviato su `:8081`
- login riuscito e token in localStorage (`pa-session`)
- filtri lista funzionanti
- create/edit operativi
- cambio stato secondo workflow
- upload/download allegati operativo
- gestione 401 verificata
