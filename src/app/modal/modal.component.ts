import { Component, inject, Output, EventEmitter, Input } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { RouterModule, Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
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
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css',
})
export class ModalComponent {
  apiUrl = environment.apiBaseUrl;
  private http = inject(HttpClient);
  value: string | undefined;
  playlistId: string | null = null;

  @Input() trackName = '';
  @Input() trackArtist = '';
  @Input() trackImage = '';
  @Input() id = '';
  @Input() visible = false;
  @Input() title = '';
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() create = new EventEmitter<string>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {}
  showSuccess() {
    this.messageService.add({
      severity: 'success',
      summary: 'Recommendation sent successfully 🎉',
    });
  }
  onHide() {
    this.value = undefined;
    this.title = '';
    this.visibleChange.emit(false);
  }

  onClick() {
    if (this.trackName) {
      this.sendRec();
    } else {
      this.onCreate();
    }
  }

  sendRec() {
    this.playlistId = this.route.snapshot.paramMap.get('id');
    if (!this.playlistId) {
      console.error('Playlist ID is null or undefined');
      return;
    }
    const params = new HttpParams()
      .set('playlist_id', this.playlistId)
      .set('track_id', this.id)
      .set('message', this.value || '');

    this.http
      .post(`${this.apiUrl}/recommendation/send`, null, {
        params,
        withCredentials: true,
      })
      .subscribe({
        next: (res) => {
          console.log('Track sent:', res), this.showSuccess();
        },
        error: (err) => console.error('Failed to send track:', err),
      });
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
