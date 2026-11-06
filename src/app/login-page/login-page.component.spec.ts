import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LoginPageComponent } from './login-page.component';
import { SupabaseService } from '../services/supabase.service';

describe('LoginPageComponent', () => {
  let component: LoginPageComponent;
  let fixture: ComponentFixture<LoginPageComponent>;
  const supabaseServiceStub = {
    getCurrentUser: jasmine.createSpy().and.resolveTo(null),
    resolvePostAuthRoute: jasmine.createSpy().and.resolveTo('/dashboard'),
    resetPassword: jasmine.createSpy(),
    signUp: jasmine.createSpy(),
    signIn: jasmine.createSpy()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: SupabaseService,
          useValue: supabaseServiceStub
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
