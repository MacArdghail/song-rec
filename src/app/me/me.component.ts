import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { RouterModule, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../modal/modal.component';
import { forkJoin } from 'rxjs';

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
  loading: boolean = true;
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
    this.loadData();
  }

  loadData() {
    forkJoin({
      playlists: this.http.get<any>(`${this.apiUrl}/playlist/get_playlists`, {
        withCredentials: true,
      }),
      recs: this.http.get<any>(`${this.apiUrl}/recommendation/yours`, {
        withCredentials: true,
      }),
    }).subscribe({
      next: (result) => {
        this.playlists = result.playlists;
        this.recs = result.recs;
        this.loading = false;
      },
      error: (err) => {
        console.log('Error loading data in /me', err);
        this.loading = false;
      },
    });
  }
}
