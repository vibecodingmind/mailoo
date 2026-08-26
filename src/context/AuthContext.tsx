import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';
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
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setCurrentView: (view: AppView) => void;
  setSelectedMailbox: (mailbox: Mailbox | null) => void;
  login: (email: string) => Promise<void>;
  signup: (data: { fullName: string; email: string; orgName?: string; plan?: string }) => Promise<void>;
  logout: () => void;
  switchOrganization: (orgId: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  resetDemoData: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  toast: { message: string; type: 'success' | 'error' | 'info'; id: number } | null;
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
  const [currentView, setCurrentView] = useState<AppView>('webmail');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('monogram_theme');
      return saved === 'midnight' ? 'midnight' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; id: number } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('monogram_theme', theme);
    } catch (e) {
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
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const login = async (email: string) => {
    setIsLoading(true);
    try {
      await api.login(email);
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

  const signup = async (data: { fullName: string; email: string; orgName?: string; plan?: string }) => {
    setIsLoading(true);
    try {
      await api.signup(data);
      await refreshAll();
      setCurrentView('onboarding');
      showToast('Account created successfully! Follow the setup steps.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Signup failed', 'error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    setOrganization(null);
    setSelectedMailbox(null);
    setCurrentView('landing');
    showToast('Logged out of session', 'info');
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
        theme,
        setTheme,
        toggleTheme,
        setCurrentView,
        setSelectedMailbox,
        login,
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
