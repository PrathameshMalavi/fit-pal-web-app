import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css'
})
export class LoginPageComponent {
  email = '';
  password = '';
  mode: 'sign-in' | 'sign-up' | 'forgot-password' = 'sign-in';
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  get isSignUp() {
    return this.mode === 'sign-up';
  }

  get isForgotPassword() {
    return this.mode === 'forgot-password';
  }

  get isSignIn() {
    return this.mode === 'sign-in';
  }

  get modeTitle() {
    if (this.isForgotPassword) {
      return 'Reset Password';
    }

    return this.isSignUp ? 'Start Strong' : 'Welcome Back';
  }

  get modeSubtitle() {
    if (this.isForgotPassword) {
      return 'Get a secure link and get back in.';
    }

    return this.isSignUp
      ? 'Create your account and set your goals.'
      : 'Sign in and continue your training.';
  }

  get modeBadge() {
    if (this.isForgotPassword) {
      return 'Recovery';
    }

    return this.isSignUp ? 'New Athlete' : 'Returning Athlete';
  }

  get modeStatValue() {
    if (this.isForgotPassword) {
      return '24h';
    }

    return this.isSignUp ? 'Day 01' : 'Streak';
  }

  get modeStatLabel() {
    if (this.isForgotPassword) {
      return 'link window';
    }

    return this.isSignUp ? 'fresh start' : 'resume mode';
  }

  switchMode(mode: 'sign-in' | 'sign-up' | 'forgot-password') {
    this.mode = mode;
    this.errorMessage = '';
    this.successMessage = '';

    if (mode !== 'sign-up') {
      this.password = '';
    }
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  private async redirectAuthenticatedUser() {
    const user = await this.supabaseService.getCurrentUser();
    if (!user) {
      return;
    }

    const targetRoute = await this.supabaseService.resolvePostAuthRoute(user.id);
    await this.router.navigateByUrl(targetRoute);
  }

  private resolveAuthError(error: any) {
    const code = String(error?.code ?? '').toLowerCase();
    const status = Number(error?.status ?? 0);
    const message = String(error?.message ?? '').toLowerCase();

    if (
      status === 429 ||
      code === 'over_email_send_rate_limit' ||
      message.includes('rate limit') ||
      message.includes('too many requests')
    ) {
      return 'Too many attempts. Please wait a few minutes before trying again.';
    }

    if (
      code === 'user_already_exists' ||
      message.includes('user already registered') ||
      message.includes('already been registered')
    ) {
      this.mode = 'sign-in';
      this.password = '';
      return 'An account with this email already exists. Please sign in.';
    }

    if (
      code === 'email_not_confirmed' ||
      message.includes('email not confirmed')
    ) {
      return 'Please confirm your email first. Check your inbox and spam folder for the verification link.';
    }

    if (
      code === 'invalid_credentials' ||
      message.includes('invalid login credentials') ||
      message.includes('invalid credentials')
    ) {
      return 'Invalid email or password. If you just signed up, please confirm your email first.';
    }

    return error?.message || 'An error occurred. Please try again.';
  }

  async ngOnInit() {
    await this.redirectAuthenticatedUser();
  }

  async onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.isValidEmail(this.email)) {
      this.errorMessage = 'Please enter a valid email address.';
      return;
    }

    if (this.isForgotPassword) {
      this.loading = true;

      try {
        await this.supabaseService.resetPassword(this.email.trim());
        this.successMessage =
          'Password reset email sent. Open the link in your inbox to choose a new password.';
      } catch (error: any) {
        this.errorMessage = this.resolveAuthError(error);
      } finally {
        this.loading = false;
      }

      return;
    }

    if (!this.email || !this.password) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters.';
      return;
    }

    this.loading = true;

    try {
      if (this.isSignUp) {
        const result = await this.supabaseService.signUp(
          this.email.trim(),
          this.password
        );

        if (result.kind === 'existing_account') {
          this.mode = 'sign-in';
          this.password = '';
          this.errorMessage =
            'An account with this email already exists. Please sign in.';
          return;
        }

        if (result.kind === 'signed_in' && result.user) {
          const targetRoute = await this.supabaseService.resolvePostAuthRoute(
            result.user.id
          );
          await this.router.navigateByUrl(targetRoute);
          return;
        }

        this.password = '';
        this.mode = 'sign-in';
        this.successMessage =
          'Check your email to verify your account, then sign in to continue.';
      } else {
        const { user } = await this.supabaseService.signIn(
          this.email.trim(),
          this.password
        );
        const targetRoute = await this.supabaseService.resolvePostAuthRoute(
          user.id
        );
        await this.router.navigateByUrl(targetRoute);
      }
    } catch (error: any) {
      this.errorMessage = this.resolveAuthError(error);
    } finally {
      this.loading = false;
    }
  }
}
