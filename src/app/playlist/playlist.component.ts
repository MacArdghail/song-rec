import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { ToastModule } from 'primeng/toast';
import { environment } from '../../environments/environment';
import { CommonModule } from '@angular/common';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { of, forkJoin, EMPTY } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { SendComponent } from './send/send.component';

interface PlaylistDetails {
  owner_name: string;
  owner_profile_img: string;
  playlist_name: string;
}

@Component({
  selector: 'app-playlist',
  standalone: true,
  imports: [CommonModule, ButtonModule, ToastModule, SendComponent],
  providers: [MessageService],
  templateUrl: './playlist.component.html',
  styleUrl: './playlist.component.css',
})
export class PlaylistComponent implements OnInit {
  apiUrl = environment.apiBaseUrl;
  playlistId: string | null = null;
  isOwner: boolean | null = null;
  errorMessage: string | null = null;
  message: string = '';
  tracks: any[] = [];
  playlistInfo: any;
  playlistStats: any;

  loading = true;

  private http = inject(HttpClient);

  rec: string = '';

  playlistRecs: any[] = [];
  recently: any[] = [];
  exists: boolean = false;

  playlistDetails!: PlaylistDetails;

  constructor(
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.playlistId = this.route.snapshot.paramMap.get('id');

    const playlistExists$ = this.http.get<any>(
      `${this.apiUrl}/playlist/exists?playlist_id=${this.playlistId}`,
      { withCredentials: true }
    );

    const isOwner$ = this.http
      .get<any>(
        `${this.apiUrl}/playlist/is_owner?playlist_id=${this.playlistId}`,
        { withCredentials: true }
      )
      .pipe(
        switchMap((res) => {
          this.isOwner = res.isOwner;
          if (this.isOwner == false) {
            this.http
              .get<any>(
                `${this.apiUrl}/playlist/playlist_details?playlist_id=${this.playlistId}`,
                { withCredentials: true }
              )
              .subscribe({
                next: (res) => {
                  this.playlistDetails = res;
                  console.log('$$$ playlistDeatils ' + this.playlistDetails);
                  console.log(res);
                },
              });
          }
          if (!res.isOwner)
            return of({
              recommendations: [],
              playlist_info: null,
              stats: null,
            });

          return this.http
            .get<any>(
              `${this.apiUrl}/recommendation/get?playlist_id=${this.playlistId}`,
              { withCredentials: true }
            )
            .pipe(
              catchError((err) => {
                console.error('Failed to get recs', err);
                return of({
                  recommendations: [],
                  playlist_info: null,
                  stats: null,
                });
              })
            );
        }),
        catchError((err) => {
          if (err.status === 404) {
            this.errorMessage = 'Playlist not found.';
          } else {
            this.errorMessage = 'Something went wrong';
          }
          this.isOwner = null;
          return of({ recommendations: [], playlist_info: null, stats: null });
        })
      );

    forkJoin({
      existsResponse: playlistExists$.pipe(
        catchError((err) => {
          this.exists = false;
          return of(null);
        })
      ),
      recommendationResponse: isOwner$,
    }).subscribe({
      next: ({ existsResponse, recommendationResponse }) => {
        this.exists = existsResponse?.exists;

        if (this.isOwner) {
          this.playlistRecs = recommendationResponse.recommendations;
          this.playlistInfo = recommendationResponse.playlist_info;
          this.playlistStats = recommendationResponse.stats;
        }

        this.loading = false;
      },
      error: (err) => {
        console.error('Unexpected error', err);
        this.loading = false;
      },
    });
  }

  showSuccess() {
    this.messageService.add({
      severity: 'success',
      summary: 'Success: Copied to clipboard',
      detail: 'Share your URL with friends!',
    });
  }

  copyPlaylistLink() {
    const link = `https://song-rec.me/${this.playlistId}`;
    if (!this.playlistId) {
      return;
    }
    navigator.clipboard
      .writeText(link)
      .then(() => {
        console.log('Copied to clipboard', link);
        this.showSuccess();
      })
      .catch((err) => {
        console.log('failed to copy link', err);
      });
  }

  goToPlaylist() {
    window.open(
      `https://open.spotify.com/playlist/${this.playlistId}`,
      '_blank'
    );
  }

  react(recommendation_id: string, reaction: string) {
    const params = new HttpParams()
      .set('recommendation_id', recommendation_id)
      .set('emoji', reaction);
    console.log(reaction);
    this.http
      .post(`${this.apiUrl}/recommendation/react`, null, {
        params,
        withCredentials: true,
      })
      .subscribe({
        next: (res) => {
          console.log('reaction sent', res);
          const rec = this.playlistRecs.find(
            (r) => r.recommendation_id === recommendation_id
          );
          if (rec) {
            rec.emoji = reaction;
          }
        },
        error: (err) => {
          console.log('reaction failed to send', err);
        },
      });
  }
}
