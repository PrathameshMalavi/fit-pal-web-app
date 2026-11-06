import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { SupabaseService } from './services/supabase.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'FitPal';
  private authSubscription?: { unsubscribe: () => void };

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.redirectIfAuthenticated();

    const { data } = this.supabaseService.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          if (this.currentPath() !== '/reset-password') {
            await this.router.navigateByUrl('/reset-password');
          }
          return;
        }

        if (event === 'SIGNED_OUT') {
          if (this.currentPath() !== '/login') {
            await this.router.navigateByUrl('/login');
          }
          return;
        }

        if (!session?.user) {
          return;
        }

        if (
          (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') &&
          this.isAuthEntryPath(this.currentPath())
        ) {
          await this.navigateToUserHome(session.user.id);
        }
      }
    );

    this.authSubscription = data.subscription;
  }

  ngOnDestroy() {
    this.authSubscription?.unsubscribe();
  }

  private async redirectIfAuthenticated() {
    const user = await this.supabaseService.getCurrentUser();
    if (!user || !this.isAuthEntryPath(this.currentPath())) {
      return;
    }

    await this.navigateToUserHome(user.id);
  }

  private async navigateToUserHome(userId: string) {
    const targetRoute = await this.supabaseService.resolvePostAuthRoute(userId);
    if (this.currentPath() !== targetRoute) {
      await this.router.navigateByUrl(targetRoute);
    }
  }

  private currentPath() {
    return this.router.url.split('?')[0].split('#')[0];
  }

  private isAuthEntryPath(path: string) {
    return path === '/' || path === '/login';
  }
}
