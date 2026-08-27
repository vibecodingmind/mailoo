import type {
  User,
  Organization,
  Domain,
  Mailbox,
  Alias,
  Thread,
  Message,
  AuditLog,
  ApiKey,
  Invoice,
  DnsRecordConfig,
  Membership,
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
  AiThreadIntelligence,
  BimiConfig,
  AppPassword,
  DeliverabilityAudit,
} from '../types.js';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('monogram_session_token');
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('monogram_session_token', token);
    } else {
      localStorage.removeItem('monogram_session_token');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
      headers['x-session-token'] = this.token;
    }

    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `HTTP error! status: ${res.status}`);
    }

    return data as T;
  }

  // Auth
  public async getMe(): Promise<{
    user: User;
    organization: Organization;
    availableOrganizations: Organization[];
    mailboxes: Mailbox[];
    domains: Domain[];
    memberships: Membership[];
    sessionToken: string;
  }> {
    return this.request('/api/auth/me');
  }

  public async login(email: string, password?: string): Promise<{ user: User; organization: Organization; sessionToken: string }> {
    const res = await this.request<{ user: User; organization: Organization; sessionToken: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(res.sessionToken);
    return res;
  }

  public async enterDemo(): Promise<{ user: User; organization: Organization; sessionToken: string }> {
    const res = await this.request<{ user: User; organization: Organization; sessionToken: string }>('/api/auth/demo', {
      method: 'POST',
    });
    this.setToken(res.sessionToken);
    return res;
  }

  public async signup(data: { fullName: string; email: string; password?: string; orgName?: string; plan?: string }): Promise<{
    user: User;
    organization: Organization;
    sessionToken: string;
    verificationToken?: string;
    verificationUrl?: string;
    message?: string;
  }> {
    const res = await this.request<{
      user: User;
      organization: Organization;
      sessionToken: string;
      verificationToken?: string;
      verificationUrl?: string;
      message?: string;
    }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.sessionToken) {
      this.setToken(res.sessionToken);
    }
    return res;
  }

  public async verifyEmail(token: string): Promise<{
    success: boolean;
    message: string;
    user: User;
    organization: Organization;
    sessionToken: string;
  }> {
    const res = await this.request<{
      success: boolean;
      message: string;
      user: User;
      organization: Organization;
      sessionToken: string;
    }>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    if (res.sessionToken) {
      this.setToken(res.sessionToken);
    }
    return res;
  }

  public async resendVerification(email: string): Promise<{
    success: boolean;
    alreadyVerified?: boolean;
    message: string;
    verificationToken?: string;
    verificationUrl?: string;
  }> {
    return this.request('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  public async forgotPassword(email: string): Promise<{
    success: boolean;
    message: string;
    resetToken?: string;
    resetUrl?: string;
  }> {
    return this.request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  public async resetPassword(token: string, newPassword: string): Promise<{
    success: boolean;
    message: string;
    sessionToken?: string;
  }> {
    const res = await this.request<{
      success: boolean;
      message: string;
      sessionToken?: string;
    }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
    if (res.sessionToken) {
      this.setToken(res.sessionToken);
    }
    return res;
  }

  public async logout(): Promise<{ success: boolean; message: string }> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      this.setToken(null);
    }
    return { success: true, message: 'Logged out' };
  }

  public async getStatus(): Promise<{
    status: string;
    service: string;
    version: string;
    startedAt?: string;
    uptimeSeconds?: number;
    checks: { id: string; name: string; status: 'operational' | 'degraded' | 'not_configured' | 'down'; detail?: string }[];
  }> {
    return this.request('/api/status');
  }

  public async exportAccount(): Promise<Record<string, unknown>> {
    return this.request('/api/account/export');
  }

  public async deleteAccount(): Promise<{ success: boolean; message: string }> {
    const res = await this.request<{ success: boolean; message: string }>('/api/account', {
      method: 'DELETE',
    });
    this.setToken(null);
    return res;
  }

  public async switchOrg(organizationId: string): Promise<{ organization: Organization; sessionToken: string }> {
    const res = await this.request<{ organization: Organization; sessionToken: string }>('/api/auth/switch-org', {
      method: 'POST',
      body: JSON.stringify({ organizationId }),
    });
    this.setToken(res.sessionToken);
    return res;
  }

  public async resetDemo(): Promise<{ success: boolean; message: string }> {
    return this.request('/api/system/reset-demo', { method: 'POST' });
  }

  // Domains
  public async getDomains(): Promise<{ domains: Domain[] }> {
    return this.request('/api/domains');
  }

  public async addDomain(domainName: string): Promise<{ domain: Domain }> {
    return this.request('/api/domains', {
      method: 'POST',
      body: JSON.stringify({ domainName }),
    });
  }

  public async getDomainDns(domainId: string): Promise<{ domain: Domain; records: DnsRecordConfig[] }> {
    return this.request(`/api/domains/${domainId}/dns`);
  }

  public async verifyDomainDns(domainId: string): Promise<{
    success: boolean;
    domain: Domain;
    records: DnsRecordConfig[];
    logDetails: string;
  }> {
    return this.request(`/api/domains/${domainId}/verify`, { method: 'POST' });
  }

  public async deleteDomain(domainId: string): Promise<{ success: boolean }> {
    return this.request(`/api/domains/${domainId}`, { method: 'DELETE' });
  }

  // Mailboxes
  public async getMailboxes(): Promise<{ mailboxes: Mailbox[] }> {
    return this.request('/api/mailboxes');
  }

  public async createMailbox(data: {
    domainId: string;
    username: string;
    name?: string;
    type?: 'individual' | 'shared';
    quotaMb?: number;
    signature?: string;
  }): Promise<{ mailbox: Mailbox }> {
    return this.request('/api/mailboxes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateMailbox(id: string, updates: Partial<Mailbox>): Promise<{ mailbox: Mailbox }> {
    return this.request(`/api/mailboxes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  public async deleteMailbox(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/mailboxes/${id}`, { method: 'DELETE' });
  }

  // Aliases
  public async getAliases(): Promise<{ aliases: Alias[] }> {
    return this.request('/api/aliases');
  }

  public async createAlias(data: {
    domainId: string;
    aliasPrefix: string;
    targetMailboxId: string;
    description?: string;
  }): Promise<{ alias: Alias }> {
    return this.request('/api/aliases', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateAlias(id: string, updates: Partial<Alias>): Promise<{ alias: Alias }> {
    return this.request(`/api/aliases/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  public async deleteAlias(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/aliases/${id}`, { method: 'DELETE' });
  }

  // Threads & Messages
  public async getThreads(params: { mailboxId?: string; folder?: string; search?: string } = {}): Promise<{ threads: Thread[] }> {
    const query = new URLSearchParams();
    if (params.mailboxId) query.set('mailboxId', params.mailboxId);
    if (params.folder) query.set('folder', params.folder);
    if (params.search) query.set('search', params.search);

    return this.request(`/api/threads?${query.toString()}`);
  }

  public async getThread(id: string): Promise<{ thread: Thread }> {
    return this.request(`/api/threads/${id}`);
  }

  public async updateThread(id: string, updates: Partial<Thread>): Promise<{ thread: Thread }> {
    return this.request(`/api/threads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  public async moveThread(id: string, folder: string): Promise<{ success: boolean; thread: Thread }> {
    return this.request(`/api/threads/${id}/move`, {
      method: 'POST',
      body: JSON.stringify({ folder }),
    });
  }

  public async deleteThread(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/threads/${id}`, { method: 'DELETE' });
  }

  public async reportSpam(id: string): Promise<{ success: boolean; thread: Thread; blockedAddress?: string; message: string }> {
    return this.request(`/api/threads/${id}/report-spam`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  // Custom Signatures
  public async getSignatures(mailboxId?: string): Promise<{ signatures: EmailSignature[] }> {
    const query = mailboxId ? `?mailboxId=${encodeURIComponent(mailboxId)}` : '';
    return this.request(`/api/signatures${query}`);
  }

  public async createSignature(data: {
    name: string;
    content: string;
    isDefault?: boolean;
    mailboxId?: string;
  }): Promise<{ signature: EmailSignature }> {
    return this.request('/api/signatures', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateSignature(
    id: string,
    updates: { name?: string; content?: string; isDefault?: boolean }
  ): Promise<{ signature: EmailSignature }> {
    return this.request(`/api/signatures/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  public async deleteSignature(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/signatures/${id}`, { method: 'DELETE' });
  }

  // Spam Filter Rules
  public async getSpamRules(): Promise<{ rules: SpamRule[] }> {
    return this.request('/api/spam-rules');
  }

  public async addSpamRule(senderPattern: string, reason?: string): Promise<{ rule: SpamRule }> {
    return this.request('/api/spam-rules', {
      method: 'POST',
      body: JSON.stringify({ senderPattern, reason }),
    });
  }

  public async deleteSpamRule(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/spam-rules/${id}`, { method: 'DELETE' });
  }

  // Custom Folders
  public async getCustomFolders(mailboxId?: string): Promise<{ folders: CustomFolder[] }> {
    const query = mailboxId ? `?mailboxId=${encodeURIComponent(mailboxId)}` : '';
    return this.request(`/api/folders${query}`);
  }

  public async createCustomFolder(data: {
    name: string;
    color?: string;
    icon?: string;
    mailboxId?: string;
  }): Promise<{ folder: CustomFolder }> {
    return this.request('/api/folders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateCustomFolder(
    id: string,
    updates: { name?: string; color?: string; icon?: string }
  ): Promise<{ folder: CustomFolder }> {
    return this.request(`/api/folders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  public async deleteCustomFolder(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/folders/${id}`, { method: 'DELETE' });
  }

  public async sendMessage(data: {
    mailboxId: string;
    to: { name?: string; address: string }[];
    cc?: { name?: string; address: string }[];
    bcc?: { name?: string; address: string }[];
    subject: string;
    bodyHtml?: string;
    bodyText: string;
    attachments?: any[];
    threadId?: string;
    isDraft?: boolean;
    readReceiptRequested?: boolean;
  }): Promise<{ success: boolean; message: Message }> {
    return this.request('/api/messages/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async simulateReadReceiptOpen(messageId: string): Promise<{ success: boolean; message: Message }> {
    return this.request(`/api/messages/${messageId}/simulate-open`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  public async simulateInbound(params: {
    mailboxId?: string;
    fromName?: string;
    fromAddress?: string;
    subject?: string;
    bodyText?: string;
    preset?: 'client_inquiry' | 'security_alert' | 'invoice_receipt';
  }): Promise<{ success: boolean; message: Message }> {
    return this.request('/api/messages/simulate-inbound', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // AI Copilot
  public async aiCopilot(params: {
    action: 'draft' | 'polish' | 'formalize' | 'shorten' | 'summarize_thread' | 'suggest_replies' | 'analyze_spam';
    text?: string;
    context?: string;
    tone?: string;
  }): Promise<{ result: string; suggestions?: string[] }> {
    return this.request('/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Billing
  public async getBilling(): Promise<{
    organization: Organization;
    usage: {
      domainsUsed: number;
      domainsMax: number;
      mailboxesUsed: number;
      mailboxesMax: number;
      storageUsedMb: number;
      storageMaxGb: number;
    };
    invoices: Invoice[];
  }> {
    return this.request('/api/billing');
  }

  public async getInvoices(): Promise<{ invoices: Invoice[] }> {
    return this.request('/api/billing/invoices');
  }

  public async updateSubscription(plan: string, period: 'monthly' | 'annual' = 'monthly'): Promise<{ organization: Organization; success: boolean }> {
    return this.changePlan(plan.toLowerCase(), period);
  }

  public async changePlan(plan: string, period: 'monthly' | 'annual' = 'monthly'): Promise<{ organization: Organization; success: boolean }> {
    return this.request('/api/billing/change-plan', {
      method: 'POST',
      body: JSON.stringify({ plan: plan.toLowerCase(), period }),
    });
  }

  // Audit Logs
  public async getAuditLogs(): Promise<{ logs: AuditLog[] }> {
    return this.request('/api/audit-logs');
  }

  // Security & Audit: Login Attempts
  public async getLoginAttempts(): Promise<{ attempts: LoginAttempt[] }> {
    return this.request('/api/security/login-attempts');
  }

  public async simulateLoginAttempt(params?: {
    status?: string;
    location?: string;
    ip?: string;
    device?: string;
    method?: string;
  }): Promise<{ success: boolean; attempt: LoginAttempt }> {
    return this.request('/api/security/login-attempts/simulate', {
      method: 'POST',
      body: JSON.stringify(params || {}),
    });
  }

  // API Keys
  public async getApiKeys(): Promise<{ keys: ApiKey[] }> {
    return this.request('/api/api-keys');
  }

  public async createApiKey(name: string, scopes?: string[]): Promise<{ key: ApiKey }> {
    return this.request('/api/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name, scopes }),
    });
  }

  public async deleteApiKey(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/api-keys/${id}`, { method: 'DELETE' });
  }

  // Team
  public async getTeam(): Promise<{ members: Membership[] }> {
    return this.request('/api/team');
  }

  public async getTeamMembers(): Promise<{ members: any[] }> {
    const res = await this.request<{ members: any[] }>('/api/team');
    return {
      members: res.members.map((m: any) => ({
        id: m.id,
        name: m.userName || m.name || m.userEmail?.split('@')[0] || 'Member',
        email: m.userEmail || m.email,
        role: m.role || 'member',
        status: m.status || 'active',
        mfaEnabled: true,
      })),
    };
  }

  public async inviteTeamMember(
    emailOrData: string | { email: string; name?: string; role?: string; mailboxGrants?: string[] },
    role?: string
  ): Promise<{ membership: Membership }> {
    const payload =
      typeof emailOrData === 'string'
        ? { email: emailOrData, role: role || 'member', name: emailOrData.split('@')[0] }
        : emailOrData;

    return this.request('/api/team/invite', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async removeTeamMember(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/team/${id}`, { method: 'DELETE' });
  }

  // ===================================
  // 20 Advanced Features API Client Methods
  // ===================================

  // 1. Undo Send & Cancel Scheduled
  public async undoSend(messageId: string): Promise<{ success: boolean; message: Message }> {
    return this.request(`/api/messages/${messageId}/undo-send`, { method: 'POST' });
  }

  public async cancelScheduledSend(messageId: string): Promise<{ success: boolean; message: Message }> {
    return this.request(`/api/messages/${messageId}/cancel-scheduled`, { method: 'POST' });
  }

  // 2. Snooze & Unsnooze
  public async snoozeThread(threadId: string, snoozedUntil: string): Promise<{ success: boolean; thread: Thread }> {
    return this.request(`/api/threads/${threadId}/snooze`, {
      method: 'POST',
      body: JSON.stringify({ snoozedUntil }),
    });
  }

  public async unsnoozeThread(threadId: string): Promise<{ success: boolean; thread: Thread }> {
    return this.request(`/api/threads/${threadId}/unsnooze`, { method: 'POST' });
  }

  // 3. VIP Senders
  public async toggleThreadVip(threadId: string, isVip?: boolean): Promise<{ success: boolean; thread: Thread }> {
    return this.request(`/api/threads/${threadId}/toggle-vip`, {
      method: 'POST',
      body: JSON.stringify({ isVip }),
    });
  }

  // 4. Message Reaction Badges
  public async toggleMessageReaction(messageId: string, emoji: string): Promise<{ success: boolean; message: Message }> {
    return this.request(`/api/messages/${messageId}/reaction`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
  }

  // 5. Confidential Mode Passcode Unlock
  public async unlockConfidentialMessage(
    messageId: string,
    passcode: string
  ): Promise<{ success: boolean; message: Message }> {
    return this.request(`/api/messages/${messageId}/unlock-confidential`, {
      method: 'POST',
      body: JSON.stringify({ passcode }),
    });
  }

  // 6. Centralized Attachments Explorer
  public async getAttachmentsExplorer(params?: {
    mailboxId?: string;
    search?: string;
    fileType?: string;
  }): Promise<{
    attachments: Array<{
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
    }>;
  }> {
    const qs = new URLSearchParams();
    if (params?.mailboxId) qs.set('mailboxId', params.mailboxId);
    if (params?.search) qs.set('search', params.search);
    if (params?.fileType) qs.set('fileType', params.fileType);
    return this.request(`/api/attachments/explorer?${qs.toString()}`);
  }

  // 7. Email Templates CRUD
  public async getTemplates(mailboxId?: string): Promise<{ templates: EmailTemplate[] }> {
    return this.request(`/api/templates${mailboxId ? `?mailboxId=${mailboxId}` : ''}`);
  }

  public async createTemplate(data: Partial<EmailTemplate>): Promise<{ template: EmailTemplate }> {
    return this.request('/api/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateTemplate(id: string, data: Partial<EmailTemplate>): Promise<{ template: EmailTemplate }> {
    return this.request(`/api/templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  public async deleteTemplate(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/templates/${id}`, { method: 'DELETE' });
  }

  // 8. Ingress Filter Rules CRUD
  public async getFilterRules(mailboxId?: string): Promise<{ filterRules: FilterRule[] }> {
    return this.request(`/api/filter-rules${mailboxId ? `?mailboxId=${mailboxId}` : ''}`);
  }

  public async createFilterRule(data: Partial<FilterRule>): Promise<{ rule: FilterRule }> {
    return this.request('/api/filter-rules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateFilterRule(id: string, data: Partial<FilterRule>): Promise<{ rule: FilterRule }> {
    return this.request(`/api/filter-rules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  public async deleteFilterRule(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/filter-rules/${id}`, { method: 'DELETE' });
  }

  // 9. Contacts / Address Book CRUD
  public async getContacts(mailboxId?: string): Promise<{ contacts: Contact[] }> {
    return this.request(`/api/contacts${mailboxId ? `?mailboxId=${mailboxId}` : ''}`);
  }

  public async createContact(data: Partial<Contact>): Promise<{ contact: Contact }> {
    return this.request('/api/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateContact(id: string, data: Partial<Contact>): Promise<{ contact: Contact }> {
    return this.request(`/api/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  public async deleteContact(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/contacts/${id}`, { method: 'DELETE' });
  }

  // 10. Internal Notes (Thread Collaboration)
  public async getThreadNotes(threadId: string): Promise<{ notes: InternalNote[] }> {
    return this.request(`/api/threads/${threadId}/notes`);
  }

  public async addThreadNote(threadId: string, content: string): Promise<{ note: InternalNote }> {
    return this.request(`/api/threads/${threadId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  public async deleteThreadNote(noteId: string): Promise<{ success: boolean }> {
    return this.request(`/api/notes/${noteId}`, { method: 'DELETE' });
  }

  // 11. PGP Key Management
  public async getPgpKeys(mailboxId?: string): Promise<{ keys: PgpKey[] }> {
    return this.request(`/api/pgp-keys${mailboxId ? `?mailboxId=${mailboxId}` : ''}`);
  }

  public async generatePgpKey(data: { email: string; name: string; mailboxId?: string }): Promise<{ key: PgpKey }> {
    return this.request('/api/pgp-keys/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async createPgpKey(data: Partial<PgpKey>): Promise<{ key: PgpKey }> {
    return this.request('/api/pgp-keys', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async deletePgpKey(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/pgp-keys/${id}`, { method: 'DELETE' });
  }

  // 12. Retention Policy & Scan
  public async getRetentionPolicy(): Promise<{ policy: RetentionPolicy }> {
    return this.request('/api/retention-policy');
  }

  public async updateRetentionPolicy(data: Partial<RetentionPolicy>): Promise<{ policy: RetentionPolicy }> {
    return this.request('/api/retention-policy', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  public async executeRetentionScan(): Promise<{
    success: boolean;
    result: {
      purgedTrash: number;
      purgedSpam: number;
      archivedCount: number;
      totalCleaned: number;
      timestamp: string;
    };
  }> {
    return this.request('/api/retention-policy/execute-scan', { method: 'POST' });
  }

  // 13. Blocked & Allowed Senders
  public async getBlockedSenders(): Promise<{ senders: BlockedSender[] }> {
    return this.request('/api/blocked-senders');
  }

  public async addBlockedSender(data: { pattern: string; type: 'block' | 'allow'; reason?: string }): Promise<{ sender: BlockedSender }> {
    return this.request('/api/blocked-senders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async deleteBlockedSender(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/blocked-senders/${id}`, { method: 'DELETE' });
  }

  // 14. Out-of-Office / Vacation Responder
  public async getVacationResponder(mailboxId: string): Promise<{ vacationResponder: any }> {
    return this.request(`/api/mailboxes/${mailboxId}/vacation`);
  }

  public async updateVacationResponder(mailboxId: string, data: any): Promise<{ mailbox: Mailbox }> {
    return this.request(`/api/mailboxes/${mailboxId}/vacation`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // 15. 2FA / TOTP Security
  public async setup2FA(): Promise<{ secret: string; qrCodeUrl: string; recoveryKeys: string[] }> {
    return this.request('/api/auth/2fa/setup', { method: 'POST' });
  }

  public async enable2FA(secret: string, recoveryKeys: string[]): Promise<{ success: boolean; message: string }> {
    return this.request('/api/auth/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ secret, recoveryKeys }),
    });
  }

  public async disable2FA(): Promise<{ success: boolean; message: string }> {
    return this.request('/api/auth/2fa/disable', { method: 'POST' });
  }

  // 16. AI Thread Intelligence & Voice Dictation
  public async getThreadAiIntelligence(threadId: string): Promise<{ success: boolean; intelligence: AiThreadIntelligence }> {
    return this.request(`/api/threads/${threadId}/ai-intelligence`, { method: 'POST' });
  }

  public async analyzeThreadIntelligence(threadId: string): Promise<{ success: boolean; intelligence: AiThreadIntelligence }> {
    return this.getThreadAiIntelligence(threadId);
  }

  public async toggleVipSender(threadId: string, isVip?: boolean): Promise<{ success: boolean; isVip: boolean }> {
    return this.request(`/api/threads/${threadId}/vip`, {
      method: 'POST',
      body: JSON.stringify({ isVip }),
    });
  }

  public async transcribeVoice(params?: { simulatedAudioTone?: string }): Promise<{ transcription: string; refinedDraft: string }> {
    return this.request('/api/ai/transcribe-voice', {
      method: 'POST',
      body: JSON.stringify(params || {}),
    });
  }

  // 17. BIMI Brand Avatar
  public async getBimiConfigs(): Promise<{ configs: BimiConfig[] }> {
    return this.request('/api/bimi');
  }

  public async saveBimiConfig(params: {
    domainId: string;
    svgLogoUrl: string;
    vmcCertUrl?: string;
    selector?: string;
  }): Promise<{ config: BimiConfig; success: boolean }> {
    return this.request('/api/bimi', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // 18. App Passwords
  public async getAppPasswords(): Promise<{ appPasswords: AppPassword[] }> {
    return this.request('/api/app-passwords');
  }

  public async createAppPassword(params: {
    mailboxId: string;
    name: string;
    scopes: ('imap' | 'smtp' | 'pop3' | 'caldav' | 'carddav')[];
  }): Promise<{ appPassword: AppPassword; rawSecret: string }> {
    return this.request('/api/app-passwords', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  public async deleteAppPassword(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/app-passwords/${id}`, { method: 'DELETE' });
  }

  // 19. Calendar Invites & .ICS RSVP
  public async respondCalendarRsvp(messageId: string, status: 'accepted' | 'declined' | 'tentative'): Promise<{ success: boolean; message: Message }> {
    return this.request(`/api/messages/${messageId}/calendar-rsvp`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  }

  // 20. Deliverability Audit & Spam Matrices
  public async getDeliverabilityAudit(): Promise<{ audit: DeliverabilityAudit }> {
    return this.request('/api/deliverability/audit');
  }

  // 21. Mailbox Aliases
  public async addMailboxAlias(mailboxId: string, alias: string): Promise<{ mailbox: Mailbox; success: boolean }> {
    return this.request(`/api/mailboxes/${mailboxId}/aliases`, {
      method: 'POST',
      body: JSON.stringify({ alias }),
    });
  }

  public async removeMailboxAlias(mailboxId: string, alias: string): Promise<{ mailbox: Mailbox; success: boolean }> {
    return this.request(`/api/mailboxes/${mailboxId}/aliases`, {
      method: 'DELETE',
      body: JSON.stringify({ alias }),
    });
  }

  // 22. AI Smart Sort & Quick Replies
  public async smartSortInbox(mailboxId?: string): Promise<{
    success: boolean;
    suggestions: Array<{
      threadId: string;
      subject: string;
      sender: string;
      targetFolder: string;
      folderName: string;
      confidence: number;
      reason: string;
    }>;
    evaluatedCount: number;
  }> {
    return this.request('/api/ai/smart-sort', {
      method: 'POST',
      body: JSON.stringify({ mailboxId }),
    });
  }

  public async getQuickReplies(params: { context?: string; threadId?: string }): Promise<{
    success: boolean;
    suggestions: string[];
  }> {
    return this.request('/api/ai/quick-replies', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }
}

export const api = new ApiService();
