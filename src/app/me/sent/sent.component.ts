import { Component, Input, OnInit } from '@angular/core';
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
export class SentComponent implements OnInit {
  @Input() sentRecs: any[] = [];

  ngOnInit(): void {
    console.log('$$$' + this.sentRecs);
  }
}
