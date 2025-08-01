import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { playlistAuthGuard } from './playlist-auth.guard';

describe('playlistAuthGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => playlistAuthGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
