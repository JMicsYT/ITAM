import { useCallback, useEffect, useState } from 'react';
import {
  UserPlus, Shield, Users, RefreshCw,
  LockKeyhole, Unlock, Key, CheckCircle2, XCircle
} from 'lucide-react';
import clsx from 'clsx';
import { authApi, type AuthUser } from '../../api/auth';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';

type Role = 'admin' | 'technician' | 'viewer';

const ROLE_CONFIG: Record<Role, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  admin:      { label: 'Администратор', bg: 'bg-rose-500/10',  text: 'text-rose-400',   icon: <Shield className="w-3.5 h-3.5" /> },
  technician: { label: 'Техник',        bg: 'bg-cyan-500/10',  text: 'text-cyan-400',   icon: <Key className="w-3.5 h-3.5" /> },
  viewer:     { label: 'Наблюдатель',   bg: 'bg-slate-800',    text: 'text-slate-400',  icon: <Users className="w-3.5 h-3.5" /> },
};

function RoleBadge({ role }: { role: Role }) {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.viewer;
  return (
    <span className={clsx('badge border border-transparent font-medium flex items-center gap-1.5', cfg.bg, cfg.text)}>
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
        className={clsx('input-field', errors[name] && 'border-red-500 bg-red-500/10')}
        placeholder={placeholder}
        value={form[name] as string}
        onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
        autoComplete={type === 'password' ? 'new-password' : 'off'}
      />
      {errors[name] && <p className="text-xs font-bold text-red-500 mt-1.5">{errors[name]}</p>}
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
      <div className="flex gap-3 pt-4 border-t border-slate-700/50">
        <button type="submit" className="btn-primary flex-1 justify-center" disabled={submitting}>
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
      <p className="text-sm font-medium text-slate-400 mb-4">
        Изменение пароля для <strong className="text-slate-100">{user.fullName}</strong>
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
      <div className="flex gap-3 pt-4 border-t border-slate-700/50">
        <button type="submit" className="btn-primary flex-1 justify-center" disabled={submitting}>
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
        'bg-slate-800 border border-slate-700 rounded-xl shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all hover:shadow-md active:scale-[0.99]',
        !user.isActive && 'opacity-60 bg-slate-800/50 grayscale-[0.2]'
      )}
    >
      {/* Avatar */}
      <div
        className={clsx(
          'w-12 h-12 rounded-full flex items-center justify-center text-lg font-display font-bold shrink-0',
          user.isActive ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-500'
        )}
      >
        {user.fullName.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="font-display font-bold text-slate-100 text-base">{user.fullName}</p>
          {isSelf && (
            <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 font-bold rounded-full bg-green-500/10 text-green-400">
              Вы
            </span>
          )}
        </div>
        <p className="text-xs font-medium text-slate-400 mb-2">@{user.username}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <RoleBadge role={user.role} />
          {user.isActive ? (
            <span className="badge border font-medium border-green-500/20 text-green-400 flex items-center gap-1.5 bg-green-500/10">
              <CheckCircle2 className="w-3.5 h-3.5" /> Активен
            </span>
          ) : (
            <span className="badge border font-medium border-red-500/20 text-red-400 flex items-center gap-1.5 bg-red-500/10">
              <XCircle className="w-3.5 h-3.5" /> Заблокирован
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      {!isSelf && (
        <div className="flex gap-2 shrink-0 sm:self-center mt-3 sm:mt-0">
          <button
            onClick={onChangePassword}
            className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-blue-400 transition-colors"
            title="Сменить пароль"
          >
            <Key className="w-4 h-4" />
          </button>
          <button
            onClick={onToggle}
            className={clsx(
              'px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-2 transition-colors',
              user.isActive
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
            )}
            title={user.isActive ? 'Заблокировать' : 'Активировать'}
          >
            {user.isActive ? <LockKeyhole className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
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
    <div className="p-4 md:p-8 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-display font-bold text-slate-100">
              Сотрудники
            </h1>
          </div>
          <p className="text-sm font-medium text-slate-400 ml-12">
            Управление персоналом
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchUsers} className="btn-ghost bg-slate-800 border border-slate-700 shadow-sm py-2 px-3" title="Обновить">
            <RefreshCw className={clsx('w-4 h-4 text-slate-400', loading && 'animate-spin')} />
          </button>
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <UserPlus className="w-4 h-4" /> Создать
          </button>
        </div>
      </div>

      {/* User List */}
      <div className="space-y-4">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="surface p-4 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="skeleton w-12 h-12 rounded-full shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="skeleton h-4 w-40 rounded" />
                  <div className="skeleton h-3 w-24 rounded" />
                </div>
              </div>
            </div>
          ))
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-600" />
            </div>
            <p className="font-bold text-slate-300">Пользователи не найдены</p>
          </div>
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
