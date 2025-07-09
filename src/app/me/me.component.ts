import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { RouterModule, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-me',
  standalone: true,
  imports: [RouterModule, ButtonModule, CommonModule, ModalComponent],
  templateUrl: './me.component.html',
  styleUrl: './me.component.css',
})
export class MeComponent {
  apiUrl = environment.apiBaseUrl;
  showReceived: boolean = true;
  visible: boolean = false;
  playlists: any[] = [];
  recs: any[] = [];

  private http = inject(HttpClient);

  showDialog() {
    this.visible = true;
  }

  view(display: string) {
    if (display === 'recieved') {
      this.showReceived = true;
    } else {
      this.showReceived = false;
    }
  }

  ngOnInit() {
    this.getPlaylists();
    this.getMyRecommendations();
  }

  getMyRecommendations() {
    this.http
      .get<any>(`${this.apiUrl}/recommendation/yours`, {
        withCredentials: true,
      })
      .subscribe({
        next: (response) => {
          this.recs = response;
        },
        error: (err) => {
          console.error('Error getting response', err);
        },
      });
  }

  getPlaylists() {
    this.http
      .get<any>(`${this.apiUrl}/playlist/get_playlists`, {
        withCredentials: true,
      })
      .subscribe({
        next: (response) => {
          this.playlists = response;
        },
        error: (err) => {
          console.error('Error creating playlist', err);
        },
      });
  }
}
