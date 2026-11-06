import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService, UserProfile } from '../services/supabase.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-page.component.html'
})
export class DashboardPageComponent implements OnInit {
  loading = true;
  signingOut = false;
  errorMessage = '';
  profile: UserProfile | null = null;
  email = '';
  profileMenuOpen = false;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  get displayName() {
    return (
      this.profile?.full_name?.trim() ||
      this.profile?.username?.trim() ||
      this.email ||
      'Athlete'
    );
  }

  get profileInitial() {
    return this.displayName.charAt(0).toUpperCase();
  }

  async ngOnInit() {
    try {
      const user = await this.supabaseService.getCurrentUser();
      if (!user) {
        await this.router.navigateByUrl('/login');
        return;
      }

      this.email = user.email ?? '';
      this.profile = await this.supabaseService.getProfile(user.id);
    } catch (error: any) {
      this.errorMessage = error?.message || 'Unable to load your dashboard.';
    } finally {
      this.loading = false;
    }
  }

  async signOut() {
    this.signingOut = true;
    this.errorMessage = '';
    this.profileMenuOpen = false;

    try {
      await this.supabaseService.signOut();
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    } catch (error: any) {
      this.errorMessage = error?.message || 'Unable to sign out right now.';
    } finally {
      this.signingOut = false;
    }
  }

  toggleProfileMenu() {
    this.profileMenuOpen = !this.profileMenuOpen;
  }

  async editProfile() {
    this.profileMenuOpen = false;
    await this.router.navigate(['/profile-setup'], { queryParams: { edit: true } });
  }
}
