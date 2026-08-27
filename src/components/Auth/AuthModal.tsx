import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail, User, X, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { DEMO_ACCOUNT } from '../../lib/plans.js';

export type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

interface AuthModalProps {
  isOpen: boolean;
  mode: AuthMode;
  resetToken?: string;
  onClose: () => void;
  onSwitchMode: (mode: AuthMode) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  mode,
  resetToken,
  onClose,
  onSwitchMode,
}) => {
  const { login, signup, enterDemo, showToast } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(mode === 'login' ? DEMO_ACCOUNT.email : '');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetNotice, setResetNotice] = useState('');

  if (!isOpen) return null;

  const title =
    mode === 'login'
      ? 'Sign in to Mailoo'
      : mode === 'signup'
        ? 'Create your studio'
        : mode === 'forgot'
          ? 'Reset your password'
          : 'Set a new password';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResetNotice('');
    try {
      if (mode === 'login') {
        await login(email, password);
        onClose();
      } else if (mode === 'signup') {
        await signup({ fullName, email, password, orgName: orgName || undefined });
        onClose();
      } else if (mode === 'forgot') {
        const res = await api.forgotPassword(email);
        setResetNotice(
          res.resetUrl
            ? `Reset link generated. In this preview, use token from ${res.resetUrl}`
            : res.message
        );
        showToast('If the account exists, a reset link was issued.', 'success');
      } else if (mode === 'reset') {
        if (!resetToken) {
          showToast('Missing reset token. Request a new link.', 'error');
          return;
        }
        await api.resetPassword(resetToken, password);
        showToast('Password updated. You can sign in now.', 'success');
        onSwitchMode('login');
      }
    } catch (err: any) {
      showToast(err.message || 'Authentication failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="mailoo-auth-modal-backdrop"
      className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="mailoo-auth-modal"
        className="w-full max-w-md bg-[#0F0F12] border border-[#27272A] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#27272A] flex items-center justify-between bg-[#18181B]">
          <div>
            <h2 className="text-sm font-bold text-white">{title}</h2>
            <p className="text-[11px] text-[#71717A] mt-0.5">
              {mode === 'login'
                ? 'Use your studio credentials, or open the seeded preview from the homepage.'
                : mode === 'signup'
                  ? 'Provision an organization, then connect a custom domain.'
                  : 'Passwords require 8+ characters, one uppercase letter, and one number.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-[#71717A] hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
          {mode === 'signup' && (
            <label className="block space-y-1.5">
              <span className="text-[11px] font-mono-code uppercase text-[#71717A]">Full name</span>
              <div className="flex items-center gap-2 bg-[#18181B] border border-[#27272A] rounded-md px-3 py-2.5">
                <User className="w-4 h-4 text-[#71717A]" />
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-transparent text-sm text-white focus:outline-none"
                  placeholder="Alex Vance"
                />
              </div>
            </label>
          )}

          {mode !== 'reset' && (
            <label className="block space-y-1.5">
              <span className="text-[11px] font-mono-code uppercase text-[#71717A]">Email</span>
              <div className="flex items-center gap-2 bg-[#18181B] border border-[#27272A] rounded-md px-3 py-2.5">
                <Mail className="w-4 h-4 text-[#71717A]" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-sm text-white focus:outline-none"
                  placeholder="you@studio.com"
                />
              </div>
            </label>
          )}

          {mode === 'signup' && (
            <label className="block space-y-1.5">
              <span className="text-[11px] font-mono-code uppercase text-[#71717A]">Studio name</span>
              <input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full bg-[#18181B] border border-[#27272A] rounded-md px-3 py-2.5 text-sm text-white focus:outline-none"
                placeholder="Atelier Nordic"
              />
            </label>
          )}

          {mode !== 'forgot' && (
            <label className="block space-y-1.5">
              <span className="text-[11px] font-mono-code uppercase text-[#71717A]">Password</span>
              <div className="flex items-center gap-2 bg-[#18181B] border border-[#27272A] rounded-md px-3 py-2.5">
                <Lock className="w-4 h-4 text-[#71717A]" />
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-sm text-white focus:outline-none"
                  placeholder={mode === 'login' ? 'Your password' : 'Min. 8 chars, 1 uppercase, 1 number'}
                  minLength={8}
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-[#71717A] hover:text-white">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>
          )}

          {mode === 'login' && (
            <div className="flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={async () => {
                  setIsSubmitting(true);
                  try {
                    await enterDemo();
                    onClose();
                  } catch {
                    // toast from enterDemo
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="text-white hover:underline"
              >
                Open preview studio
              </button>
              <button type="button" onClick={() => onSwitchMode('forgot')} className="text-white hover:underline">
                Forgot password
              </button>
            </div>
          )}

          {resetNotice && (
            <p className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md p-2.5">
              {resetNotice}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-xs font-semibold bg-white text-black hover:bg-[#E4E4E7] disabled:opacity-60"
          >
            <span>
              {isSubmitting
                ? 'Working…'
                : mode === 'login'
                  ? 'Sign in'
                  : mode === 'signup'
                    ? 'Create account'
                    : mode === 'forgot'
                      ? 'Send reset link'
                      : 'Update password'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="px-6 py-4 border-t border-[#27272A] bg-[#18181B] flex items-center justify-between text-xs text-[#A1A1AA]">
          <div className="flex items-center gap-1.5 text-[11px] font-mono-code">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            scrypt + TLS 1.3
          </div>
          {mode === 'login' ? (
            <button type="button" onClick={() => onSwitchMode('signup')} className="text-white hover:underline">
              Create a studio →
            </button>
          ) : mode === 'signup' ? (
            <button type="button" onClick={() => onSwitchMode('login')} className="text-white hover:underline">
              Already have an account
            </button>
          ) : (
            <button type="button" onClick={() => onSwitchMode('login')} className="text-white hover:underline">
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
