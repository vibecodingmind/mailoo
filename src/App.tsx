import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navigation } from './components/Navigation.js';
import { WebmailLayout } from './components/Webmail/WebmailLayout.js';
import { DomainManager } from './components/Domains/DomainManager.js';
import { MailboxManager } from './components/Mailboxes/MailboxManager.js';
import { SecurityHub } from './components/Security/SecurityHub.js';
import { TeamManager } from './components/Team/TeamManager.js';
import { BillingView } from './components/Billing/BillingView.js';
import { OnboardingWizard } from './components/Onboarding/OnboardingWizard.js';
import { LandingPage } from './components/Landing/LandingPage.js';
import { ComposerModal } from './components/Webmail/ComposerModal.js';
import { InboundSimulatorModal } from './components/Webmail/InboundSimulatorModal.js';
import { AttachmentsExplorer } from './components/Webmail/AttachmentsExplorer.js';
import { ContactsView } from './components/Webmail/ContactsView.js';
import { TemplatesView } from './components/Webmail/TemplatesView.js';
import { FilterRulesView } from './components/Webmail/FilterRulesView.js';
import { DeliverabilityDashboard } from './components/Webmail/DeliverabilityDashboard.js';
import { BimiBrandManager } from './components/Webmail/BimiBrandManager.js';
import { SessionExpiryModal } from './components/Security/SessionExpiryModal.js';
import { AuthModal, type AuthMode } from './components/Auth/AuthModal.js';
import { LegalPages, type LegalDoc } from './components/Legal/LegalPages.js';
import { StatusPage } from './components/Status/StatusPage.js';
import { CommandPalette } from './components/CommandPalette.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { LoadingSplash } from './components/LoadingSplash.js';
import { CheckCircle2, AlertCircle, Info, Sparkles } from 'lucide-react';
import { publicRouteFromHash, hashForPublicRoute, type PublicRoute } from './lib/publicRoutes.js';

function legalFromPublic(route: PublicRoute | null): LegalDoc | null {
  if (!route || route === 'status') return null;
  return route;
}

