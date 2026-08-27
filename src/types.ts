export type Role = 'owner' | 'admin' | 'member' | 'mailbox_user';

export type PlanId = 'starter' | 'pro' | 'enterprise';
export type PlanTier = 'STARTER' | 'PRO' | 'ENTERPRISE' | 'starter' | 'pro' | 'enterprise';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'active' | 'invited';
  mfaEnabled?: boolean;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: Role;
  mfaEnabled: boolean;
  totpSecret?: string;
  recoveryKeys?: string[];
  undoSendSeconds?: number;
  passwordHash?: string;
  isEmailVerified?: boolean;
  verificationToken?: string;
  verificationTokenExpiresAt?: string;
  resetPasswordToken?: string;
  resetPasswordExpiresAt?: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: PlanId;
  billingStatus: 'active' | 'trialing' | 'past_due' | 'canceled';
  billingPeriod: 'monthly' | 'annual';
  maxDomains: number;
  maxMailboxes: number;
  maxStorageGb: number;
  currentStorageMb: number;
  createdAt: string;
}

export interface Membership {
  id: string;
  organizationId: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: Role;
  mailboxGrants: string[]; // mailboxIds
  invitedAt?: string;
  status: 'active' | 'invited';
}

export type DnsRecordType = 'MX' | 'TXT' | 'CNAME' | 'A';

export interface DnsRecordConfig {
  type: DnsRecordType;
  host: string;
  value: string;
  priority?: number;
  ttl: number;
  purpose: 'mx' | 'spf' | 'dkim' | 'dmarc' | 'autoconfig' | 'verification';
  isVerified: boolean;
  statusMessage?: string;
  observedValue?: string;
}

export interface Domain {
  id: string;
  organizationId: string;
  domainName: string;
  status: 'active' | 'pending_dns' | 'misconfigured';
  mxVerified: boolean;
  spfVerified: boolean;
  dkimVerified: boolean;
  dmarcVerified: boolean;
  dkimSelector: string;
  dkimPublicKey: string;
  verificationToken: string;
  createdAt: string;
  lastCheckedAt: string;
  catchAllMailboxId?: string;
}

export interface Mailbox {
  id: string;
  organizationId: string;
  domainId: string;
  domainName: string;
  emailAddress: string;
  name: string;
  type: 'individual' | 'shared' | 'catch_all';
  quotaMb: number;
  usedMb: number;
  signature?: string;
  autoReplyEnabled: boolean;
  autoReplySubject?: string;
  autoReplyBody?: string;
  vacationResponder?: VacationResponder;
  isCatchAll: boolean;
  createdAt: string;
}

export interface Alias {
  id: string;
  organizationId: string;
  domainId: string;
  domainName: string;
  aliasAddress: string;
  targetMailboxId: string;
  targetEmail: string;
  description: string;
  isEnabled: boolean;
  createdAt: string;
}

export interface EmailAddress {
  name?: string;
  address: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  dataUrl?: string;
}

export type MailFolder = 'inbox' | 'starred' | 'snoozed' | 'sent' | 'drafts' | 'archive' | 'spam' | 'trash' | string;

export interface CustomFolder {
  id: string;
  organizationId: string;
  mailboxId?: string;
  name: string;
  color: string;
  icon?: string;
  createdAt: string;
}

export interface EmailSignature {
  id: string;
  organizationId: string;
  mailboxId?: string;
  name: string;
  content: string;
  isDefault: boolean;
  createdAt: string;
}

export interface SpamRule {
  id: string;
  organizationId: string;
  senderPattern: string; // e.g. email address or domain
  reason?: string;
  createdAt: string;
}

export interface EmailHeaders {
  messageId: string;
  inReplyTo?: string;
  spfPass: boolean;
  dkimPass: boolean;
  dmarcPass: boolean;
  receivedFromIp?: string;
  clientUserAgent?: string;
  dispositionNotificationTo?: string;
  xConfirmReadingTo?: string;
}

