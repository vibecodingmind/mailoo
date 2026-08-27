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
  Paperclip,
  Contact as ContactIcon,
  FileText,
  SlidersHorizontal,
  Activity,
  Award,
  Search,
  Menu,
  X,
  MoreHorizontal,
} from 'lucide-react';
import { useAuth, AppView } from '../context/AuthContext.js';

interface NavigationProps {
  onOpenCompose: () => void;
  onOpenSimulate: () => void;
  onOpenCommandPalette: () => void;
}

const PRIMARY_NAV: { id: AppView; label: string; icon: React.ReactNode }[] = [
  { id: 'webmail', label: 'Webmail', icon: <Inbox className="w-4 h-4" /> },
  { id: 'domains', label: 'Domains', icon: <Globe className="w-4 h-4" /> },
  { id: 'mailboxes', label: 'Mailboxes', icon: <Mail className="w-4 h-4" /> },
  { id: 'team', label: 'Team', icon: <Users className="w-4 h-4" /> },
  { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
  { id: 'billing', label: 'Billing', icon: <CreditCard className="w-4 h-4" /> },
];

const MORE_NAV: { id: AppView; label: string; icon: React.ReactNode }[] = [
  { id: 'attachments', label: 'Attachments', icon: <Paperclip className="w-4 h-4" /> },
  { id: 'contacts', label: 'Contacts', icon: <ContactIcon className="w-4 h-4" /> },
  { id: 'templates', label: 'Templates', icon: <FileText className="w-4 h-4" /> },
  { id: 'filters', label: 'Filters', icon: <SlidersHorizontal className="w-4 h-4" /> },
  { id: 'deliverability', label: 'Deliverability', icon: <Activity className="w-4 h-4" /> },
  { id: 'bimi', label: 'BIMI Brand', icon: <Award className="w-4 h-4" /> },
];

export const Navigation: React.FC<NavigationProps> = ({
  onOpenCompose,
  onOpenSimulate,
  onOpenCommandPalette,
}) => {
  const {
    user,
    organization,
    availableOrganizations,
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
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const moreActive = MORE_NAV.some((item) => item.id === currentView);

  const handleReset = async () => {
    if (confirm('Reset demo organization, mailboxes, and sample email threads to default state?')) {
      setIsResetting(true);
      await resetDemoData();
      setIsResetting(false);
    }
  };

  const go = (view: AppView) => {
    setCurrentView(view);
    setIsMoreOpen(false);
    setIsMobileOpen(false);
    setIsUserDropdownOpen(false);
  };

  return (
    <header
      id="mailoo-navigation-header"
      className="border-b border-[#27272A] bg-[#0F0F12] text-[#E4E4E7] select-none"
    >
      <div className="px-4 sm:px-6 flex items-center justify-between h-16 gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div
            id="brand-logo-button"
            onClick={() => setCurrentView('landing')}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          >
            <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center font-bold text-lg text-black shadow-sm group-hover:scale-105 transition-transform">
              M
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-editorial text-lg font-semibold tracking-tight text-white leading-none">
                MAILOO
              </span>
              <span className="text-[9px] tracking-widest text-[#71717A] font-mono-code uppercase mt-0.5">
                SOVEREIGN MAIL
              </span>
            </div>
          </div>

          <div className="relative hidden md:block">
            <button
              id="org-dropdown-trigger"
              onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium bg-[#18181B] border border-[#27272A] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="max-w-[140px] truncate font-medium text-[#E4E4E7]">{organization?.name || 'My Studio'}</span>
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-[#27272A] text-[#E4E4E7] font-mono-code font-semibold border border-[#3F3F46]/50">
                {organization?.plan || 'pro'}
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

        <nav className="hidden xl:flex items-center gap-1 text-sm font-medium text-[#A1A1AA]">
          {PRIMARY_NAV.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => go(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive ? 'text-white bg-[#27272A]' : 'text-[#A1A1AA] hover:text-white hover:bg-[#18181B]'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium ${
                moreActive || isMoreOpen ? 'text-white bg-[#27272A]' : 'text-[#A1A1AA] hover:text-white hover:bg-[#18181B]'
              }`}
            >
              <MoreHorizontal className="w-4 h-4" />
              More
            </button>
            {isMoreOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-52 rounded-md shadow-2xl border border-[#27272A] bg-[#0F0F12] p-1.5 z-50">
                {MORE_NAV.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => go(item.id)}
                    className={`w-full text-left px-3 py-2 text-xs rounded-md flex items-center gap-2 ${
                      currentView === item.id ? 'bg-[#27272A] text-white' : 'text-[#A1A1AA] hover:bg-[#18181B] hover:text-white'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            title="Command palette (⌘K)"
            className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs bg-[#18181B] border border-[#27272A] text-[#71717A] hover:text-white"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Jump to…</span>
            <kbd className="hidden md:inline font-mono-code text-[10px] border border-[#27272A] px-1 rounded">⌘K</kbd>
          </button>

          <button
            id="theme-switcher-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={`Current theme is ${theme === 'midnight' ? 'Midnight' : 'Default Dark'}. Click to toggle theme.`}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium border transition-all ${
              theme === 'midnight'
                ? 'bg-[#16233B] border-blue-500/40 text-blue-300 hover:bg-[#1E3052]'
                : 'bg-[#18181B] border-[#27272A] text-[#A1A1AA] hover:text-white hover:bg-[#27272A]'
            }`}
          >
            {theme === 'midnight' ? <Moon className="w-3.5 h-3.5 text-blue-400" /> : <Sun className="w-3.5 h-3.5 text-neutral-400" />}
          </button>

          <button
            id="simulate-inbound-email-btn"
            onClick={onOpenSimulate}
            title="Simulate incoming email"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-[#18181B] hover:bg-[#27272A] text-[#E4E4E7] border border-[#27272A]"
          >
            <Sparkles className="w-3.5 h-3.5 text-neutral-300" />
            <span className="hidden lg:inline">Simulate</span>
          </button>

          <button
            id="quick-compose-header-btn"
            onClick={onOpenCompose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-white hover:bg-[#E4E4E7] text-black shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Compose</span>
          </button>

          <button
            id="reset-demo-btn"
            onClick={handleReset}
            disabled={isResetting}
            className="hidden sm:inline-flex p-2 rounded-md text-[#71717A] hover:text-white hover:bg-[#27272A]"
            title="Reset to pristine sample data"
          >
            <RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
          </button>

          <div className="relative">
            <button
              id="user-profile-menu-btn"
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-white/40"
            >
              <div className="w-8 h-8 rounded-full bg-[#27272A] flex items-center justify-center border border-[#3F3F46] text-[10px] font-bold text-[#E4E4E7]">
                {user?.fullName
                  ? user.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'AV'}
              </div>
            </button>

            {isUserDropdownOpen && (
              <div
                id="user-profile-dropdown"
                className="absolute right-0 top-full mt-2 w-64 rounded-md shadow-2xl border border-[#27272A] bg-[#0F0F12] p-2 z-50"
              >
                <div className="px-3 py-2 border-b border-[#27272A]">
                  <div className="font-semibold text-sm text-white">{user?.fullName}</div>
                  <div className="text-xs text-[#71717A] truncate">{user?.email}</div>
                </div>
                <button
                  onClick={() => go('security')}
                  className="w-full text-left px-3 py-2 text-xs rounded-md hover:bg-[#18181B] text-[#A1A1AA] hover:text-white flex items-center gap-2"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Security & Keys
                </button>
                <button
                  onClick={() => go('billing')}
                  className="w-full text-left px-3 py-2 text-xs rounded-md hover:bg-[#18181B] text-[#A1A1AA] hover:text-white flex items-center gap-2"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Billing & Invoices
                </button>
                <div className="border-t border-[#27272A] pt-1">
                  <button
                    onClick={() => {
                      void logout();
                      setIsUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-md flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="xl:hidden p-2 rounded-md text-[#A1A1AA] hover:text-white hover:bg-[#18181B]"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label="Open navigation"
          >
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isMobileOpen && (
        <div className="xl:hidden border-t border-[#27272A] bg-[#0F0F12] px-4 py-3 grid grid-cols-2 gap-1">
          {[...PRIMARY_NAV, ...MORE_NAV].map((item) => (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs ${
                currentView === item.id ? 'bg-[#27272A] text-white' : 'text-[#A1A1AA]'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
