import { randomBytes, randomUUID, createHash } from 'node:crypto';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import type { AppDatabase } from '../database/client';

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  avatarInitials: string;
  createdAt: string;
  lastLoginAt: string | null;
};

type UserRow = {
  id: string;
  email: string;
  displayName: string;
  avatarInitials: string;
  createdAt: string;
  lastLoginAt: string | null;
};

type SessionRow = { id: string; userId: string; expiresAt: string | null };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OWNED_TABLES = ['folders', 'tags', 'tasks', 'notes', 'journals', 'journal_entries', 'trips', 'trip_days', 'memories', 'reminders', 'mood_logs', 'media_files', 'templates', 'entity_tags'];

const hashValue = (value: string): string => createHash('sha256').update(value).digest('hex');
const normalizeEmail = (email: string): string => email.trim().toLowerCase();
const initialsFor = (email: string, displayName?: string): string => {
  const source = (displayName?.trim() || email.split('@')[0] || 'User').replace(/[^a-zA-Z0-9 ]/g, ' ');
  return source.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U';
};
const mapUser = (row: UserRow): AuthUser => ({ id: row.id, email: row.email, displayName: row.displayName, avatarInitials: row.avatarInitials, createdAt: row.createdAt, lastLoginAt: row.lastLoginAt });

export class AuthService {
  private currentUser: AuthUser | null = null;

  constructor(private readonly db: AppDatabase) {}

