import { inject } from '@angular/core';
import {
  CanActivateFn,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../environments/environment';

export const playlistAuthGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const http = inject(HttpClient);
  const apiUrl = environment.apiBaseUrl;

  return http.get(`${apiUrl}/spotify/me`, { withCredentials: true }).pipe(
    map(() => true),
    catchError(() => {
      const playlistId = route.paramMap.get('id') ?? '';
      const redirectUrl = `${apiUrl}/spotify_login?state=${encodeURIComponent(
        playlistId
      )}`;
      window.location.href = redirectUrl;
      return of(false);
    })
  );
};
