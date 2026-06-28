import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly session = this.authService.session;
  protected readonly isLoggedIn = computed(() => this.authService.isAuthenticated());
  protected readonly canCreateRequest = computed(() => this.authService.hasRole('OPERATORE'));

  protected logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
