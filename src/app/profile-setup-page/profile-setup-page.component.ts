import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProfileInput, SupabaseService, UserProfile } from '../services/supabase.service';

@Component({
  selector: 'app-profile-setup-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-setup-page.component.html'
})
export class ProfileSetupPageComponent implements OnInit {
  currentStep = 1;
  readonly steps = [
    { number: 1, label: 'Identity', detail: 'Your account details' },
    { number: 2, label: 'Health', detail: 'Your body basics' },
    { number: 3, label: 'Lifestyle', detail: 'Your routine' }
  ];

  email = '';
  fullName = '';
  username = '';
  phoneNumber = '';
  gender = '';
  dateOfBirth = '';
  age: number | null = null;
  heightCm: number | null = null;
  weightKg: number | null = null;
  readonly today = new Date().toISOString().slice(0, 10);
  bloodGroup = '';
  activityLevel = '';
  profession = '';
  avatarPreview = '';
  selectedAvatar: File | null = null;
  loading = true;
  saving = false;
  isEditMode = false;
  errorMessage = '';
  successMessage = '';
  fieldErrors: Record<string, string> = {};
  private userId = '';

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    try {
      const user = await this.supabaseService.getCurrentUser();
      if (!user) {
        await this.router.navigateByUrl('/login');
        return;
      }

      this.userId = user.id;
      this.email = user.email ?? '';
      this.isEditMode = this.route.snapshot.queryParamMap.get('edit') === 'true';
      const profile = await this.supabaseService.getProfile(user.id);
      if (!this.isEditMode && this.supabaseService.isProfileComplete(profile)) {
        await this.router.navigateByUrl('/dashboard');
        return;
      }

      this.applyProfile(profile, this.email);
    } catch (error: any) {
      this.errorMessage = error?.message || 'Unable to load your profile.';
    } finally {
      this.loading = false;
    }
  }

  private applyProfile(profile: UserProfile | null, email: string) {
    this.fullName = profile?.full_name ?? '';
    this.username = profile?.username ?? email.split('@')[0] ?? '';
    this.phoneNumber = profile?.phone_number ?? '';
    this.gender = profile?.gender ?? '';
    this.dateOfBirth = profile?.date_of_birth ?? '';
    this.age = profile?.age ?? this.calculateAge(this.dateOfBirth);
    this.heightCm = profile?.height_cm ?? null;
    this.weightKg = profile?.weight_kg ?? null;
    this.bloodGroup = profile?.blood_group ?? '';
    this.activityLevel = profile?.activity_level ?? '';
    this.profession = profile?.profession ?? '';
    this.avatarPreview = profile?.avatar_url ?? this.defaultAvatar(this.gender);
  }

  calculateAge(dateOfBirth: string) {
    if (!dateOfBirth) {
      return null;
    }

    const birthDate = new Date(`${dateOfBirth}T00:00:00`);
    if (Number.isNaN(birthDate.getTime())) {
      return null;
    }

    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const birthdayHasPassed =
      today.getMonth() > birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

    if (!birthdayHasPassed) {
      calculatedAge--;
    }

    return calculatedAge >= 0 ? calculatedAge : null;
  }

  onDateOfBirthChange() {
    this.age = this.calculateAge(this.dateOfBirth);
    this.clearFieldError('dateOfBirth');
    this.clearFieldError('age');
  }

  openDatePicker(input: HTMLInputElement) {
    const picker = input as HTMLInputElement & { showPicker?: () => void };

    if (picker.showPicker) {
      picker.showPicker();
      return;
    }

    input.focus();
    input.click();
  }

  onGenderChange() {
    if (!this.selectedAvatar) {
      this.avatarPreview = this.defaultAvatar(this.gender);
    }
  }

  onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.errorMessage = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Please choose an image file for your profile photo.';
      input.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.errorMessage = 'Profile photos must be 2 MB or smaller.';
      input.value = '';
      return;
    }

    this.selectedAvatar = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreview = typeof reader.result === 'string' ? reader.result : this.avatarPreview;
    };
    reader.readAsDataURL(file);
  }

  goToStep(step: number) {
    if (step < this.currentStep) {
      this.currentStep = step;
      this.errorMessage = '';
      this.fieldErrors = {};
    }
  }

  previousStep() {
    this.goToStep(this.currentStep - 1);
  }

  async cancelEdit() {
    if (!this.isEditMode || this.saving) {
      return;
    }

    await this.router.navigateByUrl('/dashboard');
  }

  nextStep() {
    this.errorMessage = '';
    this.fieldErrors = {};

    if (this.currentStep === 1 && !this.validateIdentity()) {
      return;
    }

    if (this.currentStep === 2 && !this.validateHealth()) {
      return;
    }

    if (this.currentStep < 3) {
      this.currentStep++;
      return;
    }

    if (!this.validateLifestyle()) {
      return;
    }

    void this.saveProfile();
  }

  getFieldError(field: string) {
    return this.fieldErrors[field] ?? '';
  }

  clearFieldError(field: string) {
    delete this.fieldErrors[field];
  }

  private validateIdentity() {
    if (!this.username.trim()) {
      this.fieldErrors['username'] = 'Enter a username.';
    } else if (this.username.trim().length < 3) {
      this.fieldErrors['username'] = 'Use at least 3 characters.';
    }

    if (!this.fullName.trim()) {
      this.fieldErrors['fullName'] = 'Enter your full name.';
    }

    if (!this.phoneNumber.trim()) {
      this.fieldErrors['phoneNumber'] = 'Enter your phone number.';
    } else if (!/^[+]?[-()\s\d]{7,20}$/.test(this.phoneNumber.trim())) {
      this.fieldErrors['phoneNumber'] = 'Enter a valid phone number.';
    }

    return Object.keys(this.fieldErrors).length === 0;
  }

  private validateHealth() {
    if (!this.gender) {
      this.fieldErrors['gender'] = 'Choose your gender.';
    }

    if (!this.dateOfBirth) {
      this.fieldErrors['dateOfBirth'] = 'Choose your date of birth.';
    } else if (!this.age || this.age < 1) {
      this.fieldErrors['dateOfBirth'] = 'Enter a valid date of birth.';
    }

    if (this.heightCm === null || this.heightCm === undefined) {
      this.fieldErrors['heightCm'] = 'Enter your height.';
    } else if (this.heightCm <= 0) {
      this.fieldErrors['heightCm'] = 'Height must be greater than zero.';
    }

    if (this.weightKg === null || this.weightKg === undefined) {
      this.fieldErrors['weightKg'] = 'Enter your weight.';
    } else if (this.weightKg <= 0) {
      this.fieldErrors['weightKg'] = 'Weight must be greater than zero.';
    }

    return Object.keys(this.fieldErrors).length === 0;
  }

  private validateLifestyle() {
    if (!this.activityLevel) {
      this.fieldErrors['activityLevel'] = 'Choose an activity level.';
    }

    if (!this.profession) {
      this.fieldErrors['profession'] = 'Choose a profession.';
    }

    return Object.keys(this.fieldErrors).length === 0;
  }

  private defaultAvatar(gender: string) {
    const symbol = gender === 'female' ? 'F' : gender === 'male' ? 'M' : 'FP';
    const background = gender === 'female' ? '#DB2777' : gender === 'male' ? '#0284C7' : '#0F766E';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" rx="48" fill="${background}"/><circle cx="80" cy="58" r="25" fill="#F8FAFC" fill-opacity=".92"/><path d="M35 138c7-30 25-46 45-46s38 16 45 46" fill="#F8FAFC" fill-opacity=".92"/><text x="80" y="150" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="800" fill="${background}">${symbol}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  private async saveProfile() {
    this.successMessage = '';

    this.saving = true;

    try {
      const avatarUrl = this.selectedAvatar
        ? await this.supabaseService.uploadAvatar(this.userId, this.selectedAvatar)
        : this.avatarPreview || this.defaultAvatar(this.gender);

      const profile: ProfileInput = {
        id: this.userId,
        full_name: this.fullName.trim(),
        username: this.username.trim(),
        phone_number: this.phoneNumber.trim(),
        gender: this.gender,
        date_of_birth: this.dateOfBirth,
        age: this.age ?? 0,
        height_cm: this.heightCm ?? 0,
        weight_kg: this.weightKg ?? 0,
        blood_group: this.bloodGroup || null,
        avatar_url: avatarUrl,
        activity_level: this.activityLevel,
        profession: this.profession,
        profile_completed: true
      };

      await this.supabaseService.saveProfile(profile);

      this.successMessage = 'Profile saved. Taking you to your dashboard...';
      await this.router.navigateByUrl('/dashboard');
    } catch (error: any) {
      if (error?.code === '23505' || String(error?.message ?? '').toLowerCase().includes('duplicate key')) {
        this.currentStep = 1;
        this.errorMessage = 'That username is already in use. Please choose another one.';
      } else if (String(error?.message ?? '').toLowerCase().includes('profile-avatars')) {
        this.errorMessage = 'Profile photo storage is not configured yet. You can continue without a photo, or run the Supabase schema setup.';
      } else {
        this.errorMessage = error?.message || 'Unable to save your profile.';
      }
    } finally {
      this.saving = false;
    }
  }
}
