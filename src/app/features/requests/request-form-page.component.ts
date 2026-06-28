import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { RequestService } from '../../core/services/request.service';
import { RichiestaPayload } from '../../core/models/request.model';

const NEW_REQUEST_DRAFT_STORAGE_KEY = 'pa-new-request-draft';

@Component({
  selector: 'app-request-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="page-card">
      <h2>{{ isEditMode() ? 'Modifica richiesta' : 'Nuova richiesta' }}</h2>

      <form [formGroup]="form" (ngSubmit)="submit()" class="request-form">
        <label>
          Numero protocollo
          <input formControlName="numeroProtocollo" type="text" />
        </label>

        <label>
          Nome richiedente
          <input formControlName="nomeRichiedente" type="text" />
        </label>

        <label>
          Cognome richiedente
          <input formControlName="cognomeRichiedente" type="text" />
        </label>

        <label>
          Email richiedente
          <input formControlName="emailRichiedente" type="email" />
        </label>

        <label>
          Telefono richiedente (opzionale)
          <input formControlName="telefonoRichiedente" type="text" />
        </label>

        <label>
          Oggetto
          <input formControlName="oggetto" type="text" />
        </label>

        <label>
          Descrizione
          <textarea formControlName="descrizione" rows="5"></textarea>
        </label>

        @if (errorMessage()) {
          <p class="error">{{ errorMessage() }}</p>
        }

        <div class="actions">
          <button type="submit" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Salvataggio...' : 'Salva' }}
          </button>
          <a routerLink="/richieste">Annulla</a>
        </div>
      </form>
    </section>
  `,
  styles: [
    `
      .request-form {
        display: grid;
        gap: 0.75rem;
        max-width: 760px;
      }

      label {
        display: grid;
        gap: 0.3rem;
      }

      input,
      textarea {
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 0.5rem;
      }

      .actions {
        align-items: center;
        display: flex;
        gap: 0.75rem;
      }

      button {
        background: #1d4ed8;
        border: 0;
        border-radius: 6px;
        color: #fff;
        cursor: pointer;
        padding: 0.5rem 0.8rem;
      }

      .error {
        color: #b91c1c;
      }
    `
  ]
})
export class RequestFormPageComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly requestService = inject(RequestService);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly isEditMode = signal(false);

  private requestId: number | null = null;
  private draftSubscription: Subscription | null = null;

  protected readonly form = this.fb.nonNullable.group({
    numeroProtocollo: ['', Validators.required],
    nomeRichiedente: ['', Validators.required],
    cognomeRichiedente: ['', Validators.required],
    emailRichiedente: ['', [Validators.required, Validators.email]],
    telefonoRichiedente: [''],
    oggetto: ['', Validators.required],
    descrizione: ['', [Validators.required, Validators.minLength(10)]]
  });

  ngOnInit(): void {
    const rawId = this.route.snapshot.paramMap.get('id');
    if (!rawId) {
      this.restoreNewRequestDraft();
      this.startPersistingNewRequestDraft();
      return;
    }

    const id = Number(rawId);
    if (Number.isNaN(id)) {
      this.errorMessage.set('Identificativo richiesta non valido.');
      return;
    }

    this.requestId = id;
    this.isEditMode.set(true);
    this.requestService.getById(id).subscribe({
      next: (richiesta) => {
        this.form.patchValue({
          numeroProtocollo: richiesta.numeroProtocollo,
          nomeRichiedente: richiesta.nomeRichiedente ?? '',
          cognomeRichiedente: richiesta.cognomeRichiedente ?? '',
          emailRichiedente: richiesta.emailRichiedente ?? '',
          telefonoRichiedente: richiesta.telefonoRichiedente ?? '',
          oggetto: richiesta.oggetto,
          descrizione: richiesta.descrizione
        });
      },
      error: () => this.errorMessage.set('Impossibile caricare la richiesta da modificare.')
    });
  }

  ngOnDestroy(): void {
    this.draftSubscription?.unsubscribe();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Compila tutti i campi obbligatori prima di salvare.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    const payload: RichiestaPayload = this.form.getRawValue();

    if (this.requestId) {
      this.requestService.update(this.requestId, payload).subscribe({
        next: (saved) => {
          this.loading.set(false);
          const targetId = saved?.id ?? this.requestId;
          void this.router.navigate(targetId ? ['/richieste', targetId] : ['/richieste']);
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          this.errorMessage.set(this.getApiErrorMessage(error, 'Errore durante il salvataggio.'));
        }
      });
      return;
    }

    this.requestService.create(payload).subscribe({
      next: (saved) => {
        this.loading.set(false);
        this.clearNewRequestDraft();
        void this.router.navigate(saved?.id ? ['/richieste', saved.id] : ['/richieste']);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(this.getApiErrorMessage(error, 'Errore durante la creazione.'));
      }
    });
  }

  private getApiErrorMessage(error: HttpErrorResponse, fallback: string): string {
    const validationErrors = error.error?.errors as Record<string, string> | undefined;
    if (validationErrors && Object.keys(validationErrors).length) {
      return Object.values(validationErrors).join(' ');
    }

    return error.error?.message ?? fallback;
  }

  private restoreNewRequestDraft(): void {
    const rawDraft = sessionStorage.getItem(NEW_REQUEST_DRAFT_STORAGE_KEY);
    if (!rawDraft) {
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as Partial<RichiestaPayload>;
      this.form.patchValue({
        numeroProtocollo: draft.numeroProtocollo ?? '',
        nomeRichiedente: draft.nomeRichiedente ?? '',
        cognomeRichiedente: draft.cognomeRichiedente ?? '',
        emailRichiedente: draft.emailRichiedente ?? '',
        telefonoRichiedente: draft.telefonoRichiedente ?? '',
        oggetto: draft.oggetto ?? '',
        descrizione: draft.descrizione ?? ''
      });
    } catch {
      this.clearNewRequestDraft();
    }
  }

  private startPersistingNewRequestDraft(): void {
    this.draftSubscription?.unsubscribe();
    this.draftSubscription = this.form.valueChanges.subscribe(() => {
      sessionStorage.setItem(NEW_REQUEST_DRAFT_STORAGE_KEY, JSON.stringify(this.form.getRawValue()));
    });
  }

  private clearNewRequestDraft(): void {
    sessionStorage.removeItem(NEW_REQUEST_DRAFT_STORAGE_KEY);
  }
}

