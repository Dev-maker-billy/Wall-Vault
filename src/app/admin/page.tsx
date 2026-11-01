'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import Dashboard from '@/components/admin/Dashboard';
import SignIn from '@/components/admin/SignIn';

export default function AdminPage() {
  const supabase = getSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
      {!supabase ? (
        <div className="max-w-lg rounded-2xl border border-line bg-panel p-6">
          <h1 className="font-display text-lg font-bold">Supabase isn&apos;t connected</h1>
          <p className="mt-2 text-sm leading-relaxed text-mute">
            Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your Vercel project
            settings, then redeploy.
          </p>
        </div>
      ) : !ready ? (
        <p className="text-sm text-mute">Loading…</p>
      ) : session ? (
        <Dashboard email={session.user.email ?? ''} />
      ) : (
        <SignIn />
      )}
    </main>
  );
}
