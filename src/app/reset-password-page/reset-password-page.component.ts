import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password-page.component.html'
})
export class ResetPasswordPageComponent {
  password = '';
  confirmPassword = '';
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  private resolveAuthError(error: any) {
    const code = String(error?.code ?? '').toLowerCase();
    const message = String(error?.message ?? '').toLowerCase();

    if (code === 'same_password' || message.includes('same password')) {
      return 'Choose a new password that is different from your previous one.';
    }

    if (message.includes('session') || message.includes('expired')) {
      return 'This reset link is invalid or expired. Please request a new one.';
    }

    return error?.message || 'Unable to update your password.';
  }

  async updatePassword() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.password || !this.confirmPassword) {
      this.errorMessage = 'Please fill in both password fields.';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.loading = true;

    try {
      await this.supabaseService.updatePassword(this.password);
      const user = await this.supabaseService.getCurrentUser();

      this.successMessage = 'Password updated successfully.';

      if (!user) {
        await this.router.navigateByUrl('/login');
        return;
      }

      const targetRoute = await this.supabaseService.resolvePostAuthRoute(user.id);
      await this.router.navigateByUrl(targetRoute);
    } catch (error: any) {
      this.errorMessage = this.resolveAuthError(error);
    } finally {
      this.loading = false;
    }
  }
}
