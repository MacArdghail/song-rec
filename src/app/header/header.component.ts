import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, AccordionModule, ButtonModule, CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent {
  apiUrl = environment.apiBaseUrl;
  isLoggedIn = false;
  isHomePage = true;
  userProfileImg = '';

  private router = inject(Router);
  private http = inject(HttpClient);
  ngOnInit() {
    this.router.events.subscribe(() => {
      this.isHomePage = this.router.url === '/';
    });

    this.http
      .get(`${this.apiUrl}/spotify/me`, { withCredentials: true })
      .subscribe({
        next: (user: any) => {
          this.isLoggedIn = true;
          this.userProfileImg = user.profile_img;
        },
        error: () => {
          this.isLoggedIn = false;
        },
      });
  }
  onSignInToSpotify() {
    // if (!this.isLoggedIn) {
    window.location.href = `${this.apiUrl}/spotify_login`;
    // } else {
    //   this.router.navigate(['/me']);
    // }
  }
}
