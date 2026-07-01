import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RequestService } from '../../core/services/request.service';
import {
  PagedResult,
  RichiestaAccessoAtti,
  RichiestaFilter,
  StatoRichiesta
} from '../../core/models/request.model';
import { getStatoBadge } from '../../core/utils/workflow.util';

@Component({
  selector: 'app-request-list-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="page-card">
      <h2>Elenco richieste</h2>

      <form [formGroup]="filterForm" (ngSubmit)="search()" class="grid-form">
        <label>
          Stato
          <select formControlName="stato">
            <option value="">Tutti</option>
            @for (stato of stati; track stato) {
              <option [value]="stato">{{ stato }}</option>
            }
          </select>
        </label>

        <label>
          Protocollo
          <input formControlName="protocollo" type="text" />
        </label>

        <label>
          Richiedente
          <input formControlName="richiedente" type="text" />
        </label>

        <label>
          Da data
          <input formControlName="fromDate" type="date" />
        </label>

        <label>
          A data
          <input formControlName="toDate" type="date" />
        </label>

        <div class="actions">
          <button type="submit">Filtra</button>
          <button type="button" class="secondary" (click)="reset()">Reset</button>
        </div>
      </form>

      @if (errorMessage()) {
        <p class="error">{{ errorMessage() }}</p>
      }

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Protocollo</th>
              <th>Richiedente</th>
              <th>Oggetto</th>
              <th>Stato</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (item of page().content; track item.id) {
              <tr>
                <td>{{ item.id }}</td>
                <td>{{ item.numeroProtocollo }}</td>
                <td>{{ item.richiedente }}</td>
                <td>{{ item.oggetto }}</td>
                <td>
                  <span
                    class="stato-badge"
                    [style.color]="statoBadge(item.stato).color"
                    [style.background]="statoBadge(item.stato).background"
                  >{{ statoBadge(item.stato).label }}</span>
                </td>
                <td><a [routerLink]="['/richieste', item.id]">Dettaglio</a></td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6">Nessuna richiesta trovata.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <button type="button" (click)="goToPage(page().page - 1)" [disabled]="page().page <= 0">
          Precedente
        </button>
        <span>Pagina {{ page().page + 1 }} di {{ page().totalPages || 1 }}</span>
        <button
          type="button"
          (click)="goToPage(page().page + 1)"
          [disabled]="page().page + 1 >= page().totalPages"
        >
          Successiva
        </button>
      </div>
    </section>
  `,
  styles: [
    `
      .grid-form {
        align-items: end;
        display: grid;
        gap: 0.75rem;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        margin-bottom: 1rem;
      }

      label {
        display: grid;
        gap: 0.3rem;
      }

      input,
      select,
      button {
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 0.45rem;
      }

      .actions {
        display: flex;
        gap: 0.5rem;
      }

      .secondary {
        background: #f8fafc;
      }

      .table-wrap {
        overflow-x: auto;
      }

      table {
        border-collapse: collapse;
        width: 100%;
      }

      th,
      td {
        border-bottom: 1px solid #e2e8f0;
        padding: 0.5rem;
        text-align: left;
      }

      .pagination {
        align-items: center;
        display: flex;
        gap: 1rem;
        margin-top: 1rem;
      }

      .error {
        color: #b91c1c;
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
export class RequestListPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly requestService = inject(RequestService);

  protected readonly stati: StatoRichiesta[] = [
    'PRESENTATA',
    'IN_ISTRUTTORIA',
    'RICHIESTA_INTEGRAZIONE',
    'ACCOLTA',
    'RESPINTA',
    'CHIUSA'
  ];

  protected readonly errorMessage = signal('');
  protected readonly page = signal<PagedResult<RichiestaAccessoAtti>>({
    content: [],
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 1
  });

  protected readonly filterForm = this.fb.nonNullable.group({
    stato: '',
    protocollo: '',
    richiedente: '',
    fromDate: '',
    toDate: ''
  });

  protected statoBadge(stato: StatoRichiesta) {
    return getStatoBadge(stato);
  }

  ngOnInit(): void {
    this.load();
  }

  protected search(): void {
    // Esegue una nuova ricerca riportando sempre la paginazione alla prima pagina.
    this.load(0);
  }

  protected reset(): void {
    // Ripristina i filtri al default e ricarica i risultati.
    this.filterForm.reset({
      stato: '',
      protocollo: '',
      richiedente: '',
      fromDate: '',
      toDate: ''
    });
    this.load(0);
  }

  protected goToPage(page: number): void {
    // Evita richieste fuori range quando l'utente naviga con la paginazione.
    if (page < 0 || page >= this.page().totalPages) {
      return;
    }
    this.load(page);
  }

  private load(pageNumber = this.page().page): void {
    // Costruisce il filtro dal form e aggiorna lo stato pagina con la risposta backend.
    this.errorMessage.set('');
    const form = this.filterForm.getRawValue();

    const filter: RichiestaFilter = {
      stato: form.stato as StatoRichiesta | '',
      protocollo: form.protocollo,
      richiedente: form.richiedente,
      fromDate: form.fromDate,
      toDate: form.toDate,
      page: pageNumber,
      size: this.page().size
    };

    this.requestService.list(filter).subscribe({
      next: (response) => this.page.set(response),
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(error.error?.message ?? 'Errore durante il caricamento richieste.');
      }
    });
  }
}
