import { Component, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { SentComponent } from './sent/sent.component';
import { SpotifyService } from '../shared/spotify.service';
import { PlaylistsComponent } from './playlists/playlists.component';

@Component({
  selector: 'app-me',
  standalone: true,
  imports: [ButtonModule, CommonModule, SentComponent, PlaylistsComponent],
  templateUrl: './me.component.html',
  styleUrl: './me.component.css',
})
export class MeComponent {
  apiUrl = environment.apiBaseUrl;
  showReceived: boolean = true;
  playlists: any[] = [];
  sentRecs: any[] = [];
  loading: boolean = true;

  private spotify = inject(SpotifyService);

  ngOnInit() {
    this.loadData();
  }

  view(display: string) {
    if (display === 'recieved') {
      this.showReceived = true;
    } else {
      this.showReceived = false;
    }
  }

  loadData() {
    this.spotify.fetchPlaylistsAndSentRecs().subscribe({
      next: (result) => {
        this.playlists = result.playlists;
        this.sentRecs = result.recs;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
      },
    });
  }
}
