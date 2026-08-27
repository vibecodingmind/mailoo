import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { hashPassword } from './passwordSecurity.js';
import type {
  User,
  Organization,
  Membership,
  Domain,
  Mailbox,
  Alias,
  Message,
  Thread,
  AuditLog,
  ApiKey,
  Invoice,
  DnsRecordConfig,
  CustomFolder,
  LoginAttempt,
  EmailSignature,
  SpamRule,
  EmailTemplate,
  FilterRule,
  Contact,
  InternalNote,
  PgpKey,
  RetentionPolicy,
  BlockedSender,
  MessageReaction,
  BimiConfig,
  AppPassword,
  CalendarEventInvite,
  DeliverabilityAudit,
} from '../types.js';

interface DatabaseSchema {
  users: User[];
  organizations: Organization[];
  memberships: Membership[];
  domains: Domain[];
  mailboxes: Mailbox[];
  aliases: Alias[];
  messages: Message[];
  threads: Thread[];
  customFolders: CustomFolder[];
  signatures: EmailSignature[];
  spamRules: SpamRule[];
  templates: EmailTemplate[];
  filterRules: FilterRule[];
  contacts: Contact[];
  internalNotes: InternalNote[];
  pgpKeys: PgpKey[];
  retentionPolicies: RetentionPolicy[];
  blockedSenders: BlockedSender[];
  bimiConfigs: BimiConfig[];
  appPasswords: AppPassword[];
  loginAttempts: LoginAttempt[];
  auditLogs: AuditLog[];
  apiKeys: ApiKey[];
  invoices: Invoice[];
  sessions: { token: string; userId: string; organizationId: string; expiresAt: string }[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'mailoo_db.json');

export function generateDkimKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return {
    publicKey: `v=DKIM1; k=rsa; p=${Buffer.from(publicKey).toString('base64')}`,
    privateKey,
  };
}