  getCurrentUserId(): string {
    if (!this.currentUser) throw new Error('You must be logged in to access this data.');
    return this.currentUser.id;
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  private getUserByEmail(email: string): (UserRow & { passwordHash: string }) | null {
    return this.db.prepare(`SELECT id, email, password_hash as passwordHash, display_name as displayName, avatar_initials as avatarInitials, created_at as createdAt, last_login_at as lastLoginAt FROM users WHERE email = ?`).get(normalizeEmail(email)) as (UserRow & { passwordHash: string }) | undefined ?? null;
  }

  private createSession(userId: string, rememberMe: boolean): string {
    this.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    const token = randomBytes(32).toString('base64url');
    const expiresAt = rememberMe ? null : new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    this.db.prepare(`INSERT INTO sessions (id, user_id, token_hash, remember_me, expires_at) VALUES (?, ?, ?, ?, ?)`).run(randomUUID(), userId, hashValue(token), rememberMe ? 1 : 0, expiresAt);
    this.db.prepare(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('auth.sessionToken', ?, CURRENT_TIMESTAMP)`).run(JSON.stringify(token));
    return token;
  }

  private assignLegacyDataToFirstUser(userId: string): void {
    const existing = this.db.prepare(`SELECT value FROM auth_migrations WHERE key = 'legacy_owner_assigned'`).get() as { value: string } | undefined;
    if (existing?.value === 'true') return;

    const tx = this.db.transaction(() => {
      for (const table of OWNED_TABLES) {
        this.db.prepare(`UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`).run(userId);
      }
      this.db.prepare(`INSERT OR REPLACE INTO auth_migrations (key, value, updated_at) VALUES ('legacy_owner_assigned', 'true', CURRENT_TIMESTAMP)`).run();
    });
    tx();
  }

  async register(input: { email: string; password: string; displayName?: string; rememberMe?: boolean }): Promise<{ user: AuthUser; sessionToken: string }> {
    const email = normalizeEmail(input.email);
    if (!EMAIL_RE.test(email)) throw new Error('Enter a valid email address.');
    if (input.password.length < 8) throw new Error('Password must be at least 8 characters.');
    if (this.getUserByEmail(email)) throw new Error('An account with this email already exists.');

    const id = randomUUID();
    const now = new Date().toISOString();
    const displayName = input.displayName?.trim() || email.split('@')[0];
    const passwordHash = await bcrypt.hash(input.password, 12);
    this.db.prepare(`INSERT INTO users (id, email, password_hash, display_name, avatar_initials, created_at, updated_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, email, passwordHash, displayName, initialsFor(email, displayName), now, now, now);
    const row = this.getUserByEmail(email)!;
    const user = mapUser(row);
    this.currentUser = user;
    this.assignLegacyDataToFirstUser(user.id);
    const sessionToken = this.createSession(user.id, input.rememberMe ?? true);
    return { user, sessionToken };
  }

  async login(input: { email: string; password: string; rememberMe?: boolean }): Promise<{ user: AuthUser; sessionToken: string }> {
    const row = this.getUserByEmail(input.email);
    if (!row) throw new Error('Email or password is incorrect.');
    const ok = await bcrypt.compare(input.password, row.passwordHash);
    if (!ok) throw new Error('Email or password is incorrect.');
    this.db.prepare(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`).run(row.id);
    const refreshed = this.getUserByEmail(row.email)!;
    const user = mapUser(refreshed);
    this.currentUser = user;
    this.assignLegacyDataToFirstUser(user.id);
    const sessionToken = this.createSession(user.id, input.rememberMe ?? true);
    return { user, sessionToken };
  }

  restoreSession(): AuthUser | null {
    const setting = this.db.prepare(`SELECT value FROM settings WHERE key = 'auth.sessionToken'`).get() as { value: string } | undefined;
    if (!setting) return null;
    let token = '';
    try { token = JSON.parse(setting.value) as string; } catch { return null; }
    const row = this.db.prepare(`SELECT id, user_id as userId, expires_at as expiresAt FROM sessions WHERE token_hash = ?`).get(hashValue(token)) as SessionRow | undefined;
    if (!row) return null;
    if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) {
      this.logout();
      return null;
    }
    this.db.prepare(`UPDATE sessions SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?`).run(row.id);
    const userRow = this.db.prepare(`SELECT id, email, display_name as displayName, avatar_initials as avatarInitials, created_at as createdAt, last_login_at as lastLoginAt FROM users WHERE id = ?`).get(row.userId) as UserRow | undefined;
    this.currentUser = userRow ? mapUser(userRow) : null;
    if (this.currentUser) this.assignLegacyDataToFirstUser(this.currentUser.id);
    return this.currentUser;
  }

  logout(): void {
    const setting = this.db.prepare(`SELECT value FROM settings WHERE key = 'auth.sessionToken'`).get() as { value: string } | undefined;
    if (setting) {
      try { this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashValue(JSON.parse(setting.value) as string)); } catch {}
    }
    this.db.prepare(`DELETE FROM settings WHERE key = 'auth.sessionToken'`).run();
    this.currentUser = null;
  }

  async requestPasswordReset(emailInput: string): Promise<{ ok: true }> {
    const row = this.getUserByEmail(emailInput);
    if (!row) return { ok: true };
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    this.db.prepare(`INSERT INTO password_reset_codes (id, user_id, code_hash, expires_at) VALUES (?, ?, ?, ?)`).run(randomUUID(), row.id, await bcrypt.hash(code, 10), expiresAt);

    if (process.env.AVYUKTA_SMTP_HOST && process.env.AVYUKTA_SMTP_USER && process.env.AVYUKTA_SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.AVYUKTA_SMTP_HOST,
        port: Number(process.env.AVYUKTA_SMTP_PORT ?? 587),
        secure: process.env.AVYUKTA_SMTP_SECURE === 'true',
        auth: { user: process.env.AVYUKTA_SMTP_USER, pass: process.env.AVYUKTA_SMTP_PASS }
      });
      await transporter.sendMail({
        from: process.env.AVYUKTA_SMTP_FROM ?? process.env.AVYUKTA_SMTP_USER,
        to: row.email,
        subject: 'Ayvukta password reset code',
        text: `Your Ayvukta password reset code is ${code}. It expires in 15 minutes.`
      });
    } else {
      console.log(`[Ayvukta password reset] ${row.email}: ${code}`);
    }
    return { ok: true };
  }

  async resetPassword(input: { email: string; code: string; password: string }): Promise<{ ok: true }> {
    if (input.password.length < 8) throw new Error('Password must be at least 8 characters.');
    const row = this.getUserByEmail(input.email);
    if (!row) throw new Error('Invalid reset code.');
    const codes = this.db.prepare(`SELECT id, code_hash as codeHash, expires_at as expiresAt FROM password_reset_codes WHERE user_id = ? AND used_at IS NULL ORDER BY created_at DESC LIMIT 5`).all(row.id) as Array<{ id: string; codeHash: string; expiresAt: string }>;
    const match = codes.find((candidate) => new Date(candidate.expiresAt).getTime() > Date.now() && bcrypt.compareSync(input.code.trim(), candidate.codeHash));
    if (!match) throw new Error('Invalid or expired reset code.');
    this.db.prepare(`UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(await bcrypt.hash(input.password, 12), row.id);
    this.db.prepare(`UPDATE password_reset_codes SET used_at = CURRENT_TIMESTAMP WHERE id = ?`).run(match.id);
    this.db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(row.id);
    return { ok: true };
  }
}
