import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
	path: 'login',
	loadComponent: () =>
	  import('./features/auth/login-page.component').then((m) => m.LoginPageComponent)
  },
  {
	path: 'richieste',
	canActivate: [authGuard],
	loadComponent: () =>
	  import('./features/requests/request-list-page.component').then(
		(m) => m.RequestListPageComponent
	  )
  },
  {
	path: 'richieste/nuova',
	canActivate: [authGuard],
	data: { requiredRole: 'OPERATORE' },
	loadComponent: () =>
	  import('./features/requests/request-form-page.component').then(
		(m) => m.RequestFormPageComponent
	  )
  },
  {
	path: 'richieste/:id/modifica',
	canActivate: [authGuard],
	loadComponent: () =>
	  import('./features/requests/request-form-page.component').then(
		(m) => m.RequestFormPageComponent
	  )
  },
  {
	path: 'richieste/:id',
	canActivate: [authGuard],
	loadComponent: () =>
	  import('./features/requests/request-detail-page.component').then(
		(m) => m.RequestDetailPageComponent
	  )
  },
  { path: '', pathMatch: 'full', redirectTo: 'richieste' },
  { path: '**', redirectTo: 'richieste' }
];
