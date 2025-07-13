import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../modal/modal.component';
import { ButtonModule } from 'primeng/button';
@Component({
  selector: 'app-playlists',
  standalone: true,
  imports: [RouterLink, CommonModule, ModalComponent, ButtonModule],
  templateUrl: './playlists.component.html',
  styleUrl: './playlists.component.css',
})
export class PlaylistsComponent {
  @Input() playlists: any[] = [];
  visible: boolean = false;

  showDialog() {
    this.visible = true;
  }
}
