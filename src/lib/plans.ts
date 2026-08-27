import type { PlanId } from '../types.js';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualMonthlyPrice: number;
  maxDomains: number;
  maxMailboxes: number;
  maxStorageGb: number;
  popular?: boolean;
  features: string[];
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    tagline: 'For solo creators and independent craft studios.',
    monthlyPrice: 9,
    annualMonthlyPrice: 7,
    maxDomains: 1,
    maxMailboxes: 3,
    maxStorageGb: 10,
    features: [
      '1 custom apex or subdomain',
      '3 mailboxes included',
      '10 GB encrypted storage',
      'DKIM 2048-bit RSA + SPF + DMARC',
      'IMAP / SMTP client gateway',
      'Webmail, filters, and aliases',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro Studio',
    tagline: 'For growing design agencies and boutique firms.',
    monthlyPrice: 29,
    annualMonthlyPrice: 24,
    maxDomains: 5,
    maxMailboxes: 20,
    maxStorageGb: 50,
    popular: true,
    features: [
      '5 custom domains',
      '20 mailboxes + shared inboxes',
      '50 GB encrypted storage',
      'Gemini AI email copilot',
      'Unlimited forwarding aliases',
      'Audit logs, RBAC, and BIMI branding',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Sovereign',
    tagline: 'For organizations with multi-brand infrastructure needs.',
    monthlyPrice: 99,
    annualMonthlyPrice: 82,
    maxDomains: 25,
    maxMailboxes: 100,
    maxStorageGb: 250,
    features: [
      '25 custom domains',
      '100 mailboxes and teams',
      '250 GB encrypted storage',
      'Custom DKIM key rotation',
      'Dedicated IP ingress and egress',
      'Priority 24/7 engineering SLA',
    ],
  },
};

export const PLAN_LIST: PlanDefinition[] = [PLANS.starter, PLANS.pro, PLANS.enterprise];

/** Public identity of the seeded preview studio. Sign-in uses POST /api/auth/demo — no password in the client. */
export const DEMO_ACCOUNT = {
  email: 'alex.vance@atelier-nordic.com',
  name: 'Alex Vance',
  studio: 'Atelier Nordic',
};

export function normalizePlanId(plan: string | undefined | null): PlanId {
  const value = (plan || 'pro').toLowerCase();
  if (value === 'starter' || value === 'enterprise') return value;
  return 'pro';
}

export function getPlanLimits(plan: string | undefined | null) {
  const def = PLANS[normalizePlanId(plan)];
  return {
    maxDomains: def.maxDomains,
    maxMailboxes: def.maxMailboxes,
    maxStorageGb: def.maxStorageGb,
    price: def.monthlyPrice,
    name: def.name,
  };
}

export function formatPlanPrice(plan: PlanDefinition, annual: boolean): string {
  return `$${annual ? plan.annualMonthlyPrice : plan.monthlyPrice}`;
}