export interface MessageReaction {
  id: string;
  emoji: string;
  userEmail: string;
  userName: string;
  timestamp: string;
}

export interface ConfidentialModeConfig {
  expiresAt?: string;
  passcodeRequired?: boolean;
  passcode?: string;
  isLocked?: boolean;
}

export interface SecurityScore {
  isPhishingSuspect: boolean;
  suspicionScore: number; // 0 - 100
  reasons: string[];
  linksFound: string[];
  senderAuthentic: boolean;
}

export interface AiThreadIntelligence {
  urgency: 'Urgent' | 'High' | 'Standard' | 'Low';
  sentiment: 'Positive' | 'Neutral' | 'Critical' | 'Curious';
  summary: string;
  actionItems: string[];
  suggestedQuickReplies: string[];
}

export interface EmailTemplate {
  id: string;
  organizationId: string;
  mailboxId?: string;
  name: string;
  category: 'General' | 'Sales' | 'Support' | 'Legal' | 'Meeting';
  subject: string;
  bodyText: string;
  variables: string[];
  createdAt: string;
}

export interface FilterRule {
  id: string;
  organizationId: string;
  mailboxId?: string;
  name: string;
  conditionField: 'from' | 'to' | 'subject' | 'body';
  matchType: 'contains' | 'equals' | 'starts_with' | 'regex';
  matchValue: string;
  actions: {
    moveToFolder?: string;
    applyLabel?: string;
    markStar?: boolean;
    markRead?: boolean;
    autoSpam?: boolean;
    forwardTo?: string;
  };
  isEnabled: boolean;
  createdAt: string;
}

export interface Contact {
  id: string;
  organizationId: string;
  mailboxId?: string;
  name: string;
  email: string;
  company?: string;
  role?: string;
  phone?: string;
  notes?: string;
  isVip?: boolean;
  avatarColor?: string;
  lastContactedAt?: string;
  createdAt: string;
}

export interface InternalNote {
  id: string;
  organizationId: string;
  threadId: string;
  userId: string;
  userName: string;
  userEmail: string;
  content: string;
  createdAt: string;
}

export interface PgpKey {
  id: string;
  organizationId: string;
  mailboxId?: string;
  name: string;
  email: string;
  fingerprint: string;
  publicKey: string;
  isDefault: boolean;
  algorithm: string;
  createdAt: string;
}

export interface RetentionPolicy {
  organizationId: string;
  autoPurgeTrashDays: number; // e.g. 30
  autoPurgeSpamDays: number; // e.g. 14
  autoArchiveDays: number; // e.g. 180
  isEnabled: boolean;
  lastPurgedAt?: string;
  lastPurgedCount?: number;
}

export interface BlockedSender {
  id: string;
  organizationId: string;
  pattern: string; // email address or @domain
  type: 'block' | 'allow';
  reason?: string;
  createdAt: string;
}

export interface VacationResponder {
  isEnabled: boolean;
  startDate: string;
  endDate: string;
  subject: string;
  bodyText: string;
  onlyKnownContacts: boolean;
}

export interface Message {
  id: string;
  organizationId: string;
  mailboxId: string;
  mailboxEmail: string;
  threadId: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  snippet: string;
  bodyHtml: string;
  bodyText: string;
  folder: MailFolder;
  customFolderId?: string;
  isRead: boolean;
  isStarred: boolean;
  isDraft: boolean;
  labels: string[];
  attachments: EmailAttachment[];
  headers: EmailHeaders;
  scheduledFor?: string;
  readReceiptRequested?: boolean;
  readReceiptStatus?: 'pending' | 'opened';
  readReceiptOpenedAt?: string;
  readReceiptOpenCount?: number;
  readReceiptOpenedFromIp?: string;
  readReceiptUserAgent?: string;
  reactions?: MessageReaction[];
  confidential?: ConfidentialModeConfig;
  securityScore?: SecurityScore;
  calendarInvite?: CalendarEventInvite;
  createdAt: string;
}

