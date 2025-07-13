import { Routes } from '@angular/router';
import { LandingComponent } from './landing/landing.component';
import { MeComponent } from './me/me.component';
import { PlaylistComponent } from './playlist/playlist.component';
import { SendComponent } from './playlist/send/send.component';
import { authGuard } from './auth.guard';
import { playlistAuthGuard } from './playlist-auth.guard';
import { SpotifyApiComponent } from './spotify-api/spotify-api.component';
export const routes: Routes = [
  {
    path: '',
    component: LandingComponent,
  },

  {
    path: 'me',
    component: MeComponent,
    // canActivate: [authGuard],
  },
  {
    path: 'spotify-403',
    component: SpotifyApiComponent,
  },
  {
    path: ':id',
    component: PlaylistComponent,
    canActivate: [playlistAuthGuard],
    data: { title: 'Song Recommend Me' },
  },
];
