import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShieldAlert, Clock, RefreshCw, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface SessionExpiryModalProps {
  /**
   * Total allowed idle duration before automatic sign out in minutes.
   * Default: 15 minutes.
   */
  inactivityTimeoutMinutes?: number;
  /**
   * Minutes before logout to show the warning modal.
   * Default: 5 minutes (as requested: warning triggers 5 minutes before inactivity logs the user out).
   */
  warningThresholdMinutes?: number;
}

export const SessionExpiryModal: React.FC<SessionExpiryModalProps> = ({
  inactivityTimeoutMinutes = 15,
  warningThresholdMinutes = 5,
}) => {
  const { user, logout, showToast, refreshAll } = useAuth();
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(warningThresholdMinutes * 60);
  const lastActivityRef = useRef<number>(Date.now());
  const countdownIntervalRef = useRef<any>(null);

  const totalTimeoutMs = inactivityTimeoutMinutes * 60 * 1000;
  const warningThresholdMs = warningThresholdMinutes * 60 * 1000;
  const idleBeforeWarningMs = Math.max(1000, totalTimeoutMs - warningThresholdMs);

  // Reset user activity timestamp
  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Extend active session
  const handleExtendSession = async () => {
    lastActivityRef.current = Date.now();
    setIsWarningOpen(false);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    try {
      await refreshAll();
      showToast('Session successfully extended for 15 minutes', 'success');
    } catch {
      showToast('Session refreshed', 'info');
    }
  };

  // Immediate manual sign out
  const handleSignOutNow = () => {
    setIsWarningOpen(false);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    logout();
    showToast('Signed out of session', 'info');
  };

  // Manual trigger for testing/previewing the subtle session expiry modal
  const handleTriggerTest = () => {
    setSecondsRemaining(warningThresholdMinutes * 60);
    setIsWarningOpen(true);
  };

  // Activity listeners across window
  useEffect(() => {
    if (!user) return;

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handleUserInteraction = () => {
      // Only reset activity if warning modal is not currently open
      if (!isWarningOpen) {
        recordActivity();
      }
    };

    events.forEach((ev) => window.addEventListener(ev, handleUserInteraction, { passive: true }));

    // Global listener for test trigger
    const handleTestEvent = () => handleTriggerTest();
    window.addEventListener('monogram:test-session-expiry', handleTestEvent);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserInteraction));
      window.removeEventListener('monogram:test-session-expiry', handleTestEvent);
    };
  }, [user, isWarningOpen, recordActivity]);

  // Inactivity polling check
  useEffect(() => {
    if (!user) {
      setIsWarningOpen(false);
      return;
    }

    const checkInterval = setInterval(() => {
      if (isWarningOpen) return;

      const idleDuration = Date.now() - lastActivityRef.current;
      if (idleDuration >= idleBeforeWarningMs) {
        // Trigger the 5-minute warning modal!
        const remainingSecs = Math.max(0, Math.round((totalTimeoutMs - idleDuration) / 1000));
        setSecondsRemaining(remainingSecs > 0 ? remainingSecs : warningThresholdMinutes * 60);
        setIsWarningOpen(true);
      }
    }, 2000);

    return () => clearInterval(checkInterval);
  }, [user, isWarningOpen, idleBeforeWarningMs, totalTimeoutMs, warningThresholdMinutes]);

  // Countdown timer while warning is visible
  useEffect(() => {
    if (!isWarningOpen) {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      return;
    }

    countdownIntervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          // Schedule logout outside state updater
          setTimeout(() => {
            setIsWarningOpen(false);
            logout();
            showToast('Your session expired due to inactivity. Please log in again.', 'error');
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [isWarningOpen, logout, showToast]);

  if (!isWarningOpen || !user) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div
      id="session-expiry-warning-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-[#0F0F12] border border-[#27272A] rounded-xl shadow-2xl overflow-hidden text-[#E4E4E7] transform animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#27272A] bg-[#141418] flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white flex items-center gap-2">
              <span>Session Inactivity Warning</span>
            </h3>
            <p className="text-xs text-[#A1A1AA]">Sovereign Security & Access Protection</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="flex flex-col items-center justify-center p-5 rounded-lg bg-[#18181B] border border-[#27272A] text-center space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono-code text-[#A1A1AA] uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Automatic Sign-Out In</span>
            </div>
            <div className="text-3xl font-mono-code font-bold tracking-tight text-amber-300">
              {formattedTime}
            </div>
            <p className="text-[11px] text-[#71717A] max-w-xs">
              Due to 10 minutes of inactivity, your encrypted session will terminate automatically to safeguard sensitive communications.
            </p>
          </div>

          <div className="space-y-2 text-xs text-[#A1A1AA]">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <span>
                Extending resets your 15-minute inactivity security window and retains all active draft buffers.
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#141418] border-t border-[#27272A] flex items-center justify-between gap-3">
          <button
            id="session-logout-now-btn"
            onClick={handleSignOutNow}
            className="px-3.5 py-2 rounded-md text-xs font-medium text-[#A1A1AA] hover:text-rose-300 hover:bg-rose-500/10 border border-[#27272A] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Now</span>
          </button>

          <button
            id="session-extend-btn"
            onClick={handleExtendSession}
            className="px-5 py-2 rounded-md text-xs font-semibold bg-white hover:bg-[#E4E4E7] text-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Extend Session</span>
          </button>
        </div>
      </div>
    </div>
  );
};
