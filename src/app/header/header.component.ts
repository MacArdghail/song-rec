import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { environment } from '../../environments/environment';
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, AccordionModule, ButtonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent {
  apiUrl = environment.apiBaseUrl;
  onSignInToSpotify() {
    window.location.href = `${this.apiUrl}/spotify_login`;
  }
}
