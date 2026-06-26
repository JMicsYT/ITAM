import { useState, type FormEvent } from 'react';
import { Lock, User, Eye, EyeOff, AlertCircle, Cpu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

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
    <div className="min-h-dvh flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden">
      <div className="relative w-full max-w-sm animate-fade-in z-10">

        {/* Logo block */}
        <div className="text-center mb-8">
          <div className="inline-flex w-20 h-20 items-center justify-center mb-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="w-16 h-16 rounded-xl bg-blue-50 flex items-center justify-center">
              <Cpu className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-display font-black tracking-widest mb-1 text-slate-800">
            ITAM
          </h1>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
            Asset Control System v3.0
          </p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50">
          <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Авторизация</h2>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 mb-6 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="form-label block mb-2 text-sm font-bold text-slate-700">Логин</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  className={clsx("input-field pl-12 py-3 rounded-xl w-full", error && "border-red-300 focus:border-red-500 focus:ring-red-500")}
                  autoComplete="username"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="form-label block mb-2 text-sm font-bold text-slate-700">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  className={clsx("input-field pl-12 pr-12 py-3 rounded-xl w-full", error && "border-red-300 focus:border-red-500 focus:ring-red-500")}
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center mt-4"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Вход...
                </span>
              ) : 'Войти в систему'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs font-medium text-slate-400 mt-8">
          On-Premise · Encrypted · Local Storage
        </p>
      </div>
    </div>
  );
}
