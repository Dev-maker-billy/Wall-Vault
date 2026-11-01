'use client';

import { useState, type FormEvent } from 'react';
import { getSupabase } from '@/lib/supabase';

export default function SignIn() {
  const supabase = getSupabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError('Email or password is incorrect.');
    setBusy(false);
  }

  return (
    <div className="grid gap-10 py-6 lg:grid-cols-[1fr_400px] lg:items-center lg:gap-20 lg:py-20">
      <div>
        <p className="font-display text-base font-bold tracking-tight">Wall Vault</p>
        <h1 className="mt-8 font-display text-[2rem] font-bold leading-[1.1] tracking-tight sm:text-5xl">
          Sign in to manage your wallpapers
        </h1>
        <p className="mt-5 max-w-md leading-relaxed text-mute">
          Add new wallpapers, tag them, and remove old ones. You stay signed in on this device until
          you press Sign out.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-line bg-panel p-6">
        <div>
          <label htmlFor="admin-email" className="mb-1.5 block text-sm text-mute">
            Email
          </label>
          <input
            id="admin-email"
            name="email"
            className="field"
            type="email"
            autoComplete="username"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="admin-password" className="mb-1.5 block text-sm text-mute">
            Password
          </label>
          <input
            id="admin-password"
            name="password"
            className="field"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div aria-live="polite" className="min-h-5 text-sm">
          {error && <p className="text-danger">{error}</p>}
        </div>
        <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
