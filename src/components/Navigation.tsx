import React, { useState } from 'react';
import {
  Inbox,
  Globe,
  Mail,
  Shield,
  CreditCard,
  Users,
  ChevronDown,
  Sparkles,
  RefreshCw,
  Sun,
  Moon,
  LogOut,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Paperclip,
  Contact as ContactIcon,
  FileText,
  SlidersHorizontal,
  Activity,
  Award,
} from 'lucide-react';
import { useAuth, AppView } from '../context/AuthContext.js';

interface NavigationProps {
  onOpenCompose: () => void;
  onOpenSimulate: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ onOpenCompose, onOpenSimulate }) => {
  const {
    user,
    organization,
    availableOrganizations,
    domains,
    mailboxes,
    selectedMailbox,
    setSelectedMailbox,
    currentView,
    setCurrentView,
    theme,
    toggleTheme,
    switchOrganization,
    resetDemoData,
    logout,
  } = useAuth();

  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const activeDomain = domains[0];
  const isDomainActive = activeDomain?.status === 'active';

  const navItems: { id: AppView; label: string; icon: React.ReactNode }[] = [
    { id: 'webmail', label: 'Webmail', icon: <Inbox className="w-4 h-4" /> },
    { id: 'attachments', label: 'Attachments', icon: <Paperclip className="w-4 h-4" /> },
    { id: 'contacts', label: 'Contacts', icon: <ContactIcon className="w-4 h-4" /> },
    { id: 'templates', label: 'Templates', icon: <FileText className="w-4 h-4" /> },
    { id: 'filters', label: 'Filters', icon: <SlidersHorizontal className="w-4 h-4" /> },
    { id: 'deliverability', label: 'Deliverability', icon: <Activity className="w-4 h-4" /> },
    { id: 'bimi', label: 'BIMI Brand', icon: <Award className="w-4 h-4" /> },
    { id: 'domains', label: 'Domains', icon: <Globe className="w-4 h-4" /> },
    { id: 'mailboxes', label: 'Mailboxes', icon: <Mail className="w-4 h-4" /> },
    { id: 'team', label: 'Team', icon: <Users className="w-4 h-4" /> },
    { id: 'security', label: 'Security & PGP', icon: <Shield className="w-4 h-4" /> },
    { id: 'billing', label: 'Billing', icon: <CreditCard className="w-4 h-4" /> },
  ];

  const handleReset = async () => {
    if (confirm('Reset demo organization, mailboxes, and sample email threads to default state?')) {
      setIsResetting(true);
      await resetDemoData();
      setIsResetting(false);
    }
  };

  return (
    <header
      id="mailoo-navigation-header"
      className="border-b border-[#27272A] bg-[#0F0F12] text-[#E4E4E7] select-none"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Left: Brand + Org Switcher */}
        <div className="flex items-center gap-6">
          <div
            id="brand-logo-button"
            onClick={() => setCurrentView('landing')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center font-bold text-lg text-black shadow-sm group-hover:scale-105 transition-transform">
              M
            </div>
            <div className="flex flex-col">
              <span className="font-editorial text-lg font-semibold tracking-tight text-white leading-none">
                MAILOO
              </span>
              <span className="text-[9px] tracking-widest text-[#71717A] font-mono-code uppercase mt-0.5">
                SOVEREIGN MAIL
              </span>
            </div>
          </div>

          {/* Org Selector */}
          <div className="relative">
            <button
              id="org-dropdown-trigger"
              onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium bg-[#18181B] border border-[#27272A] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="max-w-[140px] truncate font-medium text-[#E4E4E7]">{organization?.name || 'My Studio'}</span>
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-[#27272A] text-[#E4E4E7] font-mono-code font-semibold border border-[#3F3F46]/50">
                {organization?.plan || 'PRO'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#71717A]" />
            </button>

            {isOrgDropdownOpen && (
              <div
                id="org-dropdown-menu"
                className="absolute top-full left-0 mt-1.5 w-64 rounded-md shadow-2xl border border-[#27272A] bg-[#0F0F12] p-1.5 z-50 text-[#E4E4E7]"
              >
                <div className="px-3 py-2 text-[10px] font-mono-code text-[#71717A] uppercase tracking-wider font-semibold">
                  Switch Organization
                </div>
                {availableOrganizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      switchOrganization(org.id);
                      setIsOrgDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-md flex items-center justify-between transition-colors ${
                      org.id === organization?.id
                        ? 'bg-[#27272A] text-white font-semibold'
                        : 'hover:bg-[#18181B] text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    <span>{org.name}</span>
                    <span className="text-[10px] uppercase font-mono-code text-[#71717A]">{org.plan}</span>
                  </button>
                ))}
                <div className="border-t border-[#27272A] my-1"></div>
                <button
                  onClick={() => {
                    setCurrentView('onboarding');
                    setIsOrgDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-[#A1A1AA] hover:text-white flex items-center gap-2 rounded-md hover:bg-[#18181B]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  <span>Run Onboarding Wizard</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#A1A1AA]">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => setCurrentView(item.id)}
                className={`flex items-center gap-2 transition-colors py-5 -mb-[1px] border-b-2 text-xs font-medium ${
                  isActive
                    ? 'text-white border-white font-semibold'
                    : 'text-[#A1A1AA] border-transparent hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Actions, Fast Simulation & User Profile */}
        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div className="hidden sm:flex items-center bg-[#27272A] px-3 py-1.5 rounded-md text-xs font-medium text-[#A1A1AA]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-2"></span>
            <span>All Systems Operational</span>
          </div>

          {/* Theme Switcher Toggle (Default Dark vs Midnight) */}
          <button
            id="theme-switcher-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={`Current theme is ${theme === 'midnight' ? 'Midnight' : 'Default Dark'}. Click to toggle theme.`}
            title={`Current theme: ${theme === 'midnight' ? 'Midnight' : 'Default Dark'}. Click to switch theme.`}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all cursor-pointer select-none ${
              theme === 'midnight'
                ? 'bg-[#16233B] border-blue-500/40 text-blue-300 hover:bg-[#1E3052] shadow-sm'
                : 'bg-[#18181B] border-[#27272A] text-[#A1A1AA] hover:text-white hover:bg-[#27272A]'
            }`}
          >
            {theme === 'midnight' ? (
              <Moon className="w-3.5 h-3.5 text-blue-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-neutral-400" />
            )}
            <span className="hidden sm:inline text-[11px] font-mono-code font-semibold">
              {theme === 'midnight' ? 'Midnight' : 'Dark'}
            </span>
          </button>

          {/* Simulate Inbound Email Tool */}
          <button
            id="simulate-inbound-email-btn"
            onClick={onOpenSimulate}
            title="Simulate incoming client or vendor email to test mailbox routing & SPF/DKIM"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-[#18181B] hover:bg-[#27272A] text-[#E4E4E7] border border-[#27272A] shadow-sm transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-neutral-300" />
            <span className="hidden md:inline">Simulate Inbound</span>
          </button>

          {/* Quick Compose Button */}
          <button
            id="quick-compose-header-btn"
            onClick={onOpenCompose}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-white hover:bg-[#E4E4E7] text-black shadow-sm transition-all hover:scale-[1.02]"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Compose</span>
          </button>

          {/* Reset Demo Button */}
          <button
            id="reset-demo-btn"
            onClick={handleReset}
            disabled={isResetting}
            className="p-2 rounded-md text-[#71717A] hover:text-white hover:bg-[#27272A] transition-colors"
            title="Reset to pristine sample data"
          >
            <RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
          </button>

          {/* User Profile Avatar & Menu */}
          <div className="relative">
            <button
              id="user-profile-menu-btn"
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-white/40 transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-[#27272A] flex items-center justify-center border border-[#3F3F46] text-[10px] font-bold text-[#E4E4E7]">
                {user?.fullName
                  ? user.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'JD'}
              </div>
            </button>

            {isUserDropdownOpen && (
              <div
                id="user-profile-dropdown"
                className="absolute right-0 top-full mt-2 w-64 rounded-md shadow-2xl border border-[#27272A] bg-[#0F0F12] p-2 z-50 text-[#E4E4E7]"
              >
                <div className="px-3 py-2 border-b border-[#27272A]">
                  <div className="font-semibold text-sm text-white">{user?.fullName}</div>
                  <div className="text-xs text-[#71717A] truncate">{user?.email}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span className="text-[10px] font-mono-code text-emerald-400">2FA & TLS Active</span>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setCurrentView('security');
                      setIsUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded-md hover:bg-[#18181B] text-[#A1A1AA] hover:text-white flex items-center gap-2"
                  >
                    <Shield className="w-3.5 h-3.5 text-[#71717A]" />
                    <span>Security & Keys</span>
                  </button>
                  <button
                    onClick={() => {
                      setCurrentView('billing');
                      setIsUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded-md hover:bg-[#18181B] text-[#A1A1AA] hover:text-white flex items-center gap-2"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-[#71717A]" />
                    <span>Billing & Invoices</span>
                  </button>

                  <button
                    id="user-dropdown-theme-toggle"
                    onClick={() => {
                      toggleTheme();
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded-md hover:bg-[#18181B] text-[#A1A1AA] hover:text-white flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {theme === 'midnight' ? (
                        <Moon className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <Sun className="w-3.5 h-3.5 text-neutral-400" />
                      )}
                      <span>Theme</span>
                    </div>
                    <span className="text-[10px] font-mono-code text-[#71717A] bg-[#27272A] px-1.5 py-0.5 rounded">
                      {theme === 'midnight' ? 'Midnight' : 'Default Dark'}
                    </span>
                  </button>
                </div>

                <div className="border-t border-[#27272A] pt-1">
                  <button
                    onClick={() => {
                      logout();
                      setIsUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-md flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Sub-bar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-2 border-t border-[#27272A] bg-[#0F0F12] overflow-x-auto gap-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs whitespace-nowrap ${
              currentView === item.id ? 'bg-[#27272A] text-white font-medium' : 'text-[#A1A1AA]'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </header>
  );
};
