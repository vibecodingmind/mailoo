import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';
import { DEMO_ACCOUNT } from '../lib/plans.js';
import { publicRouteFromHash } from '../lib/publicRoutes.js';
import type { User, Organization, Mailbox, Domain, Membership } from '../types.js';

export type AppView =
  | 'landing'
  | 'onboarding'
  | 'webmail'
  | 'attachments'
  | 'contacts'
  | 'templates'
  | 'filters'
  | 'aliases'
  | 'deliverability'
  | 'bimi'
  | 'domains'
  | 'mailboxes'
  | 'team'
  | 'security'
  | 'billing';

export type ThemeMode = 'dark' | 'midnight';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  availableOrganizations: Organization[];
  mailboxes: Mailbox[];
  domains: Domain[];
  memberships: Membership[];
  selectedMailbox: Mailbox | null;
  currentView: AppView;
  isLoading: boolean;
  isDemoSession: boolean;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setCurrentView: (view: AppView) => void;
  setSelectedMailbox: (mailbox: Mailbox | null) => void;
  login: (email: string, password?: string) => Promise<void>;
  enterDemo: () => Promise<void>;
  signup: (data: { fullName: string; email: string; password?: string; orgName?: string; plan?: string }) => Promise<void>;
  logout: () => Promise<void>;
  switchOrganization: (orgId: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  resetDemoData: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  toast: { message: string; type: 'success' | 'error' | 'info'; id: number } | null;
}

const VIEW_STORAGE_KEY = 'mailoo_view';

const APP_VIEWS: AppView[] = [
  'landing',
  'onboarding',
  'webmail',
  'attachments',
  'contacts',
  'templates',
  'filters',
  'deliverability',
  'bimi',
  'domains',
  'mailboxes',
  'team',
  'security',
  'billing',
];

function viewFromHash(): AppView | null {
  if (typeof window === 'undefined') return null;
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0].trim();
  if (!raw || raw === 'home') return 'landing';
  if ((APP_VIEWS as string[]).includes(raw)) return raw as AppView;
  return null;
}

function hashForView(view: AppView): string {
  return view === 'landing' ? '#/' : `#/${view}`;
}

function readStoredView(): AppView {
  const fromHash = viewFromHash();
  if (fromHash) return fromHash;
  try {
    const saved = sessionStorage.getItem(VIEW_STORAGE_KEY);
    if (saved && (APP_VIEWS as string[]).includes(saved) && saved !== 'landing') return saved as AppView;
  } catch {
    // ignore
  }
  return 'landing';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [availableOrganizations, setAvailableOrganizations] = useState<Organization[]>([]);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [selectedMailbox, setSelectedMailbox] = useState<Mailbox | null>(null);
  const [currentView, setCurrentViewState] = useState<AppView>(readStoredView);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('mailoo_theme') || localStorage.getItem('monogram_theme');
      return saved === 'midnight' ? 'midnight' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; id: number } | null>(null);

  const isDemoSession = user?.email === DEMO_ACCOUNT.email;

  const setCurrentView = useCallback((view: AppView) => {
    setCurrentViewState(view);
    try {
      if (view === 'landing' || view === 'onboarding') {
        sessionStorage.removeItem(VIEW_STORAGE_KEY);
      } else {
        sessionStorage.setItem(VIEW_STORAGE_KEY, view);
      }
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      const next = hashForView(view);
      if (window.location.hash !== next) {
        window.history.replaceState(null, '', next);
      }
    }
  }, []);

  useEffect(() => {
    const onHash = () => {
      const view = viewFromHash();
      if (view) setCurrentViewState(view);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('mailoo_theme', theme);
    } catch {
      // ignore
    }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'midnight') {
        document.documentElement.classList.add('theme-midnight');
      } else {
        document.documentElement.classList.remove('theme-midnight');
      }
    }
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'midnight' : 'dark'));
  };

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToast({ message, type, id });
    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 4000);
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      setOrganization(data.organization);
      setAvailableOrganizations(data.availableOrganizations || [data.organization]);
      setMailboxes(data.mailboxes || []);
      setDomains(data.domains || []);
      setMemberships(data.memberships || []);

      setSelectedMailbox((prev) => {
        if (prev && data.mailboxes.some((m) => m.id === prev.id)) {
          return data.mailboxes.find((m) => m.id === prev.id) || null;
        }
        return data.mailboxes.length > 0 ? data.mailboxes[0] : null;
      });
    } catch (err) {
      console.error('[Auth] Failed to load session', err);
      setUser(null);
      setOrganization(null);
      setAvailableOrganizations([]);
      setMailboxes([]);
      setDomains([]);
      setMemberships([]);
      setSelectedMailbox(null);
      setCurrentViewState((view) => {
        const publicRoute = publicRouteFromHash();
        if (view === 'landing' || publicRoute) {
          if (view !== 'landing') {
            try {
              sessionStorage.removeItem(VIEW_STORAGE_KEY);
            } catch {
              // ignore
            }
          }
          return 'landing';
        }
        try {
          sessionStorage.removeItem(VIEW_STORAGE_KEY);
        } catch {
          // ignore
        }
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', hashForView('landing'));
        }
        return 'landing';
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      await api.login(email, password);
      await refreshAll();
      setCurrentView('webmail');
      showToast(`Welcome back, ${email}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Login failed', 'error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const enterDemo = async () => {
    setIsLoading(true);
    try {
      await api.enterDemo();
      await refreshAll();
      setCurrentView('webmail');
      showToast(`Welcome to ${DEMO_ACCOUNT.studio}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Demo studio is unavailable', 'error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: { fullName: string; email: string; password?: string; orgName?: string; plan?: string }) => {
    setIsLoading(true);
    try {
      await api.signup(data);
      await refreshAll();
      setCurrentView('onboarding');
      showToast('Account created. Connect a domain to go live.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Signup failed', 'error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setOrganization(null);
    setSelectedMailbox(null);
    setCurrentView('landing');
    showToast('Signed out', 'info');
  };

  const switchOrganization = async (orgId: string) => {
    setIsLoading(true);
    try {
      await api.switchOrg(orgId);
      await refreshAll();
      showToast('Switched organization', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to switch organization', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetDemoData = async () => {
    setIsLoading(true);
    try {
      await api.resetDemo();
      await refreshAll();
      showToast('Demo environment restored to pristine state', 'success');
    } catch (err: any) {
      showToast(err.message || 'Reset failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        availableOrganizations,
        mailboxes,
        domains,
        memberships,
        selectedMailbox,
        currentView,
        isLoading,
        isDemoSession,
        theme,
        setTheme,
        toggleTheme,
        setCurrentView,
        setSelectedMailbox,
        login,
        enterDemo,
        signup,
        logout,
        switchOrganization,
        refreshAll,
        resetDemoData,
        showToast,
        toast,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
