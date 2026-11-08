@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private storage = typeof localStorage !== 'undefined' ? localStorage : null;

  private _user = signal<AuthUser | null>(this.readUser());
  user = this._user.asReadonly();
  isLoggedIn = computed(() => this._user() !== null);
  isAdmin = computed(() => this._user()?.role === 'ADMIN');

  get token(): string | null {
    return this.storage?.getItem('token') ?? null;
  }

  // en login(): this.storage?.setItem('token', ...) y this.storage?.setItem('user', ...)
  // en logout(): this.storage?.removeItem('token') y this.storage?.removeItem('user')

  private readUser(): AuthUser | null {
    try {
      const raw = this.storage?.getItem('user');
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }
}