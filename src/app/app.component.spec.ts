import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { SupabaseService } from './services/supabase.service';

describe('AppComponent', () => {
  const supabaseServiceStub = {
    getCurrentUser: jasmine.createSpy().and.resolveTo(null),
    resolvePostAuthRoute: jasmine.createSpy().and.resolveTo('/dashboard'),
    onAuthStateChange: jasmine.createSpy().and.returnValue({
      data: {
        subscription: {
          unsubscribe: jasmine.createSpy()
        }
      }
    })
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        {
          provide: SupabaseService,
          useValue: supabaseServiceStub
        }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'FitPal' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('FitPal');
  });

  it('should render the router outlet shell', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });
});
