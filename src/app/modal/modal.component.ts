import { Component, inject, Output, EventEmitter, Input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { RouterModule, Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [
    FormsModule,
    RouterModule,
    InputTextModule,
    ButtonModule,
    DialogModule,
    CommonModule,
  ],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css',
})
export class ModalComponent {
  apiUrl = environment.apiBaseUrl;
  private http = inject(HttpClient);

  @Input() visible = false;
  @Input() title = '';
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() create = new EventEmitter<string>();

  constructor(private router: Router) {}

  onHide() {
    this.title = '';
    this.visibleChange.emit(false);
  }

  onCreate() {
    this.http
      .post<any>(
        `${this.apiUrl}/spotify/create_playlist`,
        { name: this.title },
        { withCredentials: true }
      )
      .subscribe({
        next: (response) => {
          console.log('Playlist created:', response);
          this.title = '';
          console.log('Playlist ID:', response.id);
          this.visibleChange.emit(false);
          this.router.navigate(['/', response.playlist_id]);
        },
        error: (err) => {
          console.error('Error creating playlist:', err);
        },
      });
  }
}
