import React, { useState } from 'react';
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
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

function AppContent() {
  const { currentView, setCurrentView, toast, showToast, refreshAll } = useAuth();
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [composePrefill, setComposePrefill] = useState<{
    to?: string;
    subject?: string;
    body?: string;
  }>({});

  // If on landing page view
  if (currentView === 'landing') {
    return (
      <LandingPage
        onEnterApp={() => setCurrentView('webmail')}
        onStartOnboarding={() => setCurrentView('onboarding')}
      />
    );
  }

  // If in onboarding flow
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

  return (
    <div id="monogram-app-root" className="h-screen w-screen flex flex-col bg-[#0A0A0B] text-[#E4E4E7] overflow-hidden font-sans">
      {/* 1. Global Navigation Bar */}
      <Navigation
        onOpenCompose={() => {
          setComposePrefill({});
          setIsComposeOpen(true);
        }}
        onOpenSimulate={() => setIsSimulateOpen(true)}
      />

      {/* 2. Main Viewport */}
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

      {/* Global Modals */}
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

      {/* Sovereign Security: Session Inactivity Warning Modal */}
      <SessionExpiryModal inactivityTimeoutMinutes={15} warningThresholdMinutes={5} />

      {/* Toast Notification Container */}
      {toast && (
        <div
          id="global-toast-notification"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-md bg-[#0F0F12] border border-[#27272A] shadow-2xl text-xs text-[#E4E4E7] animate-in slide-in-from-bottom-5 duration-200"
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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
