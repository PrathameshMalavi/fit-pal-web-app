import { Injectable } from '@angular/core';
import {
  AuthChangeEvent,
  createClient,
  Session,
  SupabaseClient,
  User
} from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export interface UserProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  phone_number: string | null;
  gender: string | null;
  date_of_birth: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  blood_group: string | null;
  avatar_url: string | null;
  activity_level: string | null;
  profession: string | null;
  profile_completed: boolean | null;
  fitness_goals: string | null;
  updated_at: string | null;
}

export interface ProfileInput {
  id: string;
  username: string;
  full_name: string;
  phone_number: string;
  gender: string;
  date_of_birth: string;
  age: number;
  height_cm: number;
  weight_kg: number;
  blood_group: string | null;
  avatar_url: string;
  activity_level: string;
  profession: string;
  profile_completed: boolean;
}

export interface SignUpResult {
  kind: 'confirmation_sent' | 'existing_account' | 'signed_in';
  user: User | null;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl || 'https://placeholder.supabase.co',
      environment.supabaseKey || 'placeholder-key'
    );
  }

  get user(): Promise<User | null> {
    return this.supabase.auth.getUser().then(({ data }) => data.user);
  }

  async getCurrentUser() {
    return this.user;
  }

  async signUp(email: string, password: string): Promise<SignUpResult> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password
    });
    if (error) {
      throw error;
    }

    const identities = data.user?.identities ?? [];
    if (data.user && !data.session && identities.length === 0) {
      return {
        kind: 'existing_account',
        user: data.user
      };
    }

    return {
      kind: data.session ? 'signed_in' : 'confirmation_sent',
      user: data.user
    };
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      throw error;
    }
    return data;
  }

  async resetPassword(email: string) {
    const redirectTo =
      typeof window === 'undefined'
        ? undefined
        : `${window.location.origin}/reset-password`;

    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });

    if (error) {
      throw error;
    }
  }

  async updatePassword(password: string) {
    const { data, error } = await this.supabase.auth.updateUser({ password });
    if (error) {
      throw error;
    }
    return data;
  }

  private isProfileSchemaUnavailable(error: any) {
    const message = String(error?.message ?? '').toLowerCase();
    const code = String(error?.code ?? '').toLowerCase();

    return (
      code === 'pgrst205' ||
      code === 'pgrst204' ||
      message.includes("could not find the table 'public.profiles'") ||
      message.includes("relation 'public.profiles' does not exist") ||
      message.includes("relation \"public.profiles\" does not exist") ||
      message.includes('could not find the') ||
      message.includes('schema cache')
    );
  }

  private mapUserToProfile(user: User | null): UserProfile | null {
    if (!user) {
      return null;
    }

    const metadata = user.user_metadata ?? {};

    return {
      id: user.id,
      full_name: typeof metadata['full_name'] === 'string' ? metadata['full_name'] : null,
      username: typeof metadata['username'] === 'string' ? metadata['username'] : null,
      phone_number: typeof metadata['phone_number'] === 'string' ? metadata['phone_number'] : null,
      gender: typeof metadata['gender'] === 'string' ? metadata['gender'] : null,
      date_of_birth: typeof metadata['date_of_birth'] === 'string' ? metadata['date_of_birth'] : null,
      age: typeof metadata['age'] === 'number' ? metadata['age'] : null,
      height_cm: typeof metadata['height_cm'] === 'number' ? metadata['height_cm'] : null,
      weight_kg: typeof metadata['weight_kg'] === 'number' ? metadata['weight_kg'] : null,
      blood_group: typeof metadata['blood_group'] === 'string' ? metadata['blood_group'] : null,
      avatar_url: typeof metadata['avatar_url'] === 'string' ? metadata['avatar_url'] : null,
      activity_level: typeof metadata['activity_level'] === 'string' ? metadata['activity_level'] : null,
      profession: typeof metadata['profession'] === 'string' ? metadata['profession'] : null,
      profile_completed: metadata['profile_completed'] === true,
      fitness_goals: typeof metadata['fitness_goals'] === 'string' ? metadata['fitness_goals'] : null,
      updated_at: typeof metadata['updated_at'] === 'string' ? metadata['updated_at'] : null
    };
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, full_name, username, phone_number, gender, date_of_birth, age, height_cm, weight_kg, blood_group, avatar_url, activity_level, profession, profile_completed, fitness_goals, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      if (!this.isProfileSchemaUnavailable(error)) {
        throw error;
      }

      const user = await this.getCurrentUser();
      return user?.id === userId ? this.mapUserToProfile(user) : null;
    }

    if (data) {
      return data;
    }

    const user = await this.getCurrentUser();
    return user?.id === userId ? this.mapUserToProfile(user) : null;
  }

  isProfileComplete(profile: UserProfile | null) {
    return Boolean(
      profile?.profile_completed &&
      profile.username?.trim() &&
      profile.full_name?.trim() &&
      profile.phone_number?.trim() &&
      profile.gender?.trim() &&
      profile.date_of_birth &&
      profile.age &&
      profile.height_cm &&
      profile.weight_kg &&
      profile.activity_level?.trim() &&
      profile.profession?.trim()
    );
  }

  async resolvePostAuthRoute(userId: string) {
    const profile = await this.getProfile(userId);
    return this.isProfileComplete(profile) ? '/dashboard' : '/profile-setup';
  }

  async uploadAvatar(userId: string, file: File) {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${userId}/avatar.${extension}`;
    const { error } = await this.supabase.storage.from('profile-avatars').upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: true
    });

    if (error) {
      throw error;
    }

    const { data } = this.supabase.storage.from('profile-avatars').getPublicUrl(path);
    return data.publicUrl;
  }

  async saveProfile(profile: ProfileInput) {
    const updatedAt = new Date().toISOString();
    const { error } = await this.supabase.from('profiles').upsert({
      ...profile,
      updated_at: updatedAt
    });

    if (error) {
      if (!this.isProfileSchemaUnavailable(error)) {
        throw error;
      }

      const currentUser = await this.getCurrentUser();
      if (!currentUser || currentUser.id !== profile.id) {
        throw error;
      }

      const { error: updateError } = await this.supabase.auth.updateUser({
        data: {
          ...profile,
          updated_at: updatedAt
        }
      });

      if (updateError) {
        throw updateError;
      }
    }
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut({ scope: 'local' });
    if (error) {
      throw error;
    }
  }

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void | Promise<void>) {
    return this.supabase.auth.onAuthStateChange((event, session) => {
      void callback(event, session);
    });
  }
}
