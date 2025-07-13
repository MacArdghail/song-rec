import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TruncatePipe } from '../../truncate.pipe';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-sent',
  standalone: true,
  imports: [RouterLink, TruncatePipe, CommonModule],
  templateUrl: './sent.component.html',
  styleUrl: './sent.component.css',
})
export class SentComponent {
  @Input() sentRecs: any[] = [];
}
