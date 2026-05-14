import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = await login(email.trim(), password);
      navigate(u.role === 'admin' ? '/admin' : u.role === 'scanner' ? '/scanner' : '/student');
    } catch {
      setError('Invalid credentials or server unreachable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-screen max-w-xl place-content-center px-4 py-14">
      <div className="rounded-3xl border border-white/70 bg-white/90 p-8 shadow-panel backdrop-blur-lg">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Campus Desk</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Sign in securely</h1>
        <p className="mt-2 text-slate-600">
          Administrators manage rosters & lectures. Students biometrically check in per session.
        </p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              autoComplete="email"
              required
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none ring-brand-600/40 focus:border-brand-500 focus:ring"
              placeholder="alice@student.edu"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none ring-brand-600/40 focus:border-brand-500 focus:ring"
              placeholder="••••••••"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white shadow-panel transition hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Continue'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          <Link className="text-brand-700 hover:underline" to="/">
            ← Back home
          </Link>
        </p>
      </div>
    </div>
  );
}
