import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin } from 'rxjs';
import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root',
})
export class SpotifyService {
  apiUrl = environment.apiBaseUrl;
  private http = inject(HttpClient);

  fetchPlaylistsAndSentRecs() {
    return forkJoin({
      playlists: this.http.get<any>(`${this.apiUrl}/playlist/get_playlists`, {
        withCredentials: true,
      }),
      recs: this.http.get<any>(`${this.apiUrl}/recommendation/yours`, {
        withCredentials: true,
      }),
    });
  }
}
