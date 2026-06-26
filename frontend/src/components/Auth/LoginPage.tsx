import { useState, type FormEvent } from 'react';
import { Lock, User, Eye, EyeOff, AlertCircle, Cpu, Terminal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ============================================================
// LoginPage — Cyberpunk HUD Authentication Terminal
// ============================================================

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) { setError('Заполните все поля'); return; }
    setLoading(true);
    setError('');
    try {
      await login(username.trim(), password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-dvh flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--color-deep)' }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Neon orbs */}
      <div
        className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,245,255,0.06) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(180,0,255,0.05) 0%, transparent 70%)' }}
      />

      <div
        className="relative w-full max-w-sm"
        style={{ animation: 'var(--animate-slide-up)' }}
      >

        {/* Logo block */}
        <div className="text-center mb-8">
          {/* HUD icon */}
          <div
            className="inline-flex w-20 h-20 items-center justify-center mb-5 relative"
            style={{
              border: '1px solid #00f5ff',
              background: 'rgba(0,245,255,0.05)',
              clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
              boxShadow: '0 0 20px #00f5ff33, 0 0 60px #00f5ff1a, inset 0 0 20px #00f5ff08',
            }}
          >
            {/* Animated ring */}
            <div
              className="absolute inset-2 rounded-full"
              style={{
                border: '1px solid #00f5ff33',
                animation: 'glowPulse 2s ease-in-out infinite alternate',
              }}
            />
            <Cpu className="w-8 h-8 relative z-10" style={{ color: '#00f5ff', filter: 'drop-shadow(0 0 8px #00f5ff)' }} />
          </div>

          <h1
            className="text-3xl font-black uppercase tracking-widest mb-1"
            style={{
              fontFamily: 'Orbitron, monospace',
              color: '#00f5ff',
              textShadow: '0 0 20px #00f5ff88, 0 0 40px #00f5ff44',
              letterSpacing: '0.3em',
            }}
          >
            ITAM
          </h1>
          <p
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ color: '#555577', fontFamily: 'JetBrains Mono, monospace' }}
          >
            Asset Control System v3.0
          </p>
        </div>

        {/* Login card */}
        <div
          className="relative p-6"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
            boxShadow: '0 0 40px rgba(0,0,0,0.6), inset 0 0 40px rgba(0,245,255,0.02)',
          }}
        >
          {/* Corner decorations */}
          <div
            className="absolute top-0 right-0 w-5 h-5 pointer-events-none"
            style={{
              borderTop: '1px solid #00f5ff',
              borderRight: '1px solid #00f5ff',
              boxShadow: '2px -2px 8px #00f5ff44',
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-5 h-5 pointer-events-none"
            style={{
              borderBottom: '1px solid #b400ff',
              borderLeft: '1px solid #b400ff',
              boxShadow: '-2px 2px 8px #b400ff44',
            }}
          />

          {/* Terminal title */}
          <div className="flex items-center gap-2 mb-5">
            <Terminal className="w-3.5 h-3.5" style={{ color: '#00f5ff' }} />
            <span
              className="text-[11px] uppercase tracking-[0.15em]"
              style={{ color: '#8888aa', fontFamily: 'JetBrains Mono, monospace' }}
            >
              // Авторизация
            </span>
            <div className="flex-1 h-[1px]" style={{ background: 'linear-gradient(90deg, #00f5ff22, transparent)' }} />
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-center gap-2 p-3 mb-4 text-sm"
              style={{
                background: 'rgba(255,34,85,0.08)',
                border: '1px solid rgba(255,34,85,0.35)',
                clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
                color: '#ff2255',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.75rem',
              }}
            >
              <AlertCircle className="w-4 h-4 shrink-0" style={{ filter: 'drop-shadow(0 0 4px #ff2255)' }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="form-label">[ логин ]</label>
              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: '#00f5ff88' }}
                />
                <input
                  className="input-field pl-9"
                  autoComplete="username"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="form-label">[ пароль ]</label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: '#00f5ff88' }}
                />
                <input
                  className="input-field pl-9 pr-10"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#555577' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#00f5ff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#555577'; }}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn-cyber-filled w-full justify-center mt-2"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  CONNECTING...
                </span>
              ) : 'ВОЙТИ В СИСТЕМУ'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p
          className="text-center text-[9px] uppercase tracking-[0.2em] mt-5"
          style={{ color: '#333355', fontFamily: 'JetBrains Mono, monospace' }}
        >
          On-Premise · Encrypted · Local Storage
        </p>
      </div>
    </div>
  );
}