export interface Thread {
  id: string;
  organizationId: string;
  mailboxId: string;
  subject: string;
  snippet: string;
  lastMessageAt: string;
  unreadCount: number;
  messageCount: number;
  isStarred: boolean;
  isArchived: boolean;
  isSpam: boolean;
  isTrash: boolean;
  isSnoozed?: boolean;
  snoozedUntil?: string;
  isScheduled?: boolean;
  isVip?: boolean;
  folder?: MailFolder;
  customFolderId?: string;
  labels: string[];
  participants: EmailAddress[];
  messages?: Message[];
  aiIntelligence?: AiThreadIntelligence;
}

export interface LoginAttempt {
  id: string;
  organizationId?: string;
  userId?: string;
  userEmail: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  device: string;
  browser: string;
  os: string;
  location: string;
  status: 'success' | 'failed' | 'mfa_challenge' | 'blocked';
  authMethod: 'password_mfa' | 'hardware_key' | 'session_refresh' | 'imap_token' | 'api_token';
  details?: string;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  userId: string;
  userEmail: string;
  action: string;
  category: 'auth' | 'domain' | 'mailbox' | 'security' | 'billing' | 'mail';
  ipAddress: string;
  details: string;
  timestamp: string;
}

export interface ApiKey {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  keyPrefix: string;
  keySecret?: string; // only returned upon creation
  scopes: string[];
  lastUsedAt?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  organizationId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  planName: string;
  date: string;
  pdfUrl?: string;
  preview?: boolean;
}

export interface OnboardingState {
  currentStep: number;
  completedSteps: number[];
  selectedPlan: PlanId;
  domainName: string;
  dnsVerified: boolean;
  firstMailboxEmail: string;
  firstMailboxCreated: boolean;
}

export interface AppPassword {
  id: string;
  organizationId: string;
  userId: string;
  mailboxId: string;
  mailboxEmail: string;
  name: string;
  passwordPrefix: string;
  passwordSecret?: string;
  scopes: ('imap' | 'smtp' | 'pop3' | 'caldav' | 'carddav')[];
  createdAt: string;
  lastUsedAt?: string;
}

export interface CalendarEventInvite {
  id: string;
  title: string;
  start: string;
  end: string;
  timezone: string;
  location?: string;
  conferenceUrl?: string;
  organizer: { name: string; email: string };
  attendees: { name?: string; email: string; status: 'accepted' | 'declined' | 'tentative' | 'needs-action' }[];
  myStatus: 'accepted' | 'declined' | 'tentative' | 'needs-action';
  description?: string;
  icsData?: string;
}

export interface BimiConfig {
  id: string;
  organizationId: string;
  domainId: string;
  domainName: string;
  svgLogoUrl: string;
  vmcCertUrl?: string;
  selector: string;
  isConfigured: boolean;
  verifiedMarkStatus: 'verified' | 'self_asserted' | 'pending_verification' | 'invalid';
  dnsRecordValue: string;
  updatedAt: string;
}

export interface DeliverabilityAudit {
  overallScore: number;
  inboxPlacementRate: number;
  spfAlignment: boolean;
  dkimAlignment: boolean;
  dmarcPolicy: 'reject' | 'quarantine' | 'none';
  mtaStsEnabled: boolean;
  tls13Rate: number;
  blacklists: {
    service: string;
    host: string;
    status: 'clean' | 'listed';
    category: string;
    responseTimeMs: number;
  }[];
  dmarcReports: {
    sourceIp: string;
    organization: string;
    count: number;
    spfPass: boolean;
    dkimPass: boolean;
    disposition: 'none' | 'quarantine' | 'reject';
    country: string;
  }[];
  spamAssassinScore: number;
  recommendations: string[];
}
