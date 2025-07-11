import { Component, inject, Input, OnInit } from '@angular/core';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule, FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { distinctUntilChanged, of, debounceTime, switchMap } from 'rxjs';
import { ModalComponent } from '../../modal/modal.component';

interface PlaylistDetails {
  owner_name: string;
  owner_profile_img: string;
  playlist_name: string;
}

@Component({
  selector: 'app-send',
  standalone: true,
  imports: [
    InputTextModule,
    FormsModule,
    ButtonModule,
    CommonModule,
    ReactiveFormsModule,
    ModalComponent,
  ],
  templateUrl: './send.component.html',
  styleUrl: './send.component.css',
})
export class SendComponent implements OnInit {
  apiUrl = environment.apiBaseUrl;
  numbers = [1, 2, 3];
  value: string | undefined;
  selectedTrackName: string = '';
  selectedTrackArtist: string = '';
  selectedTrackImage: string = '';
  selectedTrackId: string = '';

  visible: boolean = false;

  showDialog(name: string, artist: string, image: string, id: string) {
    this.selectedTrackName = name;
    this.selectedTrackArtist = artist;
    this.selectedTrackImage = image;
    this.selectedTrackId = id;
    this.visible = true;
  }

  @Input() playlistDetails!: PlaylistDetails;

  searchControl = new FormControl('');
  // @Input() playlistId;

  loading: boolean = true;

  items: any[] = [];
  displaySuggested: boolean = true;

  displayTracks: {
    name: string;
    artist: string;
    albumCover: string;
    id: string;
  }[] = [];

  searchedTracks: any[] = [];

  suggestions: {
    name: string;
    artist: string;
    albumCover: string;
    id: string;
  }[] = [];

  private http = inject(HttpClient);

  trackById(index: number, track: any): string {
    return track.id;
  }

  ngOnInit() {
    // Show recently played tracks initially
    this.getRecentlyPlayed();

    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => this.searchSong(query ?? ''))
      )
      .subscribe({
        next: (results) => {
          const items = results.tracks.items;

          if (!items || items.length === 0) {
            this.displaySuggested = true;
            this.getRecentlyPlayed();
          } else {
            this.displaySuggested = false;
            // Show search results
            this.displayTracks = items.map((track: any) => ({
              id: track.id,
              name: track.name,
              artist: track.artists[0].name,
              albumCover: track.album.images[0]?.url || '',
            }));
          }
        },
        error: (err) => {
          console.error('search error:', err);
          this.displayTracks = [];
        },
      });
  }

  getRecentlyPlayed() {
    this.http
      .get<any>(`${this.apiUrl}/spotify/recently_played`, {
        withCredentials: true,
      })
      .subscribe({
        next: (res) => {
          this.displayTracks = res.map((item: any) => ({
            id: item.track.id,
            name: item.track.name,
            artist: item.track.artists[0].name,
            albumCover: item.track.album.images[0]?.url || '',
          }));
          this.loading = false;
        },
        error: (err) =>
          console.error('failed to fetch recently played tracks', err),
      });
  }

  searchSong(query: string) {
    console.log('SEARCHING');
    if (!query.trim()) {
      return of({ tracks: { items: [] } });
    }

    return this.http.get<any>(`${this.apiUrl}/spotify/search`, {
      params: { q: query },
      withCredentials: true,
    });
  }
}