function AppContent() {
  const {
    currentView,
    setCurrentView,
    toast,
    showToast,
    refreshAll,
    enterDemo,
    isDemoSession,
    toggleTheme,
    logout,
    isLoading,
    user,
  } = useAuth();
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(() => legalFromPublic(publicRouteFromHash()));
  const [publicStatus, setPublicStatus] = useState(() => publicRouteFromHash() === 'status');
  const [resetToken, setResetToken] = useState<string | undefined>();
  const [composePrefill, setComposePrefill] = useState<{
    to?: string;
    subject?: string;
    body?: string;
  }>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const path = window.location.pathname;
    if (path.includes('reset-password') && token) {
      setResetToken(token);
      setAuthMode('reset');
      setAuthOpen(true);
    } else if (path.includes('verify-email') && token) {
      showToast('Email verification token received. Completing verification…', 'info');
    }
  }, [showToast]);

  useEffect(() => {
    const applyPublic = () => {
      const route = publicRouteFromHash();
      setPublicStatus(route === 'status');
      setLegalDoc(legalFromPublic(route));
    };
    applyPublic();
    window.addEventListener('hashchange', applyPublic);
    return () => window.removeEventListener('hashchange', applyPublic);
  }, []);

  const openLegal = (doc: LegalDoc) => {
    setPublicStatus(false);
    setLegalDoc(doc);
    window.history.replaceState(null, '', hashForPublicRoute(doc));
  };

  const openStatus = () => {
    setLegalDoc(null);
    setPublicStatus(true);
    window.history.replaceState(null, '', hashForPublicRoute('status'));
  };

  const closePublicPage = () => {
    setLegalDoc(null);
    setPublicStatus(false);
    if (user && currentView !== 'landing' && currentView !== 'onboarding') {
      window.history.replaceState(null, '', `#/${currentView}`);
    } else {
      window.history.replaceState(null, '', '#/');
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen(true);
      } else if (!typing && e.key === 'c' && currentView !== 'landing' && currentView !== 'onboarding') {
        setComposePrefill({});
        setIsComposeOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentView]);

  if (publicStatus) {
    return <StatusPage onBack={closePublicPage} />;
  }

  if (legalDoc) {
    return <LegalPages doc={legalDoc} onBack={closePublicPage} />;
  }

  if (currentView === 'landing') {
    return (
      <>
        <LandingPage
          onEnterApp={() => {
            void enterDemo();
          }}
          onStartOnboarding={() => {
            if (user) {
              setCurrentView('onboarding');
            } else {
              setAuthMode('signup');
              setAuthOpen(true);
            }
          }}
          onOpenAuth={(mode) => {
            setAuthMode(mode);
            setAuthOpen(true);
          }}
          onOpenLegal={openLegal}
          onOpenStatus={openStatus}
        />
        <AuthModal
          isOpen={authOpen}
          mode={authMode}
          resetToken={resetToken}
          onClose={() => setAuthOpen(false)}
          onSwitchMode={setAuthMode}
        />
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-md bg-[#0F0F12] border border-[#27272A] shadow-2xl text-xs text-[#E4E4E7]">
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-neutral-300 shrink-0" />}
            <span>{toast.message}</span>
          </div>
        )}
      </>
    );
  }

  if (currentView === 'onboarding') {
    return (
      <OnboardingWizard
        onComplete={() => {
          showToast('Welcome to Mailoo Sovereign Webmail!', 'success');
          setCurrentView('webmail');
        }}
      />
    );
  }

  if (isLoading) {
    return <LoadingSplash />;
  }

  return (
    <div id="monogram-app-root" className="h-screen w-screen flex flex-col bg-[#0A0A0B] text-[#E4E4E7] overflow-hidden font-sans">
      {isDemoSession && (
        <div className="shrink-0 px-4 py-1.5 bg-[#18181B] border-b border-[#27272A] text-[11px] text-[#A1A1AA] flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          Exploring the Atelier Nordic demo studio.
          <button
            type="button"
            onClick={() => {
              setAuthMode('signup');
              setAuthOpen(true);
            }}
            className="text-white underline underline-offset-2"
          >
            Create your own workspace
          </button>
        </div>
      )}

      <Navigation
        onOpenCompose={() => {
          setComposePrefill({});
          setIsComposeOpen(true);
        }}
        onOpenSimulate={() => setIsSimulateOpen(true)}
        onOpenCommandPalette={() => setIsCommandOpen(true)}
      />

      <main className="flex-1 flex overflow-hidden">
        {currentView === 'webmail' && (
          <WebmailLayout
            isComposeOpen={isComposeOpen}
            onCloseCompose={() => setIsComposeOpen(false)}
            onOpenCompose={() => {
              setComposePrefill({});
              setIsComposeOpen(true);
            }}
            isSimulateOpen={isSimulateOpen}
            onCloseSimulate={() => setIsSimulateOpen(false)}
          />
        )}
        {currentView === 'attachments' && <AttachmentsExplorer />}
        {currentView === 'contacts' && (
          <ContactsView
            onComposeToContact={(email) => {
              setComposePrefill({ to: email });
              setIsComposeOpen(true);
            }}
          />
        )}
        {currentView === 'templates' && (
          <TemplatesView
            onUseTemplate={(subject, body) => {
              setComposePrefill({ subject, body });
              setIsComposeOpen(true);
            }}
          />
        )}
        {currentView === 'filters' && <FilterRulesView />}
        {currentView === 'deliverability' && <DeliverabilityDashboard />}
        {currentView === 'bimi' && <BimiBrandManager />}
        {currentView === 'domains' && <DomainManager />}
        {currentView === 'mailboxes' && <MailboxManager />}
        {currentView === 'security' && <SecurityHub />}
        {currentView === 'team' && <TeamManager />}
        {currentView === 'billing' && <BillingView />}
      </main>

      <ComposerModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        initialTo={composePrefill.to || ''}
        initialSubject={composePrefill.subject || ''}
        initialBody={composePrefill.body || ''}
        onSent={() => {
          refreshAll();
        }}
      />

      <InboundSimulatorModal
        isOpen={isSimulateOpen}
        onClose={() => setIsSimulateOpen(false)}
        onSimulated={() => {
          refreshAll();
        }}
      />

      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onNavigate={setCurrentView}
        onCompose={() => {
          setComposePrefill({});
          setIsComposeOpen(true);
        }}
        onSimulate={() => setIsSimulateOpen(true)}
        onToggleTheme={toggleTheme}
        onLogout={() => {
          void logout();
        }}
        onOpenStatus={openStatus}
      />

      <AuthModal
        isOpen={authOpen}
        mode={authMode}
        resetToken={resetToken}
        onClose={() => setAuthOpen(false)}
        onSwitchMode={setAuthMode}
      />

      <SessionExpiryModal inactivityTimeoutMinutes={15} warningThresholdMinutes={5} />

      {toast && (
        <div
          id="global-toast-notification"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-md bg-[#0F0F12] border border-[#27272A] shadow-2xl text-xs text-[#E4E4E7]"
        >
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-neutral-300 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
