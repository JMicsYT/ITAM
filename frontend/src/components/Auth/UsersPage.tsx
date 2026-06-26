import { useCallback, useEffect, useState } from 'react';
import {
  UserPlus, Shield, Users, RefreshCw,
  LockKeyhole, Unlock, Key, CheckCircle2, XCircle
} from 'lucide-react';
import clsx from 'clsx';
import { authApi, type AuthUser } from '../../api/auth';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';

// ============================================================
// UsersPage — Управление пользователями (только для admin)
// ============================================================

type Role = 'admin' | 'technician' | 'viewer';

const ROLE_CONFIG: Record<Role, { label: string; color: string; icon: React.ReactNode }> = {
  admin:      { label: 'Администратор', color: 'text-rose-400',   icon: <Shield className="w-3.5 h-3.5" /> },
  technician: { label: 'Техник',        color: 'text-cyan-400',   icon: <Key className="w-3.5 h-3.5" /> },
  viewer:     { label: 'Наблюдатель',   color: 'text-slate-400',  icon: <Users className="w-3.5 h-3.5" /> },
};

function RoleBadge({ role }: { role: Role }) {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.viewer;
  return (
    <span className={clsx('badge flex items-center gap-1.5', cfg.color)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Create User Form ────────────────────────────────────────
interface CreateFormData {
  username: string;
  password: string;
  fullName: string;
  role: Role;
}

function CreateUserModal({
  onSuccess,
  onClose,
}: {
  onSuccess: (user: AuthUser) => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CreateFormData>({
    username: '',
    password: '',
    fullName: '',
    role: 'technician',
  });
  const [errors, setErrors] = useState<Partial<CreateFormData>>({});

  function validate(): boolean {
    const e: Partial<CreateFormData> = {};
    if (form.username.trim().length < 3) e.username = 'Минимум 3 символа';
    if (form.password.length < 6)       e.password = 'Минимум 6 символов';
    if (!form.fullName.trim())          e.fullName = 'Укажите ФИО';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await authApi.createUser(form);
      toast('success', 'Пользователь создан', `${form.fullName} (${form.username})`);
      onSuccess(res.data);
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message || 'Ошибка создания';
      toast('error', 'Ошибка', msg);
    } finally {
      setSubmitting(false);
    }
  }

  const field = (name: keyof CreateFormData, label: string, type = 'text', placeholder = '') => (
    <div>
      <label className="form-label">{label}</label>
      <input
        type={type}
        className={clsx('input-field', errors[name] && 'border-rose-500/50')}
        placeholder={placeholder}
        value={form[name] as string}
        onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
        autoComplete={type === 'password' ? 'new-password' : 'off'}
      />
      {errors[name] && <p className="text-xs text-rose-400 mt-1">{errors[name]}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {field('fullName', 'ФИО', 'text', 'Иванов Иван Иванович')}
      {field('username', 'Логин', 'text', 'ivanov')}
      {field('password', 'Пароль', 'password', '••••••••')}
      <div>
        <label className="form-label">Роль</label>
        <select
          className="select-field"
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
        >
          <option value="admin">Администратор</option>
          <option value="technician">Техник</option>
          <option value="viewer">Наблюдатель</option>
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1" disabled={submitting}>
          <UserPlus className="w-4 h-4" />
          {submitting ? 'Создание...' : 'Создать'}
        </button>
        <button type="button" className="btn-ghost" onClick={onClose}>Отмена</button>
      </div>
    </form>
  );
}

// ─── Change Password Form ────────────────────────────────────
function ChangePasswordModal({
  user,
  onClose,
}: {
  user: AuthUser;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { toast('error', 'Ошибка', 'Пароль минимум 6 символов'); return; }
    if (password !== confirm) { toast('error', 'Ошибка', 'Пароли не совпадают'); return; }
    setSubmitting(true);
    try {
      await authApi.changePassword(user.id, password);
      toast('success', 'Пароль изменён', user.fullName);
      onClose();
    } catch (err: unknown) {
      toast('error', 'Ошибка', (err as { message?: string }).message || '');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-400">
        Изменение пароля для <strong className="text-slate-200">{user.fullName}</strong>
      </p>
      <div>
        <label className="form-label">Новый пароль</label>
        <input type="password" className="input-field" value={password}
          onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
      </div>
      <div>
        <label className="form-label">Повторите пароль</label>
        <input type="password" className="input-field" value={confirm}
          onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1" disabled={submitting}>
          {submitting ? 'Сохранение...' : 'Сохранить пароль'}
        </button>
        <button type="button" className="btn-ghost" onClick={onClose}>Отмена</button>
      </div>
    </form>
  );
}

// ─── User Row ────────────────────────────────────────────────
interface FullUser extends AuthUser {
  isActive: boolean;
  createdAt?: string;
}

function UserRow({
  user,
  isSelf,
  onToggle,
  onChangePassword,
}: {
  user: FullUser;
  isSelf: boolean;
  onToggle: () => void;
  onChangePassword: () => void;
}) {
  return (
    <div
      className={clsx(
        'card-stat p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all',
        !user.isActive && 'opacity-50'
      )}
      style={{ borderColor: '#1e1e3a' }}
    >
      <div className="h-[1px] w-full absolute top-0 left-0" style={{ background: 'linear-gradient(90deg, rgba(0,245,255,0.2), transparent)' }} />
      {/* Avatar */}
      <div
        className={clsx(
          'w-10 h-10 rounded-none flex items-center justify-center text-sm font-bold shrink-0',
          user.isActive ? 'bg-[rgba(0,245,255,0.1)] text-[#00f5ff] border border-[#00f5ff55]' : 'bg-[#1e1e3a] text-[#555577] border border-[#1e1e3a]'
        )}
        style={{ fontFamily: 'Orbitron, monospace', clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%)' }}
      >
        {user.fullName.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm" style={{ color: '#e8eaff', fontFamily: 'JetBrains Mono, monospace' }}>{user.fullName}</p>
          {isSelf && (
            <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 font-bold" style={{ color: '#00ff88', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)' }}>
              Вы
            </span>
          )}
        </div>
        <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: '#00f5ff', fontFamily: 'JetBrains Mono, monospace' }}>@{user.username}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <RoleBadge role={user.role} />
          {user.isActive ? (
            <span className="badge text-[#00ff88] border-[#00ff8855] flex items-center gap-1 bg-[rgba(0,255,136,0.05)]">
              <CheckCircle2 className="w-3 h-3" /> Активен
            </span>
          ) : (
            <span className="badge text-[#ff2255] border-[#ff225555] flex items-center gap-1 bg-[rgba(255,34,85,0.05)]">
              <XCircle className="w-3 h-3" /> Заблокирован
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      {!isSelf && (
        <div className="flex gap-2 shrink-0">
          <button
            onClick={onChangePassword}
            className="btn-ghost text-xs py-2 px-3"
            title="Сменить пароль"
          >
            <Key className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggle}
            className={clsx(
              'text-[10px] uppercase tracking-wider py-2 px-3 font-bold flex items-center gap-1.5 transition-all min-h-[44px]',
              user.isActive
                ? 'bg-[rgba(255,34,85,0.08)] text-[#ff2255] border border-[rgba(255,34,85,0.4)] hover:bg-[rgba(255,34,85,0.15)] hover:shadow-[0_0_8px_rgba(255,34,85,0.4)]'
                : 'bg-[rgba(0,255,136,0.08)] text-[#00ff88] border border-[rgba(0,255,136,0.4)] hover:bg-[rgba(0,255,136,0.15)] hover:shadow-[0_0_8px_rgba(0,255,136,0.4)]'
            )}
            style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
            title={user.isActive ? 'Заблокировать' : 'Активировать'}
          >
            {user.isActive ? <LockKeyhole className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            {user.isActive ? 'Заблокировать' : 'Активировать'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export function UsersPage({ currentUserId }: { currentUserId: string }) {
  const { toast } = useToast();
  const [users, setUsers] = useState<FullUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [passUser, setPassUser] = useState<FullUser | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authApi.listUsers();
      setUsers(res.data as FullUser[]);
    } catch {
      toast('error', 'Ошибка', 'Не удалось загрузить список пользователей');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  async function handleToggle(user: FullUser) {
    try {
      const res = await authApi.toggleUser(user.id);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: res.data.isActive } : u))
      );
      toast('success', res.data.isActive ? 'Пользователь активирован' : 'Пользователь заблокирован', user.fullName);
    } catch {
      toast('error', 'Ошибка', 'Не удалось изменить статус');
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Users className="w-5 h-5" style={{ color: '#00f5ff', filter: 'drop-shadow(0 0 6px #00f5ff)' }} />
            <h1
              className="text-xl md:text-2xl font-black uppercase tracking-widest"
              style={{ fontFamily: 'Orbitron, monospace', color: '#e8eaff' }}
            >
              Сотрудники
            </h1>
          </div>
          <p className="text-[10px] uppercase tracking-[0.15em]" style={{ color: '#555577', fontFamily: 'JetBrains Mono, monospace' }}>
            // Управление персоналом
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchUsers} className="btn-ghost py-2 px-3" title="Обновить">
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <UserPlus className="w-4 h-4" /> Создать
          </button>
        </div>
      </div>

      {/* User List */}
      <div className="space-y-3">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="card-cyber p-4">
              <div className="flex items-center gap-4">
                <div className="skeleton w-10 h-10 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-40" />
                  <div className="skeleton h-3 w-24" />
                </div>
              </div>
            </div>
          ))
        ) : users.length === 0 ? (
          <p className="text-center text-slate-500 py-10">Пользователи не найдены</p>
        ) : (
          users.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              isSelf={u.id === currentUserId}
              onToggle={() => void handleToggle(u)}
              onChangePassword={() => setPassUser(u)}
            />
          ))
        )}
      </div>

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новый пользователь" size="sm">
        <CreateUserModal
          onSuccess={(newUser) => {
            setUsers((prev) => [...prev, { ...newUser, isActive: true }]);
            setCreateOpen(false);
          }}
          onClose={() => setCreateOpen(false)}
        />
      </Modal>

      {/* Change Password Modal */}
      <Modal
        open={!!passUser}
        onClose={() => setPassUser(null)}
        title="Смена пароля"
        size="sm"
      >
        {passUser && (
          <ChangePasswordModal user={passUser} onClose={() => setPassUser(null)} />
        )}
      </Modal>
    </div>
  );
}
