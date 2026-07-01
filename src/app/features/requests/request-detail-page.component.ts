import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, switchMap } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { RequestService } from '../../core/services/request.service';
import {
  Allegato,
  RichiestaAccessoAtti,
  StatoRichiesta,
  StoricoStato
} from '../../core/models/request.model';
import { getAllowedTransitionsForRole, getStatoBadge } from '../../core/utils/workflow.util';

@Component({
  selector: 'app-request-detail-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="page-card">
      @if (richiesta(); as data) {
        <div class="title-row">
          <h2>Richiesta #{{ data.id }} - {{ data.numeroProtocollo }}</h2>
          <a [routerLink]="['/richieste', data.id, 'modifica']">Modifica dati</a>
        </div>

        <div class="detail-grid">
          <p><strong>Richiedente:</strong> {{ data.richiedente }}</p>
          <p><strong>Stato:</strong>
            <span
              class="stato-badge"
              [style.color]="statoBadge(data.stato).color"
              [style.background]="statoBadge(data.stato).background"
            >{{ statoBadge(data.stato).label }}</span>
          </p>
          <p><strong>Oggetto:</strong> {{ data.oggetto }}</p>
          <p><strong>Descrizione:</strong> {{ data.descrizione }}</p>
        </div>

        <section class="section-card">
          <h3>Cambio stato</h3>

          @if (canManageState()) {
            <form [formGroup]="stateForm" (ngSubmit)="changeState()" class="state-form">
              <label>
                Nuovo stato
                <select formControlName="statoNuovo">
                  <option value="" disabled>Seleziona stato</option>
                  @for (next of allowedTransitions(); track next) {
                    <option [value]="next">{{ next }}</option>
                  }
                </select>
              </label>

              <label>
                Nota
                <textarea formControlName="nota" rows="3"></textarea>
              </label>

              <button type="submit" [disabled]="stateForm.invalid">Aggiorna stato</button>
            </form>
          } @else {
            <p>Accesso negato: permessi insufficienti per completare questa azione.</p>
          }
        </section>

        <section class="section-card">
          <h3>Allegati</h3>

          @if (canUploadAllegati()) {
            <input type="file" multiple (change)="upload($event)" />
          } @else {
            <p class="hint">Solo OPERATORE o ADMIN puo caricare allegati.</p>
          }

          <table>
            <thead>
              <tr>
                <th>Nome file</th>
                <th>Dimensione</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (allegato of allegati(); track allegato.id) {
                <tr>
                  <td>{{ allegato.nomeFile }}</td>
                  <td>{{ allegato.dimensione ?? '-' }}</td>
                  <td>
                    <button type="button" (click)="download(allegato)">Download</button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="3">Nessun allegato presente.</td>
                </tr>
              }
            </tbody>
          </table>
        </section>

        <section class="section-card">
          <h3>Storico stati</h3>
          <table>
            <thead>
              <tr>
                <th>Da</th>
                <th>A</th>
                <th>Utente</th>
                <th>Data</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
              @for (item of storico(); track item.id) {
                <tr>
                  <td>{{ item.statoPrecedente ?? '-' }}</td>
                  <td>
                    <span
                      class="stato-badge"
                      [style.color]="statoBadge(item.statoNuovo).color"
                      [style.background]="statoBadge(item.statoNuovo).background"
                    >{{ statoBadge(item.statoNuovo).label }}</span>
                  </td>
                  <td>{{ item.utente }}</td>
                  <td>{{ item.dataCambio }}</td>
                  <td>{{ item.nota || '-' }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5">Storico non disponibile.</td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      } @else {
        <p>Caricamento richiesta in corso...</p>
      }

      @if (errorMessage()) {
        <p class="error">{{ errorMessage() }}</p>
      }
    </section>
  `,
  styles: [
    `
      .title-row {
        align-items: center;
        display: flex;
        justify-content: space-between;
      }

      .detail-grid {
        display: grid;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }

      .section-card {
        border-top: 1px solid #e2e8f0;
        margin-top: 1rem;
        padding-top: 1rem;
      }

      .state-form {
        display: grid;
        gap: 0.65rem;
        max-width: 520px;
      }

      label {
        display: grid;
        gap: 0.3rem;
      }

      input,
      select,
      textarea,
      button {
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 0.45rem;
      }

      table {
        border-collapse: collapse;
        margin-top: 0.6rem;
        width: 100%;
      }

      th,
      td {
        border-bottom: 1px solid #e2e8f0;
        padding: 0.5rem;
        text-align: left;
      }

      .error {
        color: #b91c1c;
      }

      .hint {
        color: #64748b;
        font-size: 0.875rem;
        margin: 0.25rem 0 0.75rem;
      }

      .stato-badge {
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.2rem 0.65rem;
        white-space: nowrap;
      }
    `
  ]
})
export class RequestDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly requestService = inject(RequestService);
  private readonly authService = inject(AuthService);

  protected readonly errorMessage = signal('');
  protected readonly richiesta = signal<RichiestaAccessoAtti | null>(null);
  protected readonly storico = signal<StoricoStato[]>([]);
  protected readonly allegati = signal<Allegato[]>([]);
  protected readonly allowedTransitions = signal<StatoRichiesta[]>([]);

  protected readonly stateForm = this.fb.nonNullable.group({
    statoNuovo: ['', Validators.required],
    nota: ['']
  });

  private requestId = 0;

  ngOnInit(): void {
    const rawId = this.route.snapshot.paramMap.get('id');
    const id = Number(rawId);
    if (!rawId || Number.isNaN(id)) {
      this.errorMessage.set('Identificativo richiesta non valido.');
      return;
    }

    this.requestId = id;
    this.loadAll(id);
  }

  protected canManageState(): boolean {
    return this.authService.hasAnyRole(['RESPONSABILE', 'ADMIN']);
  }

  protected canUploadAllegati(): boolean {
    return this.authService.hasAnyRole(['OPERATORE', 'ADMIN']);
  }

  protected statoBadge(stato: StatoRichiesta) {
    return getStatoBadge(stato);
  }

  protected changeState(): void {
    if (this.stateForm.invalid || !this.canManageState()) {
      return;
    }

    const values = this.stateForm.getRawValue();
    const targetState = values.statoNuovo as StatoRichiesta;
    this.changeStateWithWorkflowCompatibility(targetState, values.nota).subscribe({
      next: (updated) => {
        this.richiesta.set(updated);
        this.allowedTransitions.set(this.getAllowedTransitionsForCurrentUser(updated.stato));
        this.stateForm.reset({ statoNuovo: '', nota: '' });
        this.loadStorico(this.requestId);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(error.error?.message ?? 'Cambio stato non riuscito.');
      }
    });
  }

  protected upload(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (!files?.length) {
      return;
    }

    Array.from(files).forEach((file) => {
      this.requestService.uploadAllegato(this.requestId, file).subscribe({
        next: () => this.loadAllegati(this.requestId),
        error: () => this.errorMessage.set('Upload allegato non riuscito.')
      });
    });

    target.value = '';
  }

  protected download(allegato: Allegato): void {
    this.requestService.downloadAllegato(this.requestId, allegato.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = allegato.nomeFile;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.errorMessage.set('Download allegato non riuscito.')
    });
  }

  private loadAll(id: number): void {
    this.requestService.getById(id).subscribe({
      next: (data) => {
        this.richiesta.set(data);
        this.allowedTransitions.set(this.getAllowedTransitionsForCurrentUser(data.stato));
        this.stateForm.patchValue({ statoNuovo: this.allowedTransitions()[0] ?? '' });
      },
      error: () => this.errorMessage.set('Dettaglio richiesta non disponibile.')
    });

    this.loadStorico(id);
    this.loadAllegati(id);
  }

  private loadStorico(id: number): void {
    this.requestService.getStorico(id).subscribe({
      next: (items) => this.storico.set(items),
      error: () => this.storico.set([])
    });
  }

  private loadAllegati(id: number): void {
    this.requestService.getAllegati(id).subscribe({
      next: (items) => this.allegati.set(items),
      error: () => this.allegati.set([])
    });
  }

  private getAllowedTransitionsForCurrentUser(stato: StatoRichiesta): StatoRichiesta[] {
    return getAllowedTransitionsForRole(stato, this.canManageState());
  }

  private changeStateWithWorkflowCompatibility(
    targetState: StatoRichiesta,
    nota: string
  ): Observable<RichiestaAccessoAtti> {
    const currentState = this.richiesta()?.stato;
    if (!currentState) {
      return this.requestService.changeState(this.requestId, {
        statoNuovo: targetState,
        nota
      });
    }

    const needsIntermediateStep =
      currentState === 'PRESENTATA' &&
      (targetState === 'RICHIESTA_INTEGRAZIONE' || targetState === 'ACCOLTA' || targetState === 'RESPINTA');

    if (!needsIntermediateStep) {
      return this.requestService.changeState(this.requestId, {
        statoNuovo: targetState,
        nota
      });
    }

    // Alcuni backend accettano solo transizioni sequenziali: PRESENTATA -> IN_ISTRUTTORIA -> stato finale.
    return this.requestService
      .changeState(this.requestId, {
        statoNuovo: 'IN_ISTRUTTORIA'
      })
      .pipe(
        switchMap(() =>
          this.requestService.changeState(this.requestId, {
            statoNuovo: targetState,
            nota
          })
        )
      );
  }
}
