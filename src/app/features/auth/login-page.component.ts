import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  template: `
    <section class="page-card login-card">
      <h2>Login operatori</h2>
      <p class="hint">Autenticazione JWT verso backend Spring Boot</p>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>
          Username
          <input formControlName="username" type="text" autocomplete="username" />
        </label>

        <label>
          Password
          <input
            formControlName="password"
            type="password"
            autocomplete="current-password"
          />
        </label>

        @if (errorMessage()) {
          <p class="error">{{ errorMessage() }}</p>
        }

        <button type="submit" [disabled]="form.invalid || loading()">
          {{ loading() ? 'Accesso in corso...' : 'Accedi' }}
        </button>
      </form>
    </section>
  `,
  styles: [
    `
      .login-card {
        margin: 2rem auto;
        max-width: 420px;
      }

      h2 {
        margin: 0 0 0.3rem;
      }

      .hint {
        color: #475569;
        margin-bottom: 1rem;
      }

      form {
        display: grid;
        gap: 0.9rem;
      }

      label {
        display: grid;
        gap: 0.35rem;
      }

      input {
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 0.5rem;
      }

      .error {
        color: #b91c1c;
        margin: 0;
      }

      button {
        background: #1d4ed8;
        border: 0;
        border-radius: 6px;
        color: #fff;
        cursor: pointer;
        padding: 0.55rem;
      }

      button:disabled {
        background: #94a3b8;
        cursor: not-allowed;
      }
    `
  ]
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  protected submit(): void {
    if (this.form.invalid) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const credentials = this.form.getRawValue();
    this.authService.login(credentials.username, credentials.password).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigate(['/richieste']);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        if (error.status === 0) {
          this.errorMessage.set('Backend non raggiungibile. Verifica avvio e proxy API.');
          return;
        }
        this.errorMessage.set('Credenziali non valide o utenza non autorizzata.');
      }
    });
  }
}

