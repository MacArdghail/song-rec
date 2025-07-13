import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpotifyApiComponent } from './spotify-api.component';

describe('SpotifyApiComponent', () => {
  let component: SpotifyApiComponent;
  let fixture: ComponentFixture<SpotifyApiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpotifyApiComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SpotifyApiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
