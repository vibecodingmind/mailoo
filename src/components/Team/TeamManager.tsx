import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  Mail,
  CheckCircle2,
  Sparkles,
  Crown,
  Key,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import type { TeamMember } from '../../types.js';

export const TeamManager: React.FC = () => {
  const { organization, showToast } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [isInviting, setIsInviting] = useState(false);

  const fetchMembers = async () => {
    try {
      const res = await api.getTeamMembers();
      setMembers(res.members);
    } catch (err) {
      console.error('Failed to fetch team members', err);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      await api.inviteTeamMember(inviteEmail, inviteRole);
      setInviteEmail('');
      setIsInviteOpen(false);
      showToast(`Invitation sent to ${inviteEmail}`, 'success');
      await fetchMembers();
    } catch (err: any) {
      showToast(err.message || 'Failed to send invite', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (id: string, email: string) => {
    if (confirm(`Remove ${email} from organization?`)) {
      try {
        await api.removeTeamMember(id);
        showToast(`Removed member ${email}`, 'info');
        await fetchMembers();
      } catch (err: any) {
        showToast('Failed to remove member', 'error');
      }
    }
  };

  return (
    <div id="team-management-view" className="flex-1 bg-[#0A0A0B] overflow-y-auto p-6 sm:p-8 text-[#E4E4E7]">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-6">
          <div>
            <div className="flex items-center gap-2 text-[#A1A1AA] text-xs font-mono-code font-semibold tracking-wider uppercase mb-1">
              <Users className="w-4 h-4 text-white" />
              <span>Studio Collaboration & RBAC</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Team Members & Permissions
            </h1>
            <p className="text-xs text-[#A1A1AA] mt-1 max-w-2xl">
              Collaborate across shared inboxes and domain administration with granular role-based access control.
            </p>
          </div>

          <button
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-white hover:bg-[#E4E4E7] text-black shadow-sm transition-all shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Colleague</span>
          </button>
        </div>

        {/* Member list */}
        <div className="space-y-4">
          <div className="border border-[#27272A] rounded-lg overflow-hidden bg-[#0F0F12]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#18181B] text-[#71717A] font-mono-code uppercase text-[10px] border-b border-[#27272A]">
                <tr>
                  <th className="py-3 px-5 font-semibold">Team Member</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">2FA Enforced</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18181B]">
                {members.map((m) => {
                  const isOwner = m.role === 'owner';
                  return (
                    <tr key={m.id} className="hover:bg-[#18181B]/50 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center font-bold text-xs text-white">
                            {m.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              <span>{m.name}</span>
                              {isOwner && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                            </div>
                            <div className="text-xs text-[#A1A1AA] font-mono-code">{m.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`text-[10px] font-mono-code uppercase px-2 py-0.5 rounded font-bold border ${
                            isOwner
                              ? 'bg-white text-black border-white'
                              : m.role === 'admin'
                              ? 'bg-[#27272A] text-white border-[#3F3F46]'
                              : 'bg-[#18181B] text-[#A1A1AA] border-[#27272A]'
                          }`}
                        >
                          {m.role}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Enabled</span>
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-[10px] font-mono-code uppercase px-2 py-0.5 rounded bg-[#18181B] text-[#A1A1AA] border border-[#27272A]">
                          {m.status}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        {!isOwner && (
                          <button
                            onClick={() => handleRemoveMember(m.id, m.email)}
                            className="p-1.5 text-[#71717A] hover:text-rose-400"
                            title="Remove Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#0F0F12] border border-[#27272A] rounded-lg shadow-2xl overflow-hidden text-[#E4E4E7]">
            <div className="px-6 py-4 border-b border-[#27272A] bg-[#18181B] flex items-center justify-between">
              <h3 className="font-semibold text-sm text-white">Invite Team Member</h3>
              <button onClick={() => setIsInviteOpen(false)} className="text-[#71717A] hover:text-white">✕</button>
            </div>

            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono-code text-[#71717A]">Email Address:</label>
                <input
                  type="email"
                  placeholder="colleague@domain.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded px-3 py-2 text-xs text-white placeholder-[#71717A]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono-code text-[#71717A]">Organization Role:</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded px-3 py-2 text-xs text-white"
                >
                  <option value="member">Member (Access assigned mailboxes)</option>
                  <option value="admin">Administrator (Manage domains & team)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 rounded-md text-xs text-[#A1A1AA] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting || !inviteEmail.trim()}
                  className="px-4 py-2 rounded-md text-xs font-semibold bg-white hover:bg-[#E4E4E7] text-black disabled:opacity-50"
                >
                  {isInviting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
