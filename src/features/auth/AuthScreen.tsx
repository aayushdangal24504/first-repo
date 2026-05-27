import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { LockKeyhole, Mail, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/auth-store';

export const AuthScreen = () => {
  const { mode, loading, error, resetEmail, login, register, requestReset, resetPassword, setMode } = useAuthStore();
  const [email, setEmail] = useState(resetEmail);
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === 'login') await login({ email, password, rememberMe });
    if (mode === 'register') await register({ email, password, displayName, rememberMe });
    if (mode === 'forgot') await requestReset(email);
    if (mode === 'reset') await resetPassword({ email: email || resetEmail, code, password });
  };

  const title = mode === 'register' ? 'Create your local account' : mode === 'forgot' ? 'Reset your password' : mode === 'reset' ? 'Enter reset code' : 'Welcome back';
  const subtitle = mode === 'register'
    ? 'Your Ayvukta space stays local, private, and separated from every other account on this Mac.'
    : mode === 'forgot' || mode === 'reset'
      ? 'We will verify your email before changing the local password.'
      : 'Unlock your personal Life OS on this laptop.';

  return (
    <div className="grid min-h-screen place-items-center overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(148,187,166,.28),transparent_32rem),radial-gradient(circle_at_80%_0%,rgba(233,182,101,.18),transparent_28rem)] p-6">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[980px]">
        <Card className="grid overflow-hidden p-0 md:grid-cols-[1fr_440px]">
          <div className="relative min-h-[580px] p-10">
            <div className="absolute inset-0 opacity-60" style={{ background: 'linear-gradient(135deg, rgba(87,121,104,.18), transparent 42%), radial-gradient(circle at 75% 20%, rgba(231,177,108,.18), transparent 28%)' }} />
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <div className="grid h-14 w-14 place-items-center rounded-3xl bg-accent text-white shadow-soft"><Sparkles className="h-6 w-6" /></div>
                <h1 className="mt-8 font-display text-6xl font-bold leading-tight">Ayvukta<br />Local Life OS</h1>
                <p className="mt-5 max-w-md text-lg leading-8 text-muted">Multiple local accounts. One computer. Clean separation. No cloud account required.</p>
              </div>
              <p className="text-sm font-semibold text-muted">Existing local data will be assigned to the first account that logs in after this update.</p>
            </div>
          </div>
          <form onSubmit={(event) => void submit(event)} className="border-l border-line/70 bg-elevated/70 p-8 backdrop-blur-xl">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent">Private local login</p>
            <h2 className="mt-3 font-display text-4xl font-bold">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{subtitle}</p>
            <div className="mt-8 space-y-4">
              {mode === 'register' && <input className="w-full rounded-2xl border border-line bg-surface/70 px-4 py-3 outline-none focus:border-accent" placeholder="Display name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />}
              <label className="flex items-center gap-3 rounded-2xl border border-line bg-surface/70 px-4 py-3 focus-within:border-accent"><Mail className="h-4 w-4 text-muted" /><input className="min-w-0 flex-1 bg-transparent outline-none" type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
              {mode !== 'forgot' && <label className="flex items-center gap-3 rounded-2xl border border-line bg-surface/70 px-4 py-3 focus-within:border-accent"><LockKeyhole className="h-4 w-4 text-muted" /><input className="min-w-0 flex-1 bg-transparent outline-none" type="password" placeholder={mode === 'reset' ? 'New password' : 'Password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} /></label>}
              {mode === 'reset' && <input className="w-full rounded-2xl border border-line bg-surface/70 px-4 py-3 outline-none focus:border-accent" placeholder="6-digit verification code" value={code} onChange={(event) => setCode(event.target.value)} required />}
              {mode !== 'forgot' && mode !== 'reset' && <label className="flex items-center gap-2 text-sm font-semibold text-muted"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /> Remember me</label>}
              {error && <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
              <Button type="submit" variant="primary" className="w-full" disabled={loading}>{loading ? 'Working...' : mode === 'forgot' ? 'Send reset code' : mode === 'reset' ? 'Reset password' : mode === 'register' ? 'Create account' : 'Login'}</Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold text-muted">
              {mode !== 'login' && <button type="button" onClick={() => setMode('login')} className="hover:text-ink">Back to login</button>}
              {mode === 'login' && <button type="button" onClick={() => setMode('register')} className="hover:text-ink">Create account</button>}
              {mode === 'login' && <button type="button" onClick={() => setMode('forgot')} className="hover:text-ink">Forgot password?</button>}
              {mode === 'forgot' && <button type="button" onClick={() => setMode('reset')} className="hover:text-ink">I have a code</button>}
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};