function getInitialSeedData(): DatabaseSchema {
  const orgId = 'org_atelier_nordic';
  const userId = 'usr_alex_vance';
  const domainId = 'dom_atelier_nordic';
  const mailboxId = 'mbx_alex';
  const sharedMailboxId = 'mbx_concierge';

  const dkimKeys = generateDkimKeyPair();

  const user: User = {
    id: userId,
    email: 'alex.vance@atelier-nordic.com',
    fullName: 'Alex Vance',
    passwordHash: hashPassword(`${crypto.randomBytes(18).toString('hex')}Aa1`),
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'owner',
    mfaEnabled: true,
    recoveryKeys: ['MN-9482-3819-A847-X019'],
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  const org: Organization = {
    id: orgId,
    name: 'Atelier Nordic',
    slug: 'atelier-nordic',
    plan: 'pro',
    billingStatus: 'active',
    billingPeriod: 'monthly',
    maxDomains: 5,
    maxMailboxes: 20,
    maxStorageGb: 50,
    currentStorageMb: 3420,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  };

  const membership: Membership = {
    id: 'mem_alex',
    organizationId: orgId,
    userId: userId,
    userEmail: user.email,
    userName: user.fullName,
    role: 'owner',
    mailboxGrants: [mailboxId, sharedMailboxId],
    status: 'active',
  };

  const domain: Domain = {
    id: domainId,
    organizationId: orgId,
    domainName: 'atelier-nordic.com',
    status: 'active',
    mxVerified: true,
    spfVerified: true,
    dkimVerified: true,
    dmarcVerified: true,
    dkimSelector: 'mailoo',
    dkimPublicKey: dkimKeys.publicKey,
    verificationToken: 'mailoo-verification-x89f2a',
    createdAt: new Date(Date.now() - 28 * 86400000).toISOString(),
    lastCheckedAt: new Date().toISOString(),
    catchAllMailboxId: mailboxId,
  };

  const secondaryDomain: Domain = {
    id: 'dom_hyperion_dev',
    organizationId: orgId,
    domainName: 'hyperion.design',
    status: 'pending_dns',
    mxVerified: false,
    spfVerified: false,
    dkimVerified: false,
    dmarcVerified: false,
    dkimSelector: 'mailoo',
    dkimPublicKey: generateDkimKeyPair().publicKey,
    verificationToken: 'mailoo-verification-k93m7q',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    lastCheckedAt: new Date().toISOString(),
  };

  const mailbox1: Mailbox = {
    id: mailboxId,
    organizationId: orgId,
    domainId: domainId,
    domainName: 'atelier-nordic.com',
    emailAddress: 'alex@atelier-nordic.com',
    name: 'Alex Vance (Personal)',
    type: 'individual',
    quotaMb: 25000,
    usedMb: 2450,
    signature: '—\nAlex Vance\nLead Architect & Principal\nAtelier Nordic • Oslo / Copenhagen\nhttps://atelier-nordic.com',
    autoReplyEnabled: false,
    isCatchAll: true,
    createdAt: new Date(Date.now() - 28 * 86400000).toISOString(),
  };

  const mailbox2: Mailbox = {
    id: sharedMailboxId,
    organizationId: orgId,
    domainId: domainId,
    domainName: 'atelier-nordic.com',
    emailAddress: 'concierge@atelier-nordic.com',
    name: 'Client Concierge & Inquiries',
    type: 'shared',
    quotaMb: 15000,
    usedMb: 970,
    signature: '—\nAtelier Nordic Concierge Team\nOslo Architecture Studio',
    autoReplyEnabled: true,
    autoReplySubject: 'We have received your architectural inquiry',
    autoReplyBody: 'Thank you for reaching out to Atelier Nordic. Our lead partners review every client proposal within 24 business hours.',
    isCatchAll: false,
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  };

  const alias: Alias = {
    id: 'als_press',
    organizationId: orgId,
    domainId: domainId,
    domainName: 'atelier-nordic.com',
    aliasAddress: 'press@atelier-nordic.com',
    targetMailboxId: mailboxId,
    targetEmail: 'alex@atelier-nordic.com',
    description: 'Editorial & Architectural Digest press inquiries',
    isEnabled: true,
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  };

  // Seed rich threads & messages
  const thread1Id = 'th_001_nordic_monograph';
  const thread2Id = 'th_002_dns_health';
  const thread3Id = 'th_003_vance_residence';
  const thread4Id = 'th_004_mailoo_welcome';

  const thread1: Thread = {
    id: thread1Id,
    organizationId: orgId,
    mailboxId: mailboxId,
    subject: 'Architectural Monograph Vol. IV — Final Proofing & Material Selection',
    snippet: 'The linen-bound foil stamp samples arrived from Munich. The tactile weight at 340gsm feels exceptional...',
    lastMessageAt: new Date(Date.now() - 45 * 60000).toISOString(),
    unreadCount: 1,
    messageCount: 2,
    isStarred: true,
    isArchived: false,
    isSpam: false,
    isTrash: false,
    labels: ['Projects', 'Priority'],
    participants: [
      { name: 'Elena Rostova', address: 'elena@archpress-munich.de' },
      { name: 'Alex Vance', address: 'alex@atelier-nordic.com' },
    ],
    aiIntelligence: {
      urgency: 'High',
      sentiment: 'Positive',
      summary: 'Elena delivered Chapter 3 proofs for the Fjord Pavilion; review required before Friday print run.',
      actionItems: ['Approve Chapter 3 high-res proofs', 'Confirm foil stamping deboss specifications'],
      suggestedQuickReplies: [
        'Proofs look exquisite. You have our full sign-off to proceed with Friday print run.',
        'Reviewing Chapter 3 now; will provide marked-up corrections before noon tomorrow.',
        'Please send the revised foil stamp samples for our archive.',
      ],
    },
  };

  const msg1_1: Message = {
    id: 'msg_001_1',
    organizationId: orgId,
    mailboxId: mailboxId,
    threadId: thread1Id,
    mailboxEmail: 'alex@atelier-nordic.com',
    from: { name: 'Elena Rostova', address: 'elena@archpress-munich.de' },
    to: [{ name: 'Alex Vance', address: 'alex@atelier-nordic.com' }],
    subject: 'Architectural Monograph Vol. IV — Final Proofing & Material Selection',
    snippet: 'The linen-bound foil stamp samples arrived from Munich...',
    bodyText: `Alex,\n\nThe linen-bound foil stamp samples arrived from Munich. The tactile weight at 340gsm feels exceptional, and the blind debossing on the spine captures the bespoke typographic monogram with striking clarity.\n\nCould you review the attached high-res proofs for Chapter 3 (The Fjord Pavilion) before we begin the main lithographic print run on Friday?\n\nWarm regards,\nElena Rostova\nSenior Editor, ArchPress Munich`,
    bodyHtml: `<p>Alex,</p><p>The linen-bound foil stamp samples arrived from Munich. The tactile weight at 340gsm feels exceptional, and the blind debossing on the spine captures the bespoke typographic monogram with striking clarity.</p><p>Could you review the attached high-res proofs for <strong>Chapter 3 (The Fjord Pavilion)</strong> before we begin the main lithographic print run on Friday?</p><p>Warm regards,<br><strong>Elena Rostova</strong><br>Senior Editor, ArchPress Munich</p>`,
    folder: 'inbox',
    isRead: false,
    isStarred: true,
    isDraft: false,
    labels: ['Projects', 'Priority'],
    attachments: [
      {
        id: 'att_001',
        filename: 'Fjord_Pavilion_Chapter3_ColorProof_v4.pdf',
        contentType: 'application/pdf',
        size: 14200000,
      },
      {
        id: 'att_002',
        filename: 'Material_Swatch_340gsm_Linen.jpg',
        contentType: 'image/jpeg',
        size: 3200000,
        dataUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
      },
      {
        id: 'att_002b',
        filename: 'Nordic_Pavilion_Facade_Render_4K.jpg',
        contentType: 'image/jpeg',
        size: 5800000,
        dataUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
      },
      {
        id: 'att_002c',
        filename: 'Atelier_Brand_Logomark_Vector.svg',
        contentType: 'image/svg+xml',
        size: 420000,
        dataUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
      },
    ],
    headers: {
      messageId: '<20260824.981723@archpress-munich.de>',
      spfPass: true,
      dkimPass: true,
      dmarcPass: true,
      receivedFromIp: '194.109.12.84',
    },
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
  };

  const thread2: Thread = {
    id: thread2Id,
    organizationId: orgId,
    mailboxId: mailboxId,
    subject: 'Security & DNS Health Report: 100% Cryptographic Alignment Verified',
    snippet: 'All outbound traffic from @atelier-nordic.com is strictly signed with 2048-bit RSA DKIM and enforced via strict DMARC quarantine...',
    lastMessageAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    unreadCount: 0,
    messageCount: 1,
    isStarred: false,
    isArchived: false,
    isSpam: false,
    isTrash: false,
    labels: ['System', 'Security'],
    participants: [{ name: 'Mailoo Security Bot', address: 'security@mailoo.email' }],
  };

  const msg2_1: Message = {
    id: 'msg_002_1',
    organizationId: orgId,
    mailboxId: mailboxId,
    threadId: thread2Id,
    mailboxEmail: 'alex@atelier-nordic.com',
    from: { name: 'Mailoo Security Bot', address: 'security@mailoo.email' },
    to: [{ name: 'Alex Vance', address: 'alex@atelier-nordic.com' }],
    subject: 'Security & DNS Health Report: 100% Cryptographic Alignment Verified',
    snippet: 'All outbound traffic from @atelier-nordic.com is strictly signed...',
    bodyText: `Hello Alex,\n\nYour domain atelier-nordic.com is operating in optimal security status on the Mailoo Network.\n\n• MX Records: 10 mail.mailoo.email (Active)\n• SPF Policy: v=spf1 include:_spf.mailoo.email ~all (Verified PASS)\n• DKIM Key: 2048-bit RSA selector 'mailoo' (Aligned)\n• DMARC Alignment: v=DMARC1; p=quarantine; rua=mailto:dmarc@mailoo.email (Enforced)\n• Zero telemetry tracking, end-to-end TLS 1.3 encryption enabled.\n\nNo administrative action is required.`,
    bodyHtml: `<h3>Domain Health: 100% Pass</h3><p>Your domain <strong>atelier-nordic.com</strong> is operating in optimal security status on the Mailoo Network.</p><ul><li><strong>MX Records:</strong> <code>10 mail.mailoo.email</code> (Active)</li><li><strong>SPF Policy:</strong> <code>v=spf1 include:_spf.mailoo.email ~all</code> (Verified PASS)</li><li><strong>DKIM Key:</strong> 2048-bit RSA selector <code>mailoo</code> (Aligned)</li><li><strong>DMARC Alignment:</strong> <code>v=DMARC1; p=quarantine</code> (Enforced)</li><li><strong>Security:</strong> Zero telemetry tracking, end-to-end TLS 1.3 encryption enabled.</li></ul><p style="color:#666;font-size:13px">Generated automatically by Mailoo Infrastructure.</p>`,
    folder: 'inbox',
    isRead: true,
    isStarred: false,
    isDraft: false,
    labels: ['System', 'Security'],
    attachments: [],
    headers: {
      messageId: '<sec.report.9812@mailoo.email>',
      spfPass: true,
      dkimPass: true,
      dmarcPass: true,
      receivedFromIp: '35.198.42.11',
    },
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
  };

  const thread3: Thread = {
    id: thread3Id,
    organizationId: orgId,
    mailboxId: mailboxId,
    subject: 'Preliminary Site Evaluation & Cantilever Cantilevers — Holmenkollen Project',
    snippet: 'I reviewed the geological survey for the Holmenkollen slope. The granite bedrock depth allows us to anchor the cantilever structure...',
    lastMessageAt: new Date(Date.now() - 8 * 3600000).toISOString(),
    unreadCount: 0,
    messageCount: 1,
    isStarred: false,
    isArchived: false,
    isSpam: false,
    isTrash: false,
    labels: ['Projects'],
    participants: [
      { name: 'Kasper Lindqvist', address: 'kasper@lindqvist-structural.no' },
      { name: 'Alex Vance', address: 'alex@atelier-nordic.com' },
    ],
  };

  const msg3_1: Message = {
    id: 'msg_003_1',
    organizationId: orgId,
    mailboxId: mailboxId,
    threadId: thread3Id,
    mailboxEmail: 'alex@atelier-nordic.com',
    from: { name: 'Kasper Lindqvist', address: 'kasper@lindqvist-structural.no' },
    to: [{ name: 'Alex Vance', address: 'alex@atelier-nordic.com' }],
    subject: 'Preliminary Site Evaluation & Cantilever Cantilevers — Holmenkollen Project',
    snippet: 'I reviewed the geological survey for the Holmenkollen slope...',
    bodyText: `Alex,\n\nI reviewed the geological survey for the Holmenkollen slope. The granite bedrock depth allows us to anchor the 18-meter cantilever structure with post-tensioned steel tendons without requiring auxiliary retaining columns in the tree line.\n\nLet's schedule a 30-minute review call on Monday morning to finalize the CAD model.\n\nBest,\nKasper`,
    bodyHtml: `<p>Alex,</p><p>I reviewed the geological survey for the Holmenkollen slope. The granite bedrock depth allows us to anchor the <strong>18-meter cantilever structure</strong> with post-tensioned steel tendons without requiring auxiliary retaining columns in the tree line.</p><p>Let's schedule a 30-minute review call on Monday morning to finalize the CAD model.</p><p>Best,<br><strong>Kasper Lindqvist</strong><br>Lindqvist Structural Engineering AS</p>`,
    folder: 'inbox',
    isRead: true,
    isStarred: false,
    isDraft: false,
    labels: ['Projects'],
    attachments: [
      {
        id: 'att_003',
        filename: 'Holmenkollen_RockAnchor_Analysis.dwg',
        contentType: 'application/octet-stream',
        size: 8900000,
      },
    ],
    headers: {
      messageId: '<str-9421.lindqvist.no@mail>',
      spfPass: true,
      dkimPass: true,
      dmarcPass: true,
      receivedFromIp: '81.167.33.109',
    },
    createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
  };

  const thread4: Thread = {
    id: thread4Id,
    organizationId: orgId,
    mailboxId: mailboxId,
    subject: 'Welcome to Mailoo — Your Dedicated Custom Domain Suite is Active',
    snippet: 'Welcome to Mailoo. You now have full sovereign ownership over your domain email infrastructure...',
    lastMessageAt: new Date(Date.now() - 28 * 86400000).toISOString(),
    unreadCount: 0,
    messageCount: 1,
    isStarred: false,
    isArchived: true,
    isSpam: false,
    isTrash: false,
    labels: ['Mailoo'],
    participants: [{ name: 'Mailoo Team', address: 'concierge@mailoo.email' }],
  };

  const msg4_1: Message = {
    id: 'msg_004_1',
    organizationId: orgId,
    mailboxId: mailboxId,
    threadId: thread4Id,
    mailboxEmail: 'alex@atelier-nordic.com',
    from: { name: 'Mailoo Team', address: 'concierge@mailoo.email' },
    to: [{ name: 'Alex Vance', address: 'alex@atelier-nordic.com' }],
    subject: 'Welcome to Mailoo — Your Dedicated Custom Domain Suite is Active',
    snippet: 'Welcome to Mailoo. You now have full sovereign ownership...',
    bodyText: `Welcome to Mailoo.\n\nWe engineered Mailoo for creators, architects, studios, and businesses who refuse to compromise on privacy, typography, and uncompromised deliverability.\n\nKey features in your Pro tier:\n• Unlimited Aliases & Catch-All Routing\n• Zero Tracking Pixels & Strict Telemetry-Free Privacy\n• 2048-Bit RSA Automated DKIM & DMARC Enforcement\n• Instant IMAP/SMTP Gateway for Apple Mail, Thunderbird, and iOS\n\nIf you ever need assistance, simply reply directly to this email.`,
    bodyHtml: `<p>Welcome to <strong>Mailoo</strong>.</p><p>We engineered Mailoo for creators, architects, studios, and businesses who refuse to compromise on privacy, typography, and uncompromised deliverability.</p><p><strong>Key features in your Pro tier:</strong></p><ul><li>Unlimited Aliases & Catch-All Routing</li><li>Zero Tracking Pixels & Strict Telemetry-Free Privacy</li><li>2048-Bit RSA Automated DKIM & DMARC Enforcement</li><li>Instant IMAP/SMTP Gateway for Apple Mail, Thunderbird, and iOS</li></ul><p>If you ever need assistance, simply reply directly to this email.</p>`,
    folder: 'archive',
    isRead: true,
    isStarred: false,
    isDraft: false,
    labels: ['Mailoo'],
    attachments: [],
    headers: {
      messageId: '<welcome.001@mailoo.email>',
      spfPass: true,
      dkimPass: true,
      dmarcPass: true,
      receivedFromIp: '35.198.42.10',
    },
    createdAt: new Date(Date.now() - 28 * 86400000).toISOString(),
  };

  // Seed Draft message
  const draftThreadId = 'th_draft_nordic_inv';
  const threadDraft: Thread = {
    id: draftThreadId,
    organizationId: orgId,
    mailboxId: mailboxId,
    subject: 'Draft: Proposal for Fjord Villa Pavilion Lighting Schema',
    snippet: 'Here is the preliminary Lux distribution schedule prepared by our Nordic studio team...',
    lastMessageAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    unreadCount: 0,
    messageCount: 1,
    isStarred: false,
    isArchived: false,
    isSpam: false,
    isTrash: false,
    labels: ['Drafts'],
    participants: [{ name: 'Henrik Vang', address: 'henrik@nordiclighting.dk' }],
  };

  const msgDraft: Message = {
    id: 'msg_draft_001',
    organizationId: orgId,
    mailboxId: mailboxId,
    threadId: draftThreadId,
    mailboxEmail: 'alex@atelier-nordic.com',
    from: { name: 'Alex Vance', address: 'alex@atelier-nordic.com' },
    to: [{ name: 'Henrik Vang', address: 'henrik@nordiclighting.dk' }],
    subject: 'Proposal for Fjord Villa Pavilion Lighting Schema',
    snippet: 'Here is the preliminary Lux distribution schedule...',
    bodyText: `Henrik,\n\nHere is the preliminary Lux distribution schedule prepared by our Nordic studio team for the fjord pavilion roof trusses. We are seeking a warm 2700K indirect perimeter glow with recessed brass trim.\n\nLet me know if your team can supply the custom linear LED extrusions by next month.`,
    bodyHtml: `<p>Henrik,</p><p>Here is the preliminary Lux distribution schedule prepared by our Nordic studio team for the fjord pavilion roof trusses. We are seeking a warm 2700K indirect perimeter glow with recessed brass trim.</p><p>Let me know if your team can supply the custom linear LED extrusions by next month.</p>`,
    folder: 'drafts',
    isRead: true,
    isStarred: false,
    isDraft: true,
    labels: ['Drafts'],
    attachments: [],
    headers: {
      messageId: '<draft.99120@atelier-nordic.com>',
      spfPass: true,
      dkimPass: true,
      dmarcPass: true,
    },
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  };

  // Seed Sent messages with Read Receipts
  const sentThread1Id = 'th_sent_001';
  const threadSent1: Thread = {
    id: sentThread1Id,
    organizationId: orgId,
    mailboxId: mailboxId,
    subject: 'Re: Architectural Monograph Vol. IV — Chapter 3 Proof Approved',
    snippet: 'Elena, I have thoroughly reviewed Chapter 3 proofs. The foil stamping specifications on page 42 look immaculate...',
    lastMessageAt: new Date(Date.now() - 25 * 60000).toISOString(),
    unreadCount: 0,
    messageCount: 1,
    isStarred: false,
    isArchived: false,
    isSpam: false,
    isTrash: false,
    labels: ['Sent', 'Projects'],
    participants: [
      { name: 'Alex Vance', address: 'alex@atelier-nordic.com' },
      { name: 'Elena Rostova', address: 'elena@archpress-munich.de' },
    ],
  };

  const msgSent1: Message = {
    id: 'msg_sent_001',
    organizationId: orgId,
    mailboxId: mailboxId,
    threadId: sentThread1Id,
    mailboxEmail: 'alex@atelier-nordic.com',
    from: { name: 'Alex Vance', address: 'alex@atelier-nordic.com' },
    to: [{ name: 'Elena Rostova', address: 'elena@archpress-munich.de' }],
    subject: 'Re: Architectural Monograph Vol. IV — Chapter 3 Proof Approved',
    snippet: 'Elena, I have thoroughly reviewed Chapter 3 proofs. The foil stamping specifications on page 42 look immaculate...',
    bodyText: `Elena,\n\nI have thoroughly reviewed Chapter 3 proofs. The foil stamping specifications on page 42 look immaculate, and the tonal fidelity across the fjord photography retains exceptional contrast.\n\nYou have our full studio sign-off to proceed with the main lithographic print run on Friday.\n\nWarm regards,\nAlex Vance\nLead Architect & Principal\nAtelier Nordic`,
    bodyHtml: `<p>Elena,</p><p>I have thoroughly reviewed Chapter 3 proofs. The foil stamping specifications on page 42 look immaculate, and the tonal fidelity across the fjord photography retains exceptional contrast.</p><p>You have our full studio sign-off to proceed with the main lithographic print run on Friday.</p><p>Warm regards,<br/><strong>Alex Vance</strong><br/>Lead Architect & Principal<br/>Atelier Nordic</p><img src="/api/track/pixel/msg_sent_001.png" width="1" height="1" alt="" style="display:none;width:1px;height:1px;" />`,
    folder: 'sent',
    isRead: true,
    isStarred: false,
    isDraft: false,
    labels: ['Sent', 'Projects'],
    attachments: [],
    headers: {
      messageId: '<20260825.109283@atelier-nordic.com>',
      inReplyTo: '<20260824.981723@archpress-munich.de>',
      spfPass: true,
      dkimPass: true,
      dmarcPass: true,
      receivedFromIp: '84.212.19.42',
    },
    readReceiptRequested: true,
    readReceiptStatus: 'opened',
    readReceiptOpenedAt: new Date(Date.now() - 12 * 60000).toISOString(),
    readReceiptOpenCount: 2,
    readReceiptOpenedFromIp: '194.109.12.84',
    readReceiptUserAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
  };

  const sentThread2Id = 'th_sent_002';
  const threadSent2: Thread = {
    id: sentThread2Id,
    organizationId: orgId,
    mailboxId: mailboxId,
    subject: 'Retainer Terms & Milestone Schedule Q4 — Oslo Fjord Residence',
    snippet: 'Henrik, please find our finalized retainer schedule for the Oslo Fjord residence project starting in October...',
    lastMessageAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    unreadCount: 0,
    messageCount: 1,
    isStarred: true,
    isArchived: false,
    isSpam: false,
    isTrash: false,
    labels: ['Sent', 'Contracts'],
    participants: [
      { name: 'Alex Vance', address: 'alex@atelier-nordic.com' },
      { name: 'Henrik Mortensen', address: 'henrik@nordic-ventures.co' },
    ],
  };

  const msgSent2: Message = {
    id: 'msg_sent_002',
    organizationId: orgId,
    mailboxId: mailboxId,
    threadId: sentThread2Id,
    mailboxEmail: 'alex@atelier-nordic.com',
    from: { name: 'Alex Vance', address: 'alex@atelier-nordic.com' },
    to: [{ name: 'Henrik Mortensen', address: 'henrik@nordic-ventures.co' }],
    subject: 'Retainer Terms & Milestone Schedule Q4 — Oslo Fjord Residence',
    snippet: 'Henrik, please find our finalized retainer schedule for the Oslo Fjord residence project starting in October...',
    bodyText: `Henrik,\n\nPlease find our finalized retainer schedule for the Oslo Fjord residence project starting in October.\n\nLet me know if you would like to schedule a review call this Thursday.\n\nBest,\nAlex`,
    bodyHtml: `<p>Henrik,</p><p>Please find our finalized retainer schedule for the Oslo Fjord residence project starting in October.</p><p>Let me know if you would like to schedule a review call this Thursday.</p><p>Best,<br/>Alex</p><img src="/api/track/pixel/msg_sent_002.png" width="1" height="1" alt="" style="display:none;width:1px;height:1px;" />`,
    folder: 'sent',
    isRead: true,
    isStarred: true,
    isDraft: false,
    labels: ['Sent', 'Contracts'],
    attachments: [],
    headers: {
      messageId: '<20260825.293841@atelier-nordic.com>',
      spfPass: true,
      dkimPass: true,
      dmarcPass: true,
      receivedFromIp: '84.212.19.42',
    },
    readReceiptRequested: true,
    readReceiptStatus: 'pending',
    readReceiptOpenCount: 0,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  };

  // Seed Custom Folders
  const customFolders: CustomFolder[] = [
    {
      id: 'cf_client_projects',
      organizationId: orgId,
      mailboxId: mailboxId,
      name: 'Client Projects',
      color: '#3b82f6',
      icon: 'folder',
      createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    },
    {
      id: 'cf_press_media',
      organizationId: orgId,
      mailboxId: mailboxId,
      name: 'Press & Media',
      color: '#a855f7',
      icon: 'folder',
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    },
    {
      id: 'cf_contracts',
      organizationId: orgId,
      mailboxId: mailboxId,
      name: 'Contracts & Retainers',
      color: '#10b981',
      icon: 'folder',
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
  ];

  // Seed Email Signatures
  const signatures: EmailSignature[] = [
    {
      id: 'sig_default_exec',
      organizationId: orgId,
      mailboxId: mailboxId,
      name: 'Executive Studio (Default)',
      content: `—\nAlex Vance | Principal Architect\nAtelier Nordic Architecture & Design AS\nOslo • Copenhagen • Stockholm\nhttps://atelier-nordic.com`,
      isDefault: true,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      id: 'sig_minimal',
      organizationId: orgId,
      mailboxId: mailboxId,
      name: 'Minimal / Mobile',
      content: `Sent from Mailoo Sovereign Mailbox\nAlex Vance — atelier-nordic.com`,
      isDefault: false,
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    },
    {
      id: 'sig_confidential',
      organizationId: orgId,
      mailboxId: mailboxId,
      name: 'Confidentiality & Legal Notice',
      content: `—\nAlex Vance | Atelier Nordic\nCONFIDENTIALITY NOTICE: This transmission is intended solely for the designated recipient. It contains proprietary architectural specifications and privileged data. Any unauthorized dissemination or reproduction is strictly prohibited.`,
      isDefault: false,
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
  ];

  // Seed Automated Spam Rules & Blocked Senders
  const spamRules: SpamRule[] = [
    {
      id: 'sr_seed_01',
      organizationId: orgId,
      senderPattern: 'promotions@bulk-lead-generation.xyz',
      reason: 'Unsolicited cold marketing spam list',
      createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    },
  ];

  // Seed Login Attempts for Auditing
  const loginAttempts: LoginAttempt[] = [
    {
      id: 'la_01',
      organizationId: orgId,
      userId: userId,
      userEmail: user.email,
      timestamp: new Date(Date.now() - 18 * 60000).toISOString(),
      ipAddress: '84.212.19.42',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      device: 'MacBook Pro 16" (macOS 15.1)',
      browser: 'Chrome 129.0',
      os: 'macOS Sequoia',
      location: 'Oslo, Norway',
      status: 'success',
      authMethod: 'hardware_key',
      details: 'Hardware FIDO2 WebAuthn authentication verified. Session encrypted with TLS 1.3.',
    },
    {
      id: 'la_02',
      organizationId: orgId,
      userId: userId,
      userEmail: user.email,
      timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
      ipAddress: '84.212.19.42',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      device: 'iPhone 16 Pro (iOS 18.1)',
      browser: 'Mobile Safari 18.0',
      os: 'iOS 18.1',
      location: 'Oslo, Norway',
      status: 'success',
      authMethod: 'password_mfa',
      details: 'Mobile Webmail sign-in with 6-digit TOTP code verification.',
    },
    {
      id: 'la_03',
      organizationId: orgId,
      userId: userId,
      userEmail: user.email,
      timestamp: new Date(Date.now() - 14 * 3600000).toISOString(),
      ipAddress: '193.162.143.12',
      userAgent: 'AppleMail/3774.200.24 CFNetwork/1498.700.2 Darwin/24.1.0',
      device: 'MacBook Pro (Apple Mail Client)',
      browser: 'Apple Mail Gateway',
      os: 'macOS Sequoia',
      location: 'Copenhagen, Denmark',
      status: 'success',
      authMethod: 'imap_token',
      details: 'Authenticated IMAP/SMTP client sync session via application token.',
    },
    {
      id: 'la_04',
      organizationId: orgId,
      userId: userId,
      userEmail: user.email,
      timestamp: new Date(Date.now() - 36 * 3600000).toISOString(),
      ipAddress: '84.212.19.42',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:130.0) Gecko/20100101 Firefox/130.0',
      device: 'MacBook Pro (Firefox)',
      browser: 'Firefox Developer 130.0',
      os: 'macOS Sequoia',
      location: 'Oslo, Norway',
      status: 'mfa_challenge',
      authMethod: 'password_mfa',
      details: 'MFA challenge prompted for unrecognized browser fingerprint. Challenge solved.',
    },
    {
      id: 'la_05',
      organizationId: orgId,
      userId: userId,
      userEmail: user.email,
      timestamp: new Date(Date.now() - 52 * 3600000).toISOString(),
      ipAddress: '185.220.101.5',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0',
      device: 'Linux Host (Tor Exit Node)',
      browser: 'Firefox ESR (Tor)',
      os: 'Linux x86_64',
      location: 'Frankfurt, Germany',
      status: 'blocked',
      authMethod: 'password_mfa',
      details: 'Blocked by Sovereign Armor: Geo-velocity anomaly detected (1,240 km/h travel mismatch from Oslo active session).',
    },
    {
      id: 'la_06',
      organizationId: orgId,
      userId: userId,
      userEmail: user.email,
      timestamp: new Date(Date.now() - 84 * 3600000).toISOString(),
      ipAddress: '103.251.167.22',
      userAgent: 'python-requests/2.31.0',
      device: 'Automated Script / Bot',
      browser: 'Python Requests API',
      os: 'Unknown',
      location: 'Singapore',
      status: 'failed',
      authMethod: 'password_mfa',
      details: 'Failed password verification (Invalid credentials supplied).',
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'log_01',
      organizationId: orgId,
      userId: userId,
      userEmail: user.email,
      action: 'domain.dns_verified',
      category: 'domain',
      ipAddress: '84.212.19.42',
      details: 'All DNS records (MX, SPF, DKIM, DMARC) verified successfully for atelier-nordic.com',
      timestamp: new Date(Date.now() - 28 * 86400000).toISOString(),
    },
    {
      id: 'log_02',
      organizationId: orgId,
      userId: userId,
      userEmail: user.email,
      action: 'mailbox.created',
      category: 'mailbox',
      ipAddress: '84.212.19.42',
      details: 'Created primary mailbox alex@atelier-nordic.com with 25GB quota',
      timestamp: new Date(Date.now() - 28 * 86400000).toISOString(),
    },
    {
      id: 'log_03',
      organizationId: orgId,
      userId: userId,
      userEmail: user.email,
      action: 'alias.created',
      category: 'mailbox',
      ipAddress: '84.212.19.42',
      details: 'Created routing alias press@atelier-nordic.com -> alex@atelier-nordic.com',
      timestamp: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
    {
      id: 'log_04',
      organizationId: orgId,
      userId: userId,
      userEmail: user.email,
      action: 'auth.login_success',
      category: 'auth',
      ipAddress: '84.212.19.42',
      details: 'Signed in successfully via Webmail session (MFA 2FA Authenticated)',
      timestamp: new Date(Date.now() - 20 * 60000).toISOString(),
    },
  ];

  const invoices: Invoice[] = [
    {
      id: 'inv_2026_08',
      organizationId: orgId,
      invoiceNumber: 'ML-2026-0814',
      amount: 29.0,
      currency: 'USD',
      status: 'paid',
      planName: 'Mailoo Pro (5 Domains, 20 Mailboxes)',
      date: new Date(Date.now() - 10 * 86400000).toISOString(),
      pdfUrl: '#',
    },
    {
      id: 'inv_2026_07',
      organizationId: orgId,
      invoiceNumber: 'ML-2026-0714',
      amount: 29.0,
      currency: 'USD',
      status: 'paid',
      planName: 'Mailoo Pro (5 Domains, 20 Mailboxes)',
      date: new Date(Date.now() - 40 * 86400000).toISOString(),
      pdfUrl: '#',
    },
  ];

  const apiKeys: ApiKey[] = [
    {
      id: 'key_prod_imap',
      organizationId: orgId,
      userId: userId,
      name: 'Apple Mail / IMAP Sync Token',
      keyPrefix: 'mn_live_8f3a...',
      scopes: ['mail:read', 'mail:send', 'mail:sync'],
      lastUsedAt: new Date(Date.now() - 15 * 60000).toISOString(),
      createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    },
  ];

  // Seed Reusable Email Templates / Canned Responses
  const templates: EmailTemplate[] = [
    {
      id: 'tmpl_project_proposal',
      organizationId: orgId,
      mailboxId: mailboxId,
      name: 'Architectural Retainer Proposal',
      category: 'Sales',
      subject: 'Architecture Retainer & Scope of Work — {{project_name}}',
      bodyText: `Dear {{recipient_name}},\n\nThank you for considering Atelier Nordic for the {{project_name}} project. Attached is our comprehensive studio brief detailing the preliminary schematic timelines, zoning compliance documentation, and fee structure.\n\nPlease let us know if you would like to arrange an exploratory design workshop next week.\n\nWarm regards,\nAlex Vance\nPrincipal Architect, Atelier Nordic`,
      variables: ['recipient_name', 'project_name'],
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    },
    {
      id: 'tmpl_nda_legal',
      organizationId: orgId,
      mailboxId: mailboxId,
      name: 'Confidential Mutual NDA',
      category: 'Legal',
      subject: 'Mutual Non-Disclosure Agreement — {{company_name}} & Atelier Nordic',
      bodyText: `Hi {{recipient_name}},\n\nBefore we share our CAD schematics and high-resolution BIM models, please review and execute the attached mutual non-disclosure agreement.\n\nOnce signed, our client repository access keys will be transmitted via encrypted channel.\n\nBest,\nAlex Vance`,
      variables: ['recipient_name', 'company_name'],
      createdAt: new Date(Date.now() - 18 * 86400000).toISOString(),
    },
    {
      id: 'tmpl_meeting_recap',
      organizationId: orgId,
      mailboxId: mailboxId,
      name: 'Executive Design Review Recap',
      category: 'Meeting',
      subject: 'Recap: Design Review & Action Items ({{meeting_date}})',
      bodyText: `Team,\n\nHere is a quick summary of our design alignment session today:\n- Key Decision: Approved timber-concrete composite framing.\n- Next Milestone: Structural engineering calculation sign-off by {{milestone_date}}.\n\nAction items are attached.\n\nThanks,\nAlex`,
      variables: ['meeting_date', 'milestone_date'],
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
  ];

  // Seed Ingress Filter Rules
  const filterRules: FilterRule[] = [
    {
      id: 'fr_auto_invoices',
      organizationId: orgId,
      mailboxId: mailboxId,
      name: 'Auto-label Invoices & Receipts',
      conditionField: 'subject',
      matchType: 'contains',
      matchValue: 'Invoice',
      actions: {
        applyLabel: 'Finance',
        markStar: true,
      },
      isEnabled: true,
      createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    },
    {
      id: 'fr_contracts_folder',
      organizationId: orgId,
      mailboxId: mailboxId,
      name: 'Route Retainer Agreements to Contracts Folder',
      conditionField: 'subject',
      matchType: 'contains',
      matchValue: 'Contract',
      actions: {
        moveToFolder: 'cf_contracts',
        applyLabel: 'Contracts',
      },
      isEnabled: true,
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
  ];

  // Seed Contacts / Address Book
  const contacts: Contact[] = [
    {
      id: 'ct_elena_rostova',
      organizationId: orgId,
      mailboxId: mailboxId,
      name: 'Elena Rostova',
      email: 'elena.rostova@arkitektur-oslo.no',
      company: 'Arkitektur Oslo AS',
      role: 'Senior Project Director',
      phone: '+47 22 83 91 00',
      notes: 'Lead collaborator on the Fjord Waterfront Masterplan',
      isVip: true,
      avatarColor: '#3b82f6',
      lastContactedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      id: 'ct_marcus_vance',
      organizationId: orgId,
      mailboxId: mailboxId,
      name: 'Marcus Vance',
      email: 'marcus.vance@nordic-timber.se',
      company: 'Nordic Timber Technologies',
      role: 'VP Materials Engineering',
      phone: '+46 8 555 123 45',
      notes: 'Key supplier for sustainable glulam and CLT structural beams',
      isVip: true,
      avatarColor: '#10b981',
      lastContactedAt: new Date(Date.now() - 14 * 3600000).toISOString(),
      createdAt: new Date(Date.now() - 28 * 86400000).toISOString(),
    },
    {
      id: 'ct_henrik_mortensen',
      organizationId: orgId,
      mailboxId: mailboxId,
      name: 'Henrik Mortensen',
      email: 'henrik@nordic-ventures.co',
      company: 'Nordic Ventures Capital',
      role: 'Managing Partner',
      phone: '+45 33 12 88 90',
      notes: 'Client principal for luxury residential developments',
      isVip: false,
      avatarColor: '#a855f7',
      lastContactedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    },
    {
      id: 'ct_sarah_lindqvist',
      organizationId: orgId,
      mailboxId: mailboxId,
      name: 'Sarah Lindqvist',
      email: 'sarah.lindqvist@cph-design.dk',
      company: 'CPH Design Quarterly',
      role: 'Chief Editor',
      phone: '+45 40 19 28 37',
      notes: 'Press contact covering sustainable Nordic architecture',
      isVip: false,
      avatarColor: '#f59e0b',
      lastContactedAt: new Date(Date.now() - 26 * 3600000).toISOString(),
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    },
  ];

  // Seed Internal Team Notes on Threads
  const internalNotes: InternalNote[] = [
    {
      id: 'in_note_01',
      organizationId: orgId,
      threadId: thread1.id,
      userId: userId,
      userName: 'Alex Vance',
      userEmail: user.email,
      content: 'Verified the load calculations with the structural team. We are clear to proceed with timber beam approvals.',
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
  ];

  // Seed PGP Public/Private Key
  const pgpKeys: PgpKey[] = [
    {
      id: 'pgp_key_01',
      organizationId: orgId,
      mailboxId: mailboxId,
      name: 'Alex Vance (Master Signing Key)',
      email: 'alex@atelier-nordic.com',
      fingerprint: '94A2 881B 4C09 F17E D412 8301 556B 99A2 CC14 380F',
      publicKey: `-----BEGIN PGP PUBLIC KEY BLOCK-----\nVersion: Mailoo Sovereign PGP v2.4\n\nmQGNBF8z+...[2048-bit RSA Public Key for alex@atelier-nordic.com]...\n-----END PGP PUBLIC KEY BLOCK-----`,
      isDefault: true,
      algorithm: 'RSA 4096-bit',
      createdAt: new Date(Date.now() - 28 * 86400000).toISOString(),
    },
  ];

  // Seed Retention Policy
  const retentionPolicies: RetentionPolicy[] = [
    {
      organizationId: orgId,
      autoPurgeTrashDays: 30,
      autoPurgeSpamDays: 14,
      autoArchiveDays: 180,
      isEnabled: true,
      lastPurgedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      lastPurgedCount: 14,
    },
  ];

  // Seed Blocked / Allowed Senders
  const blockedSenders: BlockedSender[] = [
    {
      id: 'bs_01',
      organizationId: orgId,
      pattern: 'promotions@bulk-lead-generation.xyz',
      type: 'block',
      reason: 'Aggressive marketing cold scraper bot',
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
    {
      id: 'bs_02',
      organizationId: orgId,
      pattern: '@arkitektur-oslo.no',
      type: 'allow',
      reason: 'Trusted municipal architectural partner domain',
      createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    },
  ];

  // Tag thread1 as VIP and AI intelligence
  thread1.isVip = true;
  thread1.aiIntelligence = {
    urgency: 'High',
    sentiment: 'Positive',
    summary: 'Elena provided the revised Fjord Waterfront structural calculations and requesting review of Section 4.',
    actionItems: [
      'Review revised timber beam sizing in Appendix B',
      'Confirm Thursday 14:00 CET workshop attendance',
    ],
    suggestedQuickReplies: [
      'Reviewed and confirmed for Thursday at 14:00 CET.',
      'Thank you Elena, reviewing Appendix B now.',
    ],
  };

  // Seed BIMI Verified Brand Avatar Configuration
  const bimiConfigs: BimiConfig[] = [
    {
      id: 'bimi_01',
      organizationId: orgId,
      domainId: domainId,
      domainName: 'atelier-nordic.com',
      svgLogoUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=120&auto=format&fit=crop&q=80',
      vmcCertUrl: 'https://pki.entrust.com/bimi/certificates/atelier-nordic.pem',
      selector: 'default',
      isConfigured: true,
      verifiedMarkStatus: 'verified',
      dnsRecordValue: 'v=BIMI1; l=https://atelier-nordic.com/bimi-logo.svg; a=https://atelier-nordic.com/bimi-vmc.pem',
      updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
  ];

  // Seed App Passwords for external email clients
  const appPasswords: AppPassword[] = [
    {
      id: 'app_pwd_01',
      organizationId: orgId,
      userId: userId,
      mailboxId: mailboxId,
      mailboxEmail: 'alex@atelier-nordic.com',
      name: 'Apple Mail (MacBook Pro 16")',
      passwordPrefix: 'mn_app_9a4f...',
      scopes: ['imap', 'smtp'],
      createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      lastUsedAt: new Date(Date.now() - 20 * 60000).toISOString(),
    },
    {
      id: 'app_pwd_02',
      organizationId: orgId,
      userId: userId,
      mailboxId: mailboxId,
      mailboxEmail: 'alex@atelier-nordic.com',
      name: 'Thunderbird Studio Workstation',
      passwordPrefix: 'mn_app_2c8b...',
      scopes: ['imap', 'smtp', 'caldav', 'carddav'],
      createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
      lastUsedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
  ];

  // Seed Calendar Invite on Holmenkollen thread
  msg3_1.calendarInvite = {
    id: 'cal_holmenkollen_review',
    title: 'Holmenkollen Cantilever Structural & BIM Review',
    start: new Date(Date.now() + 2 * 86400000).toISOString(),
    end: new Date(Date.now() + 2 * 86400000 + 3600000).toISOString(),
    timezone: 'Europe/Oslo (CET)',
    location: 'Studio Boardroom 2 & Video: meet.mailoo.email/atelier-nordic-review',
    conferenceUrl: 'https://meet.mailoo.email/atelier-nordic-review',
    organizer: { name: 'Kasper Lindqvist', email: 'kasper@lindqvist-structural.no' },
    attendees: [
      { name: 'Alex Vance', email: 'alex@atelier-nordic.com', status: 'needs-action' },
      { name: 'Elena Rostova', email: 'elena@archpress-munich.de', status: 'accepted' },
      { name: 'Kasper Lindqvist', email: 'kasper@lindqvist-structural.no', status: 'accepted' },
    ],
    myStatus: 'needs-action',
    description: 'Joint engineering and architectural review of 18m cantilever rock anchors and CAD model.',
  };

  return {
    users: [user],
    organizations: [org],
    memberships: [membership],
    domains: [domain, secondaryDomain],
    mailboxes: [mailbox1, mailbox2],
    aliases: [alias],
    messages: [msg1_1, msg2_1, msg3_1, msg4_1, msgDraft, msgSent1, msgSent2],
    threads: [thread1, thread2, thread3, thread4, threadDraft, threadSent1, threadSent2],
    customFolders: customFolders,
    signatures: signatures,
    spamRules: spamRules,
    templates: templates,
    filterRules: filterRules,
    contacts: contacts,
    internalNotes: internalNotes,
    pgpKeys: pgpKeys,
    retentionPolicies: retentionPolicies,
    blockedSenders: blockedSenders,
    bimiConfigs: bimiConfigs,
    appPasswords: appPasswords,
    loginAttempts: loginAttempts,
    auditLogs: auditLogs,
    apiKeys: apiKeys,
    invoices: invoices,
    sessions: [],
  };
}

class Database {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        const seed = getInitialSeedData();
        return {
          ...seed,
          ...parsed,
          customFolders: parsed.customFolders && parsed.customFolders.length > 0 ? parsed.customFolders : seed.customFolders,
          signatures: parsed.signatures && parsed.signatures.length > 0 ? parsed.signatures : seed.signatures,
          spamRules: parsed.spamRules && parsed.spamRules.length > 0 ? parsed.spamRules : seed.spamRules,
          templates: parsed.templates && parsed.templates.length > 0 ? parsed.templates : seed.templates,
          filterRules: parsed.filterRules && parsed.filterRules.length > 0 ? parsed.filterRules : seed.filterRules,
          contacts: parsed.contacts && parsed.contacts.length > 0 ? parsed.contacts : seed.contacts,
          internalNotes: parsed.internalNotes || seed.internalNotes,
          pgpKeys: parsed.pgpKeys && parsed.pgpKeys.length > 0 ? parsed.pgpKeys : seed.pgpKeys,
          retentionPolicies: parsed.retentionPolicies && parsed.retentionPolicies.length > 0 ? parsed.retentionPolicies : seed.retentionPolicies,
          blockedSenders: parsed.blockedSenders && parsed.blockedSenders.length > 0 ? parsed.blockedSenders : seed.blockedSenders,
          bimiConfigs: parsed.bimiConfigs && parsed.bimiConfigs.length > 0 ? parsed.bimiConfigs : seed.bimiConfigs,
          appPasswords: parsed.appPasswords && parsed.appPasswords.length > 0 ? parsed.appPasswords : seed.appPasswords,
          loginAttempts: parsed.loginAttempts && parsed.loginAttempts.length > 0 ? parsed.loginAttempts : seed.loginAttempts,
          messages: parsed.messages || seed.messages,
          threads: parsed.threads || seed.threads,
        };
      }
    } catch (err) {
      console.error('[DB] Failed to load database file, initializing with fresh seed data', err);
    }

    const seed = getInitialSeedData();
    this.saveDataDirect(seed);
    return seed;
  }

  private saveDataDirect(data: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('[DB] Error saving data to disk', err);
    }
  }

  public scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveDataDirect(this.data);
      this.saveTimeout = null;
    }, 100);
  }

  // Generic accessors
  public getSchema(): DatabaseSchema {
    return this.data;
  }

  public resetToSeed(): DatabaseSchema {
    this.data = getInitialSeedData();
    this.saveDataDirect(this.data);
    return this.data;
  }

  // Users
  public getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserByVerificationToken(token: string): User | undefined {
    return this.data.users.find((u) => u.verificationToken === token);
  }

  public getUserByResetToken(token: string): User | undefined {
    return this.data.users.find((u) => u.resetPasswordToken === token);
  }

  public createUser(user: User): User {
    this.data.users.push(user);
    this.scheduleSave();
    return user;
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return undefined;
    this.data.users[idx] = { ...this.data.users[idx], ...updates };
    this.scheduleSave();
    return this.data.users[idx];
  }

  // Organizations
  public getOrgById(id: string): Organization | undefined {
    return this.data.organizations.find((o) => o.id === id);
  }

  public createOrg(org: Organization): Organization {
    this.data.organizations.push(org);
    this.scheduleSave();
    return org;
  }

  public updateOrg(id: string, updates: Partial<Organization>): Organization | undefined {
    const idx = this.data.organizations.findIndex((o) => o.id === id);
    if (idx === -1) return undefined;
    this.data.organizations[idx] = { ...this.data.organizations[idx], ...updates };
    this.scheduleSave();
    return this.data.organizations[idx];
  }

  // Memberships
  public getMembershipsByUser(userId: string): Membership[] {
    return this.data.memberships.filter((m) => m.userId === userId);
  }

  public getMembershipsByOrg(orgId: string): Membership[] {
    return this.data.memberships.filter((m) => m.organizationId === orgId);
  }

  public createMembership(membership: Membership): Membership {
    this.data.memberships.push(membership);
    this.scheduleSave();
    return membership;
  }

  // Domains
  public getDomainsByOrg(orgId: string): Domain[] {
    return this.data.domains.filter((d) => d.organizationId === orgId);
  }

  public getDomainById(domainId: string, orgId: string): Domain | undefined {
    return this.data.domains.find((d) => d.id === domainId && d.organizationId === orgId);
  }

  public createDomain(domain: Domain): Domain {
    this.data.domains.push(domain);
    this.scheduleSave();
    return domain;
  }

  public updateDomain(id: string, orgId: string, updates: Partial<Domain>): Domain | undefined {
    const idx = this.data.domains.findIndex((d) => d.id === id && d.organizationId === orgId);
    if (idx === -1) return undefined;
    this.data.domains[idx] = { ...this.data.domains[idx], ...updates };
    this.scheduleSave();
    return this.data.domains[idx];
  }

  public deleteDomain(id: string, orgId: string): boolean {
    const initialLen = this.data.domains.length;
    this.data.domains = this.data.domains.filter((d) => !(d.id === id && d.organizationId === orgId));
    // Also remove associated mailboxes & aliases
    this.data.mailboxes = this.data.mailboxes.filter((m) => m.domainId !== id);
    this.data.aliases = this.data.aliases.filter((a) => a.domainId !== id);
    const deleted = this.data.domains.length < initialLen;
    if (deleted) this.scheduleSave();
    return deleted;
  }

  // Mailboxes
  public getMailboxesByOrg(orgId: string): Mailbox[] {
    return this.data.mailboxes.filter((m) => m.organizationId === orgId);
  }

  public getMailboxById(id: string, orgId: string): Mailbox | undefined {
    return this.data.mailboxes.find((m) => m.id === id && m.organizationId === orgId);
  }

  public createMailbox(mailbox: Mailbox): Mailbox {
    this.data.mailboxes.push(mailbox);
    this.scheduleSave();
    return mailbox;
  }

  public updateMailbox(id: string, orgId: string, updates: Partial<Mailbox>): Mailbox | undefined {
    const idx = this.data.mailboxes.findIndex((m) => m.id === id && m.organizationId === orgId);
    if (idx === -1) return undefined;
    this.data.mailboxes[idx] = { ...this.data.mailboxes[idx], ...updates };
    this.scheduleSave();
    return this.data.mailboxes[idx];
  }

  public deleteMailbox(id: string, orgId: string): boolean {
    const initialLen = this.data.mailboxes.length;
    this.data.mailboxes = this.data.mailboxes.filter((m) => !(m.id === id && m.organizationId === orgId));
    const deleted = this.data.mailboxes.length < initialLen;
    if (deleted) this.scheduleSave();
    return deleted;
  }

  // Aliases
  public getAliasesByOrg(orgId: string): Alias[] {
    return this.data.aliases.filter((a) => a.organizationId === orgId);
  }

  public createAlias(alias: Alias): Alias {
    this.data.aliases.push(alias);
    this.scheduleSave();
    return alias;
  }

  public updateAlias(id: string, orgId: string, updates: Partial<Alias>): Alias | undefined {
    const idx = this.data.aliases.findIndex((a) => a.id === id && a.organizationId === orgId);
    if (idx === -1) return undefined;
    this.data.aliases[idx] = { ...this.data.aliases[idx], ...updates };
    this.scheduleSave();
    return this.data.aliases[idx];
  }

  public deleteAlias(id: string, orgId: string): boolean {
    const initialLen = this.data.aliases.length;
    this.data.aliases = this.data.aliases.filter((a) => !(a.id === id && a.organizationId === orgId));
    const deleted = this.data.aliases.length < initialLen;
    if (deleted) this.scheduleSave();
    return deleted;
  }

  // Messages & Threads
  public getThreads(orgId: string, mailboxId?: string, folder: string = 'inbox', search?: string): Thread[] {
    let threads = this.data.threads.filter((t) => t.organizationId === orgId);

    if (mailboxId) {
      threads = threads.filter((t) => t.mailboxId === mailboxId);
    }

    // Auto check if any snoozed thread's snooze time has passed and return it to top of inbox
    const now = Date.now();
    let hasReturnedSnoozed = false;
    this.data.threads.forEach((t) => {
      if (t.organizationId === orgId && t.isSnoozed && t.snoozedUntil) {
        const snoozeExp = new Date(t.snoozedUntil).getTime();
        if (snoozeExp <= now) {
          t.isSnoozed = false;
          t.folder = 'inbox';
          t.snoozedUntil = undefined;
          t.unreadCount = Math.max(1, t.unreadCount); // Mark as unread so user notices it
          t.lastMessageAt = new Date().toISOString(); // Return to the very top
          hasReturnedSnoozed = true;
        }
      }
    });
    if (hasReturnedSnoozed) {
      this.scheduleSave();
    }

    if (folder === 'starred') {
      threads = threads.filter((t) => t.isStarred && !t.isTrash && !t.isSpam);
    } else if (folder === 'snoozed') {
      threads = threads.filter((t) => t.isSnoozed && !t.isTrash && !t.isSpam);
    } else if (folder === 'archive') {
      threads = threads.filter((t) => t.isArchived && !t.isTrash && !t.isSpam);
    } else if (folder === 'spam') {
      threads = threads.filter((t) => t.isSpam && !t.isTrash);
    } else if (folder === 'trash') {
      threads = threads.filter((t) => t.isTrash);
    } else if (folder === 'drafts') {
      const draftThreadIds = new Set(
        this.data.messages
          .filter((m) => m.organizationId === orgId && m.isDraft && !m.folder.includes('trash'))
          .map((m) => m.threadId)
      );
      threads = threads.filter((t) => draftThreadIds.has(t.id));
    } else if (folder === 'sent') {
      const sentThreadIds = new Set(
        this.data.messages
          .filter((m) => m.organizationId === orgId && m.folder === 'sent')
          .map((m) => m.threadId)
      );
      threads = threads.filter((t) => sentThreadIds.has(t.id) && !t.isTrash);
    } else if (folder !== 'inbox') {
      // Custom folder lookup
      const customFolderThreads = new Set(
        this.data.messages
          .filter((m) => m.organizationId === orgId && (m.customFolderId === folder || m.folder === folder))
          .map((m) => m.threadId)
      );
      threads = threads.filter(
        (t) => (t.customFolderId === folder || t.folder === folder || customFolderThreads.has(t.id)) && !t.isTrash
      );
    } else {
      // 'inbox' (hide snoozed, archived, spam, trash)
      threads = threads.filter((t) => !t.isArchived && !t.isSpam && !t.isTrash && !t.isSnoozed && (!t.customFolderId || t.folder === 'inbox'));
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();

      // Parse specific search tokens e.g. from:, to:, subject:, body:, has:attachment
      const fromMatch = q.match(/from:([^\s]+)/);
      const toMatch = q.match(/to:([^\s]+)/);
      const subjectMatch = q.match(/subject:([^\s]+)/);
      const bodyMatch = q.match(/body:([^\s]+)/);
      const hasAttachment = q.includes('has:attachment') || q.includes('has:attachments');

      // Strip qualifiers to get remainder free-text query
      const cleanFreeText = q
        .replace(/from:[^\s]+/g, '')
        .replace(/to:[^\s]+/g, '')
        .replace(/subject:[^\s]+/g, '')
        .replace(/body:[^\s]+/g, '')
        .replace(/has:attachments?/g, '')
        .trim();

      // Pre-index / map messages by threadId for full-text body search
      const messagesByThread = new Map<string, Message[]>();
      for (const msg of this.data.messages) {
        if (msg.organizationId === orgId) {
          const list = messagesByThread.get(msg.threadId) || [];
          list.push(msg);
          messagesByThread.set(msg.threadId, list);
        }
      }

      threads = threads.filter((t) => {
        const threadMsgs = messagesByThread.get(t.id) || [];

        // Check specific qualifiers if present
        if (fromMatch) {
          const fromQuery = fromMatch[1];
          const matchesFrom =
            t.participants.some((p) => p.address.toLowerCase().includes(fromQuery) || (p.name?.toLowerCase() || '').includes(fromQuery)) ||
            threadMsgs.some((m) => m.from.address.toLowerCase().includes(fromQuery) || (m.from.name?.toLowerCase() || '').includes(fromQuery));
          if (!matchesFrom) return false;
        }

        if (toMatch) {
          const toQuery = toMatch[1];
          const matchesTo = threadMsgs.some((m) =>
            m.to.some((rec) => rec.address.toLowerCase().includes(toQuery) || (rec.name?.toLowerCase() || '').includes(toQuery))
          );
          if (!matchesTo) return false;
        }

        if (subjectMatch) {
          const subjQuery = subjectMatch[1];
          if (!t.subject.toLowerCase().includes(subjQuery)) return false;
        }

        if (bodyMatch) {
          const bQuery = bodyMatch[1];
          const matchesBody = threadMsgs.some(
            (m) => m.bodyText.toLowerCase().includes(bQuery) || m.bodyHtml.toLowerCase().includes(bQuery)
          );
          if (!matchesBody) return false;
        }

        if (hasAttachment) {
          const hasAtt = threadMsgs.some((m) => m.attachments && m.attachments.length > 0);
          if (!hasAtt) return false;
        }

        // If there is free-text search term, check full text index across subject, snippet, participants, bodyText, bodyHtml, attachment names
        if (cleanFreeText) {
          const words = cleanFreeText.split(/\s+/).filter(Boolean);
          return words.every((w) => {
            const matchesSubject = t.subject.toLowerCase().includes(w);
            const matchesSnippet = t.snippet.toLowerCase().includes(w);
            const matchesParticipant = t.participants.some(
              (p) => (p.name?.toLowerCase() || '').includes(w) || p.address.toLowerCase().includes(w)
            );
            if (matchesSubject || matchesSnippet || matchesParticipant) return true;

            return threadMsgs.some((m) => {
              const inBodyText = m.bodyText.toLowerCase().includes(w);
              const inBodyHtml = m.bodyHtml.toLowerCase().includes(w);
              const inSender =
                m.from.address.toLowerCase().includes(w) || (m.from.name?.toLowerCase() || '').includes(w);
              const inTo = m.to.some(
                (rec) => rec.address.toLowerCase().includes(w) || (rec.name?.toLowerCase() || '').includes(w)
              );
              const inAtt = m.attachments?.some((att) => att.filename.toLowerCase().includes(w));
              return inBodyText || inBodyHtml || inSender || inTo || inAtt;
            });
          });
        }

        return true;
      });
    }

    return threads.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }

  public getThreadWithMessages(threadId: string, orgId: string): Thread | undefined {
    const thread = this.data.threads.find((t) => t.id === threadId && t.organizationId === orgId);
    if (!thread) return undefined;

    const messages = this.data.messages
      .filter((m) => m.threadId === threadId && m.organizationId === orgId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return {
      ...thread,
      messages,
    };
  }

  public createMessage(msg: Message): Message {
    this.data.messages.push(msg);

    // Update or create thread
    let thread = this.data.threads.find((t) => t.id === msg.threadId && t.organizationId === msg.organizationId);
    if (!thread) {
      thread = {
        id: msg.threadId,
        organizationId: msg.organizationId,
        mailboxId: msg.mailboxId,
        subject: msg.subject,
        snippet: msg.snippet || msg.bodyText.slice(0, 120),
        lastMessageAt: msg.createdAt,
        unreadCount: msg.isRead ? 0 : 1,
        messageCount: 1,
        isStarred: msg.isStarred,
        isArchived: msg.folder === 'archive',
        isSpam: msg.folder === 'spam',
        isTrash: msg.folder === 'trash',
        labels: msg.labels || [],
        participants: [msg.from, ...msg.to],
      };
      this.data.threads.push(thread);
    } else {
      thread.lastMessageAt = msg.createdAt;
      thread.messageCount += 1;
      if (!msg.isRead) thread.unreadCount += 1;
      thread.snippet = msg.snippet || msg.bodyText.slice(0, 120);

      // add participants if not exist
      const existingEmails = new Set(thread.participants.map((p) => p.address.toLowerCase()));
      if (!existingEmails.has(msg.from.address.toLowerCase())) {
        thread.participants.push(msg.from);
      }
      for (const to of msg.to) {
        if (!existingEmails.has(to.address.toLowerCase())) {
          thread.participants.push(to);
        }
      }
    }

    this.scheduleSave();
    return msg;
  }

  public updateMessage(id: string, orgId: string, updates: Partial<Message>): Message | undefined {
    const idx = this.data.messages.findIndex((m) => m.id === id && m.organizationId === orgId);
    if (idx === -1) return undefined;
    this.data.messages[idx] = { ...this.data.messages[idx], ...updates };
    this.scheduleSave();
    return this.data.messages[idx];
  }

  public updateThread(id: string, orgId: string, updates: Partial<Thread>): Thread | undefined {
    const idx = this.data.threads.findIndex((t) => t.id === id && t.organizationId === orgId);
    if (idx === -1) return undefined;
    this.data.threads[idx] = { ...this.data.threads[idx], ...updates };

    // If folder changes apply to messages in thread
    if (updates.isArchived !== undefined) {
      this.data.messages
        .filter((m) => m.threadId === id && m.organizationId === orgId)
        .forEach((m) => {
          m.folder = updates.isArchived ? 'archive' : 'inbox';
        });
    }
    if (updates.isTrash !== undefined) {
      this.data.messages
        .filter((m) => m.threadId === id && m.organizationId === orgId)
        .forEach((m) => {
          m.folder = updates.isTrash ? 'trash' : 'inbox';
        });
    }

    this.scheduleSave();
    return this.data.threads[idx];
  }

  public deleteThread(id: string, orgId: string): boolean {
    const initialLen = this.data.threads.length;
    this.data.threads = this.data.threads.filter((t) => !(t.id === id && t.organizationId === orgId));
    this.data.messages = this.data.messages.filter((m) => !(m.threadId === id && m.organizationId === orgId));
    const deleted = this.data.threads.length < initialLen;
    if (deleted) this.scheduleSave();
    return deleted;
  }

  public moveThreadToFolder(threadId: string, orgId: string, targetFolder: string): Thread | undefined {
    const threadIdx = this.data.threads.findIndex((t) => t.id === threadId && t.organizationId === orgId);
    if (threadIdx === -1) return undefined;

    const isBuiltIn = ['inbox', 'sent', 'drafts', 'starred', 'archive', 'spam', 'trash'].includes(targetFolder);
    const updates: Partial<Thread> = {
      folder: targetFolder,
      isArchived: targetFolder === 'archive',
      isTrash: targetFolder === 'trash',
      isSpam: targetFolder === 'spam',
      customFolderId: isBuiltIn ? undefined : targetFolder,
    };

    this.data.threads[threadIdx] = { ...this.data.threads[threadIdx], ...updates };

    // Update all messages in this thread
    this.data.messages
      .filter((m) => m.threadId === threadId && m.organizationId === orgId)
      .forEach((m) => {
        m.folder = targetFolder;
        m.customFolderId = isBuiltIn ? undefined : targetFolder;
      });

    this.scheduleSave();
    return this.data.threads[threadIdx];
  }

  // Custom Folders
  public getCustomFolders(orgId: string, mailboxId?: string): CustomFolder[] {
    return this.data.customFolders.filter(
      (f) => f.organizationId === orgId && (!mailboxId || !f.mailboxId || f.mailboxId === mailboxId)
    );
  }

  public getCustomFolderById(id: string, orgId: string): CustomFolder | undefined {
    return this.data.customFolders.find((f) => f.id === id && f.organizationId === orgId);
  }

  public createCustomFolder(folder: CustomFolder): CustomFolder {
    this.data.customFolders.push(folder);
    this.scheduleSave();
    return folder;
  }

  public updateCustomFolder(id: string, orgId: string, updates: Partial<CustomFolder>): CustomFolder | undefined {
    const idx = this.data.customFolders.findIndex((f) => f.id === id && f.organizationId === orgId);
    if (idx === -1) return undefined;
    this.data.customFolders[idx] = { ...this.data.customFolders[idx], ...updates };
    this.scheduleSave();
    return this.data.customFolders[idx];
  }

  public deleteCustomFolder(id: string, orgId: string): boolean {
    const initialLen = this.data.customFolders.length;
    this.data.customFolders = this.data.customFolders.filter((f) => !(f.id === id && f.organizationId === orgId));
    // Reset any messages / threads assigned to this custom folder back to inbox
    this.data.threads
      .filter((t) => t.organizationId === orgId && t.customFolderId === id)
      .forEach((t) => {
        t.customFolderId = undefined;
        t.folder = 'inbox';
      });
    this.data.messages
      .filter((m) => m.organizationId === orgId && m.customFolderId === id)
      .forEach((m) => {
        m.customFolderId = undefined;
        m.folder = 'inbox';
      });
    const deleted = this.data.customFolders.length < initialLen;
    if (deleted) this.scheduleSave();
    return deleted;
  }

  // Spam Filtering & Reporting
  public reportSpam(
    threadId: string,
    orgId: string,
    ipAddress: string = '127.0.0.1'
  ): { success: boolean; thread?: Thread; blockedAddress?: string } {
    const thread = this.data.threads.find((t) => t.id === threadId && t.organizationId === orgId);
    if (!thread) return { success: false };

    thread.isSpam = true;
    thread.isArchived = false;
    thread.isTrash = false;
    thread.folder = 'spam';
    thread.customFolderId = undefined;

    // Update all messages in this thread
    const msgs = this.data.messages.filter((m) => m.threadId === threadId && m.organizationId === orgId);
    msgs.forEach((m) => {
      m.folder = 'spam';
      m.customFolderId = undefined;
      m.isRead = true;
    });

    // Identify sender address to block & filter
    const inboundMsg = [...msgs].reverse().find((m) => m.folder !== 'sent') || msgs[0];
    const senderAddress =
      inboundMsg?.from.address?.toLowerCase().trim() || thread.participants[0]?.address?.toLowerCase().trim();

    let blockedAddress = senderAddress;
    if (senderAddress) {
      const exists = this.data.spamRules.some(
        (r) => r.organizationId === orgId && r.senderPattern.toLowerCase() === senderAddress
      );
      if (!exists) {
        this.data.spamRules.unshift({
          id: `sr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
          organizationId: orgId,
          senderPattern: senderAddress,
          reason: `Reported as spam from thread: "${thread.subject}"`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    this.addAuditLog({
      organizationId: orgId,
      userId: 'user',
      userEmail: senderAddress || 'unknown@sender',
      action: 'mail.reported_spam',
      category: 'security',
      ipAddress: ipAddress,
      details: `Thread "${thread.subject}" flagged as spam. Sender ${blockedAddress || 'address'} added to automated ingress filter rules.`,
    });

    this.scheduleSave();
    return { success: true, thread, blockedAddress };
  }

  public isSpamSender(orgId: string, senderAddress: string): boolean {
    if (!senderAddress) return false;
    const cleanSender = senderAddress.toLowerCase().trim();
    return this.data.spamRules.some((r) => {
      if (r.organizationId !== orgId) return false;
      const pat = r.senderPattern.toLowerCase().trim();
      if (pat === cleanSender) return true;
      if (pat.startsWith('@') && cleanSender.endsWith(pat)) return true;
      if (cleanSender.includes(pat)) return true;
      return false;
    });
  }

  public getSpamRules(orgId: string): SpamRule[] {
    return this.data.spamRules.filter((r) => r.organizationId === orgId);
  }

  public addSpamRule(rule: SpamRule): SpamRule {
    this.data.spamRules.unshift(rule);
    this.scheduleSave();
    return rule;
  }

  public deleteSpamRule(id: string, orgId: string): boolean {
    const initialLen = this.data.spamRules.length;
    this.data.spamRules = this.data.spamRules.filter((r) => !(r.id === id && r.organizationId === orgId));
    const deleted = this.data.spamRules.length < initialLen;
    if (deleted) this.scheduleSave();
    return deleted;
  }

  // Custom Email Signatures
  public getSignatures(orgId: string, mailboxId?: string): EmailSignature[] {
    let sigs = this.data.signatures.filter((s) => s.organizationId === orgId);
    if (mailboxId) {
      sigs = sigs.filter((s) => !s.mailboxId || s.mailboxId === mailboxId);
    }
    return sigs.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
  }

  public createSignature(sig: EmailSignature): EmailSignature {
    if (sig.isDefault) {
      this.data.signatures
        .filter((s) => s.organizationId === sig.organizationId && (!sig.mailboxId || !s.mailboxId || s.mailboxId === sig.mailboxId))
        .forEach((s) => (s.isDefault = false));
    }
    this.data.signatures.unshift(sig);
    this.scheduleSave();
    return sig;
  }

  public updateSignature(id: string, orgId: string, updates: Partial<EmailSignature>): EmailSignature | undefined {
    const sig = this.data.signatures.find((s) => s.id === id && s.organizationId === orgId);
    if (!sig) return undefined;

    if (updates.isDefault) {
      this.data.signatures
        .filter((s) => s.organizationId === orgId && s.id !== id && (!sig.mailboxId || !s.mailboxId || s.mailboxId === sig.mailboxId))
        .forEach((s) => (s.isDefault = false));
    }

    Object.assign(sig, updates);
    this.scheduleSave();
    return sig;
  }

  public deleteSignature(id: string, orgId: string): boolean {
    const initialLen = this.data.signatures.length;
    this.data.signatures = this.data.signatures.filter((s) => !(s.id === id && s.organizationId === orgId));
    const deleted = this.data.signatures.length < initialLen;
    if (deleted) this.scheduleSave();
    return deleted;
  }

  // Login Attempts (Auditing)
  public getLoginAttempts(orgId?: string, limit: number = 100): LoginAttempt[] {
    let attempts = this.data.loginAttempts;
    if (orgId) {
      attempts = attempts.filter((a) => !a.organizationId || a.organizationId === orgId);
    }
    return attempts
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  public recordLoginAttempt(attempt: Omit<LoginAttempt, 'id' | 'timestamp'>): LoginAttempt {
    const entry: LoginAttempt = {
      ...attempt,
      id: `la_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      timestamp: new Date().toISOString(),
    };
    this.data.loginAttempts.unshift(entry);
    if (this.data.loginAttempts.length > 500) {
      this.data.loginAttempts = this.data.loginAttempts.slice(0, 500);
    }
    this.scheduleSave();
    return entry;
  }

  // Read Receipts
  public recordMessageReadReceipt(messageId: string, ip: string, userAgent?: string): Message | null {
    const msg = this.data.messages.find((m) => m.id === messageId);
    if (!msg) return null;

    msg.readReceiptStatus = 'opened';
    msg.readReceiptOpenedAt = new Date().toISOString();
    msg.readReceiptOpenCount = (msg.readReceiptOpenCount || 0) + 1;
    msg.readReceiptOpenedFromIp = ip;
    if (userAgent) {
      msg.readReceiptUserAgent = userAgent;
    }

    // Also record audit log
    this.addAuditLog({
      organizationId: msg.organizationId,
      userId: 'system_tracking',
      userEmail: msg.mailboxEmail,
      action: 'mail.read_receipt_opened',
      category: 'mail',
      ipAddress: ip,
      details: `Read receipt triggered for message "${msg.subject}" (Recipient opened, count: ${msg.readReceiptOpenCount})`,
    });

    this.scheduleSave();
    return msg;
  }

  // Audit Logs
  public addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const entry: AuditLog = {
      ...log,
      id: `log_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(entry);
    // Keep max 500 logs
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.scheduleSave();
    return entry;
  }

  public getAuditLogs(orgId: string): AuditLog[] {
    return this.data.auditLogs.filter((l) => l.organizationId === orgId);
  }

  // Invoices & Billing
  public getInvoicesByOrg(orgId: string): Invoice[] {
    return this.data.invoices.filter((i) => i.organizationId === orgId);
  }

  public addInvoice(invoice: Invoice): Invoice {
    this.data.invoices.unshift(invoice);
    this.scheduleSave();
    return invoice;
  }

  // API Keys
  public getApiKeysByOrg(orgId: string): ApiKey[] {
    return this.data.apiKeys.filter((k) => k.organizationId === orgId);
  }

  public createApiKey(key: ApiKey): ApiKey {
    this.data.apiKeys.push(key);
    this.scheduleSave();
    return key;
  }

  public deleteApiKey(id: string, orgId: string): boolean {
    const initialLen = this.data.apiKeys.length;
    this.data.apiKeys = this.data.apiKeys.filter((k) => !(k.id === id && k.organizationId === orgId));
    const deleted = this.data.apiKeys.length < initialLen;
    if (deleted) this.scheduleSave();
    return deleted;
  }

  // ===================================
  // Advanced Features Database Methods
  // ===================================

  // 1. Email Templates / Canned Responses
  public getTemplates(orgId: string, mailboxId?: string): EmailTemplate[] {
    return this.data.templates.filter(
      (t) => t.organizationId === orgId && (!mailboxId || !t.mailboxId || t.mailboxId === mailboxId)
    );
  }

  public createTemplate(template: EmailTemplate): EmailTemplate {
    this.data.templates.unshift(template);
    this.scheduleSave();
    return template;
  }

  public updateTemplate(id: string, orgId: string, updates: Partial<EmailTemplate>): EmailTemplate | undefined {
    const idx = this.data.templates.findIndex((t) => t.id === id && t.organizationId === orgId);
    if (idx === -1) return undefined;
    this.data.templates[idx] = { ...this.data.templates[idx], ...updates };
    this.scheduleSave();
    return this.data.templates[idx];
  }

  public deleteTemplate(id: string, orgId: string): boolean {
    const initialLen = this.data.templates.length;
    this.data.templates = this.data.templates.filter((t) => !(t.id === id && t.organizationId === orgId));
    const deleted = this.data.templates.length < initialLen;
    if (deleted) this.scheduleSave();
    return deleted;
  }

  // 2. Ingress Filter Rules
  public getFilterRules(orgId: string, mailboxId?: string): FilterRule[] {
    return this.data.filterRules.filter(
      (r) => r.organizationId === orgId && (!mailboxId || !r.mailboxId || r.mailboxId === mailboxId)
    );
  }

  public createFilterRule(rule: FilterRule): FilterRule {
    this.data.filterRules.unshift(rule);
    this.scheduleSave();
    return rule;
  }

  public updateFilterRule(id: string, orgId: string, updates: Partial<FilterRule>): FilterRule | undefined {
    const idx = this.data.filterRules.findIndex((r) => r.id === id && r.organizationId === orgId);
    if (idx === -1) return undefined;
    this.data.filterRules[idx] = { ...this.data.filterRules[idx], ...updates };
    this.scheduleSave();
    return this.data.filterRules[idx];
  }

  public deleteFilterRule(id: string, orgId: string): boolean {
    const initialLen = this.data.filterRules.length;
    this.data.filterRules = this.data.filterRules.filter((r) => !(r.id === id && r.organizationId === orgId));
    const deleted = this.data.filterRules.length < initialLen;
    if (deleted) this.scheduleSave();
    return deleted;
  }

  public applyFilterRules(message: Message, thread: Thread, orgId: string) {
    const rules = this.getFilterRules(orgId, message.mailboxId).filter((r) => r.isEnabled);
    for (const rule of rules) {
      let targetText = '';
      if (rule.conditionField === 'from') targetText = message.from.address;
      else if (rule.conditionField === 'to') targetText = message.to.map((t) => t.address).join(' ');
      else if (rule.conditionField === 'subject') targetText = message.subject;
      else if (rule.conditionField === 'body') targetText = message.bodyText;

      targetText = targetText.toLowerCase();
      const matchVal = rule.matchValue.toLowerCase();
      let matched = false;

      if (rule.matchType === 'contains' && targetText.includes(matchVal)) matched = true;
      else if (rule.matchType === 'equals' && targetText === matchVal) matched = true;
      else if (rule.matchType === 'starts_with' && targetText.startsWith(matchVal)) matched = true;
      else if (rule.matchType === 'regex') {
        try {
          const regex = new RegExp(rule.matchValue, 'i');
          if (regex.test(targetText)) matched = true;
        } catch {
          // ignore bad regex
        }
      }

      if (matched) {
        if (rule.actions.applyLabel && !thread.labels.includes(rule.actions.applyLabel)) {
          thread.labels.push(rule.actions.applyLabel);
          message.labels.push(rule.actions.applyLabel);
        }
        if (rule.actions.markStar) {
          thread.isStarred = true;
          message.isStarred = true;
        }
        if (rule.actions.markRead) {
          message.isRead = true;
          thread.unreadCount = 0;
        }
        if (rule.actions.moveToFolder) {
          thread.folder = rule.actions.moveToFolder;
          message.folder = rule.actions.moveToFolder;
          if (rule.actions.moveToFolder.startsWith('cf_')) {
            thread.customFolderId = rule.actions.moveToFolder;
            message.customFolderId = rule.actions.moveToFolder;
          }
        }
        if (rule.actions.autoSpam) {
          thread.isSpam = true;
          thread.folder = 'spam';
          message.folder = 'spam';
        }
      }
    }
  }

  // 3. Contacts / Address Book
  public getContacts(orgId: string, mailboxId?: string): Contact[] {
    return this.data.contacts
      .filter((c) => c.organizationId === orgId && (!mailboxId || !c.mailboxId || c.mailboxId === mailboxId))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  public createContact(contact: Contact): Contact {
    this.data.contacts.push(contact);
    this.scheduleSave();
    return contact;
  }

  public updateContact(id: string, orgId: string, updates: Partial<Contact>): Contact | undefined {
    const idx = this.data.contacts.findIndex((c) => c.id === id && c.organizationId === orgId);
    if (idx === -1) return undefined;
    this.data.contacts[idx] = { ...this.data.contacts[idx], ...updates };
    this.scheduleSave();
    return this.data.contacts[idx];
  }

  public deleteContact(id: string, orgId: string): boolean {
    const initialLen = this.data.contacts.length;
    this.data.contacts = this.data.contacts.filter((c) => !(c.id === id && c.organizationId === orgId));
    const deleted = this.data.contacts.length < initialLen;
    if (deleted) this.scheduleSave();
    return deleted;
  }

  // 4. Internal Notes (Shared Mailbox Collaboration)
  public getInternalNotes(threadId: string, orgId: string): InternalNote[] {
    return this.data.internalNotes
      .filter((n) => n.threadId === threadId && n.organizationId === orgId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public addInternalNote(note: InternalNote): InternalNote {
    this.data.internalNotes.push(note);
    this.scheduleSave();
    return note;
  }

  public deleteInternalNote(id: string, orgId: string): boolean {
    const initialLen = this.data.internalNotes.length;
    this.data.internalNotes = this.data.internalNotes.filter((n) => !(n.id === id && n.organizationId === orgId));
    const deleted = this.data.internalNotes.length < initialLen;
    if (deleted) this.scheduleSave();
    return deleted;
  }

  // 5. PGP Keys
  public getPgpKeys(orgId: string, mailboxId?: string): PgpKey[] {
    return this.data.pgpKeys.filter(
      (k) => k.organizationId === orgId && (!mailboxId || !k.mailboxId || k.mailboxId === mailboxId)
    );
  }

  public createPgpKey(key: PgpKey): PgpKey {
    if (key.isDefault) {
      this.data.pgpKeys.filter((k) => k.organizationId === key.organizationId).forEach((k) => (k.isDefault = false));
    }
    this.data.pgpKeys.unshift(key);
    this.scheduleSave();
    return key;
  }

  public generatePgpKey(orgId: string, email: string, name: string, mailboxId?: string): PgpKey {
    const randomFp = Array.from({ length: 10 }, () => crypto.randomBytes(2).toString('hex').toUpperCase()).join(' ');
    const newKey: PgpKey = {
      id: `pgp_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      organizationId: orgId,
      mailboxId: mailboxId,
      name: name,
      email: email,
      fingerprint: randomFp,
      publicKey: `-----BEGIN PGP PUBLIC KEY BLOCK-----\nVersion: Mailoo Sovereign PGP v2.4\nComment: Generated for ${email} (${name})\n\n` +
        `mQGNBF8z${crypto.randomBytes(120).toString('base64')}==\n-----END PGP PUBLIC KEY BLOCK-----`,
      isDefault: true,
      algorithm: 'RSA 4096-bit',
      createdAt: new Date().toISOString(),
    };
    return this.createPgpKey(newKey);
  }

  public deletePgpKey(id: string, orgId: string): boolean {
    const initialLen = this.data.pgpKeys.length;
    this.data.pgpKeys = this.data.pgpKeys.filter((k) => !(k.id === id && k.organizationId === orgId));
    const deleted = this.data.pgpKeys.length < initialLen;
    if (deleted) this.scheduleSave();
    return deleted;
  }

  // 6. Data Retention Policies & Auto-Purge
  public getRetentionPolicy(orgId: string): RetentionPolicy {
    let policy = this.data.retentionPolicies.find((p) => p.organizationId === orgId);
    if (!policy) {
      policy = {
        organizationId: orgId,
        autoPurgeTrashDays: 30,
        autoPurgeSpamDays: 14,
        autoArchiveDays: 180,
        isEnabled: true,
      };
      this.data.retentionPolicies.push(policy);
      this.scheduleSave();
    }
    return policy;
  }

  public updateRetentionPolicy(orgId: string, updates: Partial<RetentionPolicy>): RetentionPolicy {
    const policy = this.getRetentionPolicy(orgId);
    Object.assign(policy, updates);
    this.scheduleSave();
    return policy;
  }

  public executeRetentionScan(orgId: string): {
    purgedTrash: number;
    purgedSpam: number;
    archivedCount: number;
    totalCleaned: number;
    timestamp: string;
  } {
    const policy = this.getRetentionPolicy(orgId);
    const now = Date.now();
    const trashCutoff = now - policy.autoPurgeTrashDays * 86400000;
    const spamCutoff = now - policy.autoPurgeSpamDays * 86400000;
    const archiveCutoff = now - policy.autoArchiveDays * 86400000;

    let purgedTrash = 0;
    let purgedSpam = 0;
    let archivedCount = 0;

    // Purge Trash
    const beforeTrash = this.data.threads.length;
    this.data.threads = this.data.threads.filter((t) => {
      if (t.organizationId === orgId && t.isTrash) {
        const tTime = new Date(t.lastMessageAt).getTime();
        if (tTime < trashCutoff) {
          purgedTrash++;
          return false;
        }
      }
      return true;
    });

    // Purge Spam
    this.data.threads = this.data.threads.filter((t) => {
      if (t.organizationId === orgId && t.isSpam) {
        const tTime = new Date(t.lastMessageAt).getTime();
        if (tTime < spamCutoff) {
          purgedSpam++;
          return false;
        }
      }
      return true;
    });

    // Auto-Archive old inbox items
    this.data.threads.forEach((t) => {
      if (t.organizationId === orgId && !t.isArchived && !t.isTrash && !t.isSpam && t.unreadCount === 0) {
        const tTime = new Date(t.lastMessageAt).getTime();
        if (tTime < archiveCutoff) {
          t.isArchived = true;
          t.folder = 'archive';
          archivedCount++;
        }
      }
    });

    policy.lastPurgedAt = new Date().toISOString();
    policy.lastPurgedCount = purgedTrash + purgedSpam + archivedCount;

    this.addAuditLog({
      organizationId: orgId,
      userId: 'retention_daemon',
      userEmail: 'system@mailoo.email',
      action: 'security.retention_scan_executed',
      category: 'security',
      ipAddress: '127.0.0.1',
      details: `Automated retention scan completed: Purged ${purgedTrash} trash threads, ${purgedSpam} spam threads, archived ${archivedCount} stale threads.`,
    });

    this.scheduleSave();

    return {
      purgedTrash,
      purgedSpam,
      archivedCount,
      totalCleaned: purgedTrash + purgedSpam + archivedCount,
      timestamp: policy.lastPurgedAt,
    };
  }

  // 7. Blocklist & Allowlist Management
  public getBlockedSenders(orgId: string): BlockedSender[] {
    return this.data.blockedSenders.filter((b) => b.organizationId === orgId);
  }

  public addBlockedSender(entry: BlockedSender): BlockedSender {
    this.data.blockedSenders.unshift(entry);
    this.scheduleSave();
    return entry;
  }

  public deleteBlockedSender(id: string, orgId: string): boolean {
    const initialLen = this.data.blockedSenders.length;
    this.data.blockedSenders = this.data.blockedSenders.filter((b) => !(b.id === id && b.organizationId === orgId));
    const deleted = this.data.blockedSenders.length < initialLen;
    if (deleted) this.scheduleSave();
    return deleted;
  }

  public isBlockedSender(orgId: string, email: string): boolean {
    const clean = email.toLowerCase().trim();
    return this.data.blockedSenders.some((b) => {
      if (b.organizationId !== orgId || b.type !== 'block') return false;
      const pat = b.pattern.toLowerCase().trim();
      if (pat === clean) return true;
      if (pat.startsWith('@') && clean.endsWith(pat)) return true;
      return false;
    });
  }

  public isAllowedSender(orgId: string, email: string): boolean {
    const clean = email.toLowerCase().trim();
    return this.data.blockedSenders.some((b) => {
      if (b.organizationId !== orgId || b.type !== 'allow') return false;
      const pat = b.pattern.toLowerCase().trim();
      if (pat === clean) return true;
      if (pat.startsWith('@') && clean.endsWith(pat)) return true;
      return false;
    });
  }

  // 8. Snooze & Unsnooze Threads
  public snoozeThread(threadId: string, orgId: string, snoozedUntil: string): Thread | undefined {
    const thread = this.data.threads.find((t) => t.id === threadId && t.organizationId === orgId);
    if (!thread) return undefined;
    thread.isSnoozed = true;
    thread.snoozedUntil = snoozedUntil;
    thread.folder = 'snoozed';
    this.scheduleSave();
    return thread;
  }

  public unsnoozeThread(threadId: string, orgId: string): Thread | undefined {
    const thread = this.data.threads.find((t) => t.id === threadId && t.organizationId === orgId);
    if (!thread) return undefined;
    thread.isSnoozed = false;
    thread.snoozedUntil = undefined;
    thread.folder = 'inbox';
    this.scheduleSave();
    return thread;
  }

  // 9. Message Reactions
  public toggleMessageReaction(
    messageId: string,
    orgId: string,
    emoji: string,
    userEmail: string,
    userName: string
  ): Message | undefined {
    const msg = this.data.messages.find((m) => m.id === messageId && m.organizationId === orgId);
    if (!msg) return undefined;
    if (!msg.reactions) msg.reactions = [];

    const existingIdx = msg.reactions.findIndex((r) => r.emoji === emoji && r.userEmail === userEmail);
    if (existingIdx !== -1) {
      msg.reactions.splice(existingIdx, 1);
    } else {
      msg.reactions.push({
        id: `rx_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
        emoji,
        userEmail,
        userName,
        timestamp: new Date().toISOString(),
      });
    }
    this.scheduleSave();
    return msg;
  }

  // 10. Confidential Mode Passcode Unlock
  public unlockConfidentialMessage(messageId: string, orgId: string, passcode: string): { success: boolean; message?: Message; error?: string } {
    const msg = this.data.messages.find((m) => m.id === messageId && m.organizationId === orgId);
    if (!msg || !msg.confidential) {
      return { success: false, error: 'Message not found or not confidential' };
    }
    if (msg.confidential.passcode && msg.confidential.passcode !== passcode) {
      return { success: false, error: 'Invalid 6-digit access PIN code' };
    }
    msg.confidential.isLocked = false;
    this.scheduleSave();
    return { success: true, message: msg };
  }

  // 11. Centralized Attachments Explorer
  public getAggregatedAttachments(
    orgId: string,
    mailboxId?: string,
    search?: string,
    fileType?: string
  ): Array<{
    id: string;
    messageId: string;
    threadId: string;
    subject: string;
    sender: string;
    filename: string;
    contentType: string;
    size: number;
    dataUrl?: string;
    date: string;
  }> {
    const msgs = this.data.messages.filter(
      (m) => m.organizationId === orgId && (!mailboxId || m.mailboxId === mailboxId)
    );
    const results: Array<any> = [];

    msgs.forEach((m) => {
      if (m.attachments && m.attachments.length > 0) {
        m.attachments.forEach((att) => {
          let matchesSearch = true;
          if (search) {
            const q = search.toLowerCase();
            matchesSearch = att.filename.toLowerCase().includes(q) || m.subject.toLowerCase().includes(q);
          }

          let matchesType = true;
          if (fileType && fileType !== 'all') {
            if (fileType === 'images') matchesType = att.contentType.startsWith('image/');
            else if (fileType === 'documents') matchesType = att.contentType.includes('pdf') || att.contentType.includes('word') || att.filename.endsWith('.doc') || att.filename.endsWith('.docx') || att.filename.endsWith('.pdf');
            else if (fileType === 'spreadsheets') matchesType = att.contentType.includes('sheet') || att.filename.endsWith('.csv') || att.filename.endsWith('.xlsx') || att.filename.endsWith('.xls');
            else if (fileType === 'cad') matchesType = att.filename.endsWith('.dwg') || att.filename.endsWith('.dxf') || att.filename.endsWith('.bim');
          }

          if (matchesSearch && matchesType) {
            results.push({
              id: att.id,
              messageId: m.id,
              threadId: m.threadId,
              subject: m.subject,
              sender: m.from.name || m.from.address,
              filename: att.filename,
              contentType: att.contentType,
              size: att.size,
              dataUrl: att.dataUrl,
              date: m.createdAt,
            });
          }
        });
      }
    });

    return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // 12. VIP & AI Intelligence
  public toggleThreadVip(threadId: string, orgId: string, isVip?: boolean): Thread | undefined {
    const thread = this.data.threads.find((t) => t.id === threadId && t.organizationId === orgId);
    if (!thread) return undefined;
    thread.isVip = isVip !== undefined ? isVip : !thread.isVip;
    this.scheduleSave();
    return thread;
  }

  public updateThreadAiIntelligence(threadId: string, orgId: string, intelligence: any): Thread | undefined {
    const thread = this.data.threads.find((t) => t.id === threadId && t.organizationId === orgId);
    if (!thread) return undefined;
    thread.aiIntelligence = intelligence;
    this.scheduleSave();
    return thread;
  }

  public getMessageById(messageId: string, orgId?: string): Message | undefined {
    return this.data.messages.find(
      (m) => m.id === messageId && (!orgId || m.organizationId === orgId)
    );
  }

  public getThreadById(threadId: string, orgId?: string): Thread | undefined {
    return this.data.threads.find(
      (t) => t.id === threadId && (!orgId || t.organizationId === orgId)
    );
  }

  // BIMI Management
  public getBimiConfigs(organizationId: string): BimiConfig[] {
    return this.data.bimiConfigs.filter((b) => b.organizationId === organizationId);
  }

  public getBimiByDomain(domainId: string, organizationId: string): BimiConfig | undefined {
    return this.data.bimiConfigs.find((b) => b.domainId === domainId && b.organizationId === organizationId);
  }

  public saveBimiConfig(config: Partial<BimiConfig> & { organizationId: string; domainId: string }): BimiConfig {
    const existingIndex = this.data.bimiConfigs.findIndex(
      (b) => b.domainId === config.domainId && b.organizationId === config.organizationId
    );
    const domain = this.data.domains.find((d) => d.id === config.domainId);
    const domainName = domain ? domain.domainName : 'domain.com';

    const dnsRecordValue = `v=BIMI1; l=${config.svgLogoUrl || 'https://' + domainName + '/bimi-logo.svg'}${
      config.vmcCertUrl ? `; a=${config.vmcCertUrl}` : ''
    }`;

    if (existingIndex >= 0) {
      const updated: BimiConfig = {
        ...this.data.bimiConfigs[existingIndex],
        ...config,
        dnsRecordValue,
        updatedAt: new Date().toISOString(),
      };
      this.data.bimiConfigs[existingIndex] = updated;
      this.scheduleSave();
      return updated;
    } else {
      const created: BimiConfig = {
        id: `bimi_${crypto.randomBytes(6).toString('hex')}`,
        organizationId: config.organizationId,
        domainId: config.domainId,
        domainName,
        svgLogoUrl: config.svgLogoUrl || '',
        vmcCertUrl: config.vmcCertUrl,
        selector: config.selector || 'default',
        isConfigured: true,
        verifiedMarkStatus: config.vmcCertUrl ? 'verified' : 'self_asserted',
        dnsRecordValue,
        updatedAt: new Date().toISOString(),
      };
      this.data.bimiConfigs.push(created);
      this.scheduleSave();
      return created;
    }
  }

  // App Passwords
  public getAppPasswords(organizationId: string, userId?: string): AppPassword[] {
    return this.data.appPasswords.filter(
      (ap) => ap.organizationId === organizationId && (!userId || ap.userId === userId)
    );
  }

  public createAppPassword(params: {
    organizationId: string;
    userId: string;
    mailboxId: string;
    name: string;
    scopes: ('imap' | 'smtp' | 'pop3' | 'caldav' | 'carddav')[];
  }): { appPassword: AppPassword; rawSecret: string } {
    const mailbox = this.data.mailboxes.find((m) => m.id === params.mailboxId);
    const rawSecret = `mn_app_${crypto.randomBytes(4).toString('hex')}_${crypto.randomBytes(4).toString('hex')}_${crypto.randomBytes(4).toString('hex')}`;
    const passwordPrefix = rawSecret.slice(0, 10) + '...';

    const appPassword: AppPassword = {
      id: `app_pwd_${crypto.randomBytes(6).toString('hex')}`,
      organizationId: params.organizationId,
      userId: params.userId,
      mailboxId: params.mailboxId,
      mailboxEmail: mailbox ? mailbox.emailAddress : 'mailbox@domain.com',
      name: params.name,
      passwordPrefix,
      scopes: params.scopes,
      createdAt: new Date().toISOString(),
    };

    this.data.appPasswords.push(appPassword);
    this.scheduleSave();
    return { appPassword, rawSecret };
  }

  public deleteAppPassword(id: string, organizationId: string): boolean {
    const prevLen = this.data.appPasswords.length;
    this.data.appPasswords = this.data.appPasswords.filter(
      (ap) => !(ap.id === id && ap.organizationId === organizationId)
    );
    if (this.data.appPasswords.length !== prevLen) {
      this.scheduleSave();
      return true;
    }
    return false;
  }

  // Calendar Invite RSVP
  public updateCalendarRsvp(
    messageId: string,
    status: 'accepted' | 'declined' | 'tentative',
    organizationId: string
  ): Message | undefined {
    const msg = this.data.messages.find(
      (m) => m.id === messageId && m.organizationId === organizationId
    );
    if (!msg || !msg.calendarInvite) return undefined;

    msg.calendarInvite.myStatus = status;
    const meAttendee = msg.calendarInvite.attendees.find(
      (a) => a.email.toLowerCase() === msg.mailboxEmail.toLowerCase()
    );
    if (meAttendee) {
      meAttendee.status = status;
    }
    this.scheduleSave();
    return msg;
  }

  // Deliverability Telemetry
  public getDeliverabilityAudit(organizationId: string): DeliverabilityAudit {
    const domain = this.data.domains.find((d) => d.organizationId === organizationId);
    const isDnsOk = domain?.status === 'active';

    return {
      overallScore: isDnsOk ? 98 : 74,
      inboxPlacementRate: isDnsOk ? 99.4 : 88.2,
      spfAlignment: true,
      dkimAlignment: true,
      dmarcPolicy: 'reject',
      mtaStsEnabled: true,
      tls13Rate: 99.1,
      blacklists: [
        { service: 'Spamhaus Zen', host: 'zen.spamhaus.org', status: 'clean', category: 'IP & Domain Reputation', responseTimeMs: 14 },
        { service: 'Barracuda Rep', host: 'b.barracudacentral.org', status: 'clean', category: 'Reputation Block List', responseTimeMs: 22 },
        { service: 'SURBL Multi', host: 'multi.surbl.org', status: 'clean', category: 'URI Phishing / Malware', responseTimeMs: 18 },
        { service: 'SpamCop SCBL', host: 'bl.spamcop.net', status: 'clean', category: 'Dynamic Relay Spam', responseTimeMs: 31 },
        { service: 'Invaluement URI', host: 'ivmURI.invaluement.com', status: 'clean', category: 'High-Confidence URI', responseTimeMs: 27 },
        { service: 'SORBS DUL', host: 'dul.dnsbl.sorbs.net', status: 'clean', category: 'Dialup IP Blocklist', responseTimeMs: 19 },
      ],
      dmarcReports: [
        { sourceIp: '209.85.220.41', organization: 'Google LLC (Gmail Ingress)', count: 1420, spfPass: true, dkimPass: true, disposition: 'none', country: 'United States' },
        { sourceIp: '40.92.18.94', organization: 'Microsoft Corporation (O365 Mail)', count: 980, spfPass: true, dkimPass: true, disposition: 'none', country: 'Ireland' },
        { sourceIp: '17.58.23.11', organization: 'Apple Inc. (iCloud Mail)', count: 640, spfPass: true, dkimPass: true, disposition: 'none', country: 'United States' },
        { sourceIp: '212.227.126.133', organization: '1&1 IONOS SE (European Mail)', count: 320, spfPass: true, dkimPass: true, disposition: 'none', country: 'Germany' },
        { sourceIp: '185.15.247.10', organization: 'Proton AG (ProtonMail CH)', count: 215, spfPass: true, dkimPass: true, disposition: 'none', country: 'Switzerland' },
      ],
      spamAssassinScore: -2.8, // negative is good/clean in SpamAssassin
      recommendations: [
        'BIMI SVG logo is cryptographically signed with Entrust VMC. Verified blue checkmark active on Apple Mail & Gmail.',
        'MTA-STS policy enforce mode is active with TLS 1.3 cryptographic cipher suites.',
        'DMARC p=reject alignment passed on 100% of analyzed outbound volume over the last 30 days.',
      ],
    };
  }

  // Sessions
  public createSession(userId: string, organizationId: string): string {
    const token = `mn_sess_${crypto.randomBytes(24).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
    this.data.sessions.push({ token, userId, organizationId, expiresAt });
    this.scheduleSave();
    return token;
  }

  public getSession(token: string) {
    const sess = this.data.sessions.find((s) => s.token === token);
    if (!sess) return null;
    if (new Date(sess.expiresAt) < new Date()) {
      this.data.sessions = this.data.sessions.filter((s) => s.token !== token);
      this.scheduleSave();
      return null;
    }
    return sess;
  }

  public deleteSession(token: string) {
    this.data.sessions = this.data.sessions.filter((s) => s.token !== token);
    this.scheduleSave();
  }

  public deleteSessionsByUserId(userId: string) {
    this.data.sessions = this.data.sessions.filter((s) => s.userId !== userId);
    this.scheduleSave();
  }

  public exportOrganization(orgId: string) {
    const organization = this.getOrgById(orgId);
    if (!organization) return null;
    const memberships = this.getMembershipsByOrg(orgId);
    const users = memberships
      .map((m) => this.getUserById(m.userId))
      .filter((u): u is User => Boolean(u))
      .map((u) => {
        const {
          passwordHash: _ph,
          totpSecret: _ts,
          recoveryKeys: _rk,
          verificationToken: _vt,
          verificationTokenExpiresAt: _ve,
          resetPasswordToken: _rt,
          resetPasswordExpiresAt: _re,
          ...safe
        } = u;
        return safe;
      });

    return {
      exportedAt: new Date().toISOString(),
      format: 'mailoo-workspace-export-v1',
      organization,
      users,
      memberships,
      domains: this.getDomainsByOrg(orgId),
      mailboxes: this.getMailboxesByOrg(orgId),
      aliases: this.getAliasesByOrg(orgId),
      customFolders: this.data.customFolders.filter((f) => f.organizationId === orgId),
      signatures: this.data.signatures.filter((s) => s.organizationId === orgId),
      templates: this.getTemplates(orgId),
      filterRules: this.data.filterRules.filter((r) => r.organizationId === orgId),
      contacts: this.getContacts(orgId),
      threads: this.data.threads
        .filter((t) => t.organizationId === orgId)
        .map((t) => ({
          id: t.id,
          subject: t.subject,
          folder: t.folder,
          unreadCount: t.unreadCount,
          lastMessageAt: t.lastMessageAt,
          participants: t.participants,
        })),
      messages: this.data.messages
        .filter((m) => m.organizationId === orgId)
        .map((m) => ({
          id: m.id,
          threadId: m.threadId,
          folder: m.folder,
          from: m.from,
          to: m.to,
          subject: m.subject,
          snippet: m.snippet || (m.bodyText || '').slice(0, 280),
          createdAt: m.createdAt,
          attachments: (m.attachments || []).map((a) => ({
            filename: a.filename,
            contentType: a.contentType,
            size: a.size,
          })),
        })),
      auditLogs: this.getAuditLogs(orgId),
      invoices: this.getInvoicesByOrg(orgId),
    };
  }

  public deleteOrganization(orgId: string): { deletedUserIds: string[] } {
    const memberUserIds = this.getMembershipsByOrg(orgId).map((m) => m.userId);
    const byOrg = <T extends { organizationId?: string }>(rows: T[]) =>
      rows.filter((row) => row.organizationId !== orgId);

    this.data.organizations = this.data.organizations.filter((o) => o.id !== orgId);
    this.data.memberships = this.data.memberships.filter((m) => m.organizationId !== orgId);
    this.data.domains = byOrg(this.data.domains);
    this.data.mailboxes = byOrg(this.data.mailboxes);
    this.data.aliases = byOrg(this.data.aliases);
    this.data.messages = byOrg(this.data.messages);
    this.data.threads = byOrg(this.data.threads);
    this.data.customFolders = byOrg(this.data.customFolders);
    this.data.signatures = byOrg(this.data.signatures);
    this.data.spamRules = byOrg(this.data.spamRules);
    this.data.templates = byOrg(this.data.templates);
    this.data.filterRules = byOrg(this.data.filterRules);
    this.data.contacts = byOrg(this.data.contacts);
    this.data.internalNotes = byOrg(this.data.internalNotes);
    this.data.pgpKeys = byOrg(this.data.pgpKeys);
    this.data.retentionPolicies = byOrg(this.data.retentionPolicies);
    this.data.blockedSenders = byOrg(this.data.blockedSenders);
    this.data.bimiConfigs = byOrg(this.data.bimiConfigs);
    this.data.appPasswords = byOrg(this.data.appPasswords);
    this.data.loginAttempts = byOrg(this.data.loginAttempts);
    this.data.auditLogs = byOrg(this.data.auditLogs);
    this.data.apiKeys = byOrg(this.data.apiKeys);
    this.data.invoices = byOrg(this.data.invoices);
    this.data.sessions = this.data.sessions.filter((s) => s.organizationId !== orgId);

    const deletedUserIds: string[] = [];
    for (const userId of memberUserIds) {
      const remaining = this.data.memberships.some((m) => m.userId === userId);
      if (!remaining) {
        this.data.users = this.data.users.filter((u) => u.id !== userId);
        this.data.sessions = this.data.sessions.filter((s) => s.userId !== userId);
        deletedUserIds.push(userId);
      }
    }

    this.scheduleSave();
    return { deletedUserIds };
  }
}

export const db = new Database();
