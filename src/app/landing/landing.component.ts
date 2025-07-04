import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent {
  apiUrl = environment.apiBaseUrl;

  private http = inject(HttpClient);
  message: string = '';
  ngOnInit() {
    this.retrieveMessage();
  }

  retrieveMessage() {
    this.http.get<any>(`${this.apiUrl}/test-db`).subscribe({
      next: (response) => {
        this.message = response.testMessage;
      },
      error: (err) => {
        console.error('Failed to fetch message', err);
        this.message = 'Something went wrong. Please try again later';
      },
    });
  }
}
