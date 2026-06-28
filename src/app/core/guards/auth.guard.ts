import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RuoloUtente } from '../models/auth.model';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const requiredRole = route.data?.['requiredRole'] as RuoloUtente | undefined;
  if (requiredRole && !authService.hasRole(requiredRole)) {
    return router.createUrlTree(['/richieste']);
  }

  return true;
};

