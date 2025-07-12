import { inject } from '@angular/core';
import {
  CanActivateFn,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { catchError, map, tap } from 'rxjs/operators';
import { throwError, of } from 'rxjs';

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

      return throwError(() => new Error('Redirecting to Spotify login...'));
    })
  );
};
