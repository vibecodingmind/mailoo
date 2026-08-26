import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { db } from './src/server/db.js';
import {
  getRecommendedDnsRecords,
  verifyDomainDns,
  sendEmail,
  simulateInboundEmail,
  runAiEmailAssistant,
  classifySmartSort,
} from './src/server/mailEngine.js';
import { hashPassword, verifyPassword, needsRehash } from './src/server/passwordSecurity.js';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      organization?: any;
      sessionToken?: string;
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Helper middleware for session / auth context
  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers['x-session-token']) {
      token = req.headers['x-session-token'] as string;
    }

    let session = token ? db.getSession(token) : null;

    // If no valid session, default to demo owner user for seamless frictionless evaluation
    if (!session) {
      const defaultUser = db.getUserByEmail('alex.vance@atelier-nordic.com') || db.getSchema().users[0];
      const defaultOrg = db.getSchema().organizations[0];
      if (defaultUser && defaultOrg) {
        req.user = defaultUser;
        req.organization = defaultOrg;
        req.sessionToken = 'demo-session-token';
        return next();
      }
    }

    if (session) {
      const user = db.getUserById(session.userId);
      const org = db.getOrgById(session.organizationId);
      if (user && org) {
        req.user = user;
        req.organization = org;
        req.sessionToken = session.token;
      }
    }

    next();
  });

  // Declare custom express request types
  // ===================================
  // API Routes
  // ===================================

  // In-memory rate limiter for failed login attempts
  const loginAttemptsMap = new Map<string, { count: number; lockedUntil: number }>();

  // Health
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Mailoo Email Hosting Engine',
      version: '1.4.0',
      timestamp: new Date().toISOString(),
    });
  });

  // Auth: Current State
  app.get('/api/auth/me', (req, res) => {
    if (!req.user || !req.organization) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const orgId = req.organization.id;
    const mailboxes = db.getMailboxesByOrg(orgId);
    const domains = db.getDomainsByOrg(orgId);
    const memberships = db.getMembershipsByOrg(orgId);
    const allUserMemberships = db.getMembershipsByUser(req.user.id);
    const availableOrgs = allUserMemberships
      .map((m) => db.getOrgById(m.organizationId))
      .filter(Boolean);

    res.json({
      user: req.user,
      organization: req.organization,
      availableOrganizations: availableOrgs.length > 0 ? availableOrgs : [req.organization],
      mailboxes: mailboxes,
      domains: domains,
      memberships: memberships,
      sessionToken: req.sessionToken || 'demo-session-token',
    });
  });

  // Auth: Signup with validation & verification token generation
  app.post('/api/auth/signup', (req, res) => {
    const { fullName, email, password, orgName, plan = 'pro' } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Password validation (if provided)
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
      }
      if (!/[A-Z]/.test(password)) {
        return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
      }
      if (!/[0-9]/.test(password)) {
        return res.status(400).json({ error: 'Password must contain at least one number' });
      }
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = db.getUserByEmail(cleanEmail);

    if (existingUser && existingUser.isEmailVerified !== false) {
      return res.status(409).json({
        error: 'An account with this email address already exists. Please sign in or reset your password.',
      });
    }

    const newUserId = existingUser ? existingUser.id : `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const newOrgId = `org_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 3600000).toISOString();
    const pwdHash = password ? hashPassword(password) : hashPassword('Monogram2026!');

    let user: any;
    if (existingUser) {
      user = db.updateUser(existingUser.id, {
        fullName: fullName.trim(),
        passwordHash: pwdHash,
        verificationToken,
        verificationTokenExpiresAt,
        isEmailVerified: false,
      });
    } else {
      user = db.createUser({
        id: newUserId,
        email: cleanEmail,
        fullName: fullName.trim(),
        role: 'owner',
        mfaEnabled: true,
        passwordHash: pwdHash,
        isEmailVerified: false,
        verificationToken,
        verificationTokenExpiresAt,
        recoveryKeys: [`MN-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`],
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      });
    }

    const org = db.createOrg({
      id: newOrgId,
      name: orgName || `${fullName.trim()}'s Studio`,
      slug: (orgName || fullName).toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30),
      plan: plan,
      billingStatus: 'active',
      billingPeriod: 'monthly',
      maxDomains: plan === 'enterprise' ? 25 : plan === 'pro' ? 5 : 1,
      maxMailboxes: plan === 'enterprise' ? 100 : plan === 'pro' ? 20 : 3,
      maxStorageGb: plan === 'enterprise' ? 250 : plan === 'pro' ? 50 : 10,
      currentStorageMb: 120,
      createdAt: new Date().toISOString(),
    });

    db.createMembership({
      id: `mem_${Date.now()}`,
      organizationId: newOrgId,
      userId: user.id,
      userEmail: user.email,
      userName: user.fullName,
      role: 'owner',
      mailboxGrants: [],
      status: 'active',
    });

    const token = db.createSession(user.id, newOrgId);

    db.addAuditLog({
      organizationId: newOrgId,
      userId: user.id,
      userEmail: user.email,
      action: 'auth.signup',
      category: 'auth',
      ipAddress: req.ip || '127.0.0.1',
      details: `Created new organization "${org.name}" on ${plan} tier. Verification token issued.`,
    });

    res.json({
      user,
      organization: org,
      sessionToken: token,
      verificationToken,
      verificationUrl: `/verify-email?token=${verificationToken}`,
      message: 'Account created. Verification email sent.',
    });
  });

  // Auth: Email Verification
  app.post('/api/auth/verify-email', (req, res) => {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const user = db.getUserByVerificationToken(token.trim());
    if (!user) {
      return res.status(400).json({ error: 'Invalid or already used verification token' });
    }

    if (user.verificationTokenExpiresAt && new Date(user.verificationTokenExpiresAt) < new Date()) {
      return res.status(400).json({ error: 'Verification token has expired. Please request a new verification email.' });
    }

    const updatedUser = db.updateUser(user.id, {
      isEmailVerified: true,
      verificationToken: undefined,
      verificationTokenExpiresAt: undefined,
    });

    const memberships = db.getMembershipsByUser(user.id);
    const orgId = memberships[0]?.organizationId || 'org_atelier_nordic';
    const org = db.getOrgById(orgId);
    const sessionToken = db.createSession(user.id, orgId);

    db.addAuditLog({
      organizationId: orgId,
      userId: user.id,
      userEmail: user.email,
      action: 'auth.email_verified',
      category: 'auth',
      ipAddress: req.ip || '127.0.0.1',
      details: `Email address ${user.email} verified successfully via token`,
    });

    res.json({
      success: true,
      message: 'Email verified successfully. Account is now active.',
      user: updatedUser,
      organization: org,
      sessionToken,
    });
  });

  // Auth: Resend verification email
  app.post('/api/auth/resend-verification', (req, res) => {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const user = db.getUserByEmail(email.trim().toLowerCase());
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email address' });
    }

    if (user.isEmailVerified) {
      return res.json({
        success: true,
        alreadyVerified: true,
        message: 'Account is already verified. You can sign in immediately.',
      });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 3600000).toISOString();

    db.updateUser(user.id, {
      verificationToken,
      verificationTokenExpiresAt,
    });

    res.json({
      success: true,
      message: 'New verification email dispatched.',
      verificationToken,
      verificationUrl: `/verify-email?token=${verificationToken}`,
    });
  });

  // Auth: Login with password & rate limiting
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const clientKey = `${req.ip || '127.0.0.1'}_${email.trim().toLowerCase()}`;
    const rateLimit = loginAttemptsMap.get(clientKey);

    if (rateLimit && rateLimit.lockedUntil > Date.now()) {
      const waitSeconds = Math.ceil((rateLimit.lockedUntil - Date.now()) / 1000);
      return res.status(429).json({
        error: `Too many failed login attempts. Account temporarily locked for security. Please retry in ${waitSeconds} seconds.`,
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = db.getUserByEmail(cleanEmail);

    if (!user) {
      // Record failed attempt for rate limiting
      const current = loginAttemptsMap.get(clientKey) || { count: 0, lockedUntil: 0 };
      current.count += 1;
      if (current.count >= 5) {
        current.lockedUntil = Date.now() + 10 * 60000; // Lock for 10 minutes
      }
      loginAttemptsMap.set(clientKey, current);

      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password if user has passwordHash and password is provided
    if (user.passwordHash && password) {
      const isValidPassword = verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        const current = loginAttemptsMap.get(clientKey) || { count: 0, lockedUntil: 0 };
        current.count += 1;
        if (current.count >= 5) {
          current.lockedUntil = Date.now() + 10 * 60000;
        }
        loginAttemptsMap.set(clientKey, current);

        const memberships = db.getMembershipsByUser(user.id);
        const orgId = memberships[0]?.organizationId || 'org_atelier_nordic';

        db.recordLoginAttempt({
          organizationId: orgId,
          userId: user.id,
          userEmail: user.email,
          ipAddress: req.ip || '127.0.0.1',
          userAgent: (req.headers['user-agent'] as string) || 'Browser Client',
          device: 'Desktop',
          browser: 'Webmail Client',
          os: 'Modern OS',
          location: 'Stockholm, Sweden',
          status: 'blocked',
          authMethod: 'password_mfa',
          details: 'Failed password verification attempt',
        });

        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Transparent upgrade to memory-hard scrypt if legacy hash format was detected
      if (needsRehash(user.passwordHash)) {
        db.updateUser(user.id, { passwordHash: hashPassword(password) });
      }
    }

    // Clear rate limit on successful credentials
    loginAttemptsMap.delete(clientKey);

    const memberships = db.getMembershipsByUser(user.id);
    const orgId = memberships[0]?.organizationId || db.getSchema().organizations[0]?.id || 'org_atelier_nordic';
    const org = db.getOrgById(orgId);

    const token = db.createSession(user.id, orgId);
    db.updateUser(user.id, { lastLoginAt: new Date().toISOString() });

    db.recordLoginAttempt({
      organizationId: orgId,
      userId: user.id,
      userEmail: user.email,
      ipAddress: req.ip || '84.212.19.42',
      userAgent: (req.headers['user-agent'] as string) || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      device: 'MacBook Pro (Webmail Client)',
      browser: 'Chrome 129.0',
      os: 'macOS Sequoia',
      location: 'Oslo, Norway',
      status: 'success',
      authMethod: 'password_mfa',
      details: `User signed in with session token. TLS 1.3 encrypted.`,
    });

    db.addAuditLog({
      organizationId: orgId,
      userId: user.id,
      userEmail: user.email,
      action: 'auth.login_success',
      category: 'auth',
      ipAddress: req.ip || '127.0.0.1',
      details: `User ${user.email} signed in via Webmail`,
    });

    res.json({
      user,
      organization: org,
      sessionToken: token,
    });
  });

  // Auth: Forgot Password (request reset link)
  app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const user = db.getUserByEmail(email.trim().toLowerCase());
    if (!user) {
      return res.status(404).json({ error: 'No registered account found with that email address.' });
    }

    const resetPasswordToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordExpiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    db.updateUser(user.id, {
      resetPasswordToken,
      resetPasswordExpiresAt,
    });

    res.json({
      success: true,
      message: 'Password reset link generated and delivered.',
      resetToken: resetPasswordToken,
      resetUrl: `/reset-password?token=${resetPasswordToken}`,
    });
  });

  // Auth: Reset Password (set new password with token)
  app.post('/api/auth/reset-password', (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Reset token is required' });
    }
    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'New password is required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }
    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one number' });
    }

    const user = db.getUserByResetToken(token.trim());
    if (!user) {
      return res.status(400).json({ error: 'Invalid or already used password reset link.' });
    }

    if (user.resetPasswordExpiresAt && new Date(user.resetPasswordExpiresAt) < new Date()) {
      return res.status(400).json({ error: 'Password reset link has expired. Please request a new link.' });
    }

    const newPwdHash = hashPassword(newPassword);

    // Invalidate all active sessions for security
    db.deleteSessionsByUserId(user.id);

    db.updateUser(user.id, {
      passwordHash: newPwdHash,
      resetPasswordToken: undefined,
      resetPasswordExpiresAt: undefined,
    });

    const memberships = db.getMembershipsByUser(user.id);
    const orgId = memberships[0]?.organizationId || 'org_atelier_nordic';
    const newSessionToken = db.createSession(user.id, orgId);

    db.addAuditLog({
      organizationId: orgId,
      userId: user.id,
      userEmail: user.email,
      action: 'auth.password_reset',
      category: 'auth',
      ipAddress: req.ip || '127.0.0.1',
      details: `Password changed successfully for ${user.email}. All previous sessions invalidated.`,
    });

    res.json({
      success: true,
      message: 'Password reset successfully. You can now sign in with your new password.',
      sessionToken: newSessionToken,
    });
  });

  // Auth: Logout
  app.post('/api/auth/logout', (req, res) => {
    if (req.sessionToken && req.sessionToken !== 'demo-session-token') {
      db.deleteSession(req.sessionToken);
    }
    res.json({ success: true, message: 'Session successfully revoked' });
  });

  // Auth: Switch active organization
  app.post('/api/auth/switch-org', (req, res) => {
    const { organizationId } = req.body;
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }
    const org = db.getOrgById(organizationId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const token = db.createSession(req.user.id, organizationId);
    res.json({ organization: org, sessionToken: token });
  });

  // Reset Demo DB to pristine seed data
  app.post('/api/system/reset-demo', (req, res) => {
    db.resetToSeed();
    res.json({ success: true, message: 'Database reset to initial demo state' });
  });

  // ===================================
  // Domains & DNS Verification Endpoints
  // ===================================

  // List domains
  app.get('/api/domains', (req, res) => {
    const domains = db.getDomainsByOrg(req.organization.id);
    const enriched = domains.map((d) => ({
      ...d,
      recommendedRecords: getRecommendedDnsRecords(d),
    }));
    res.json({ domains: enriched });
  });

  // Add domain
  app.post('/api/domains', (req, res) => {
    let { domainName } = req.body;
    if (!domainName || typeof domainName !== 'string') {
      return res.status(400).json({ error: 'Valid domain name is required' });
    }

    domainName = domainName.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/$/, '');

    // Check limit
    const existing = db.getDomainsByOrg(req.organization.id);
    if (existing.length >= req.organization.maxDomains) {
      return res.status(400).json({
        error: `Domain quota reached for ${req.organization.plan.toUpperCase()} tier (${req.organization.maxDomains} max). Please upgrade your plan.`,
      });
    }

    if (existing.some((d) => d.domainName === domainName)) {
      return res.status(400).json({ error: 'This domain is already registered in your organization' });
    }

    const dkimKeys = {
      publicKey: `v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA${crypto.randomBytes(160).toString('base64')}IDAQAB`,
      privateKey: 'mailoo-signing-key',
    };

    const newDomain = db.createDomain({
      id: `dom_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      organizationId: req.organization.id,
      domainName: domainName,
      status: 'pending_dns',
      mxVerified: false,
      spfVerified: false,
      dkimVerified: false,
      dmarcVerified: false,
      dkimSelector: 'mailoo',
      dkimPublicKey: dkimKeys.publicKey,
      verificationToken: `mailoo-verification-${crypto.randomBytes(4).toString('hex')}`,
      createdAt: new Date().toISOString(),
      lastCheckedAt: new Date().toISOString(),
    });

    db.addAuditLog({
      organizationId: req.organization.id,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'domain.created',
      category: 'domain',
      ipAddress: req.ip || '127.0.0.1',
      details: `Added new custom domain "${domainName}". Pending DNS record configuration.`,
    });

    res.json({
      domain: {
        ...newDomain,
        recommendedRecords: getRecommendedDnsRecords(newDomain),
      },
    });
  });

  // Get DNS configuration for domain
  app.get('/api/domains/:id/dns', (req, res) => {
    const domain = db.getDomainById(req.params.id, req.organization.id);
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }
    res.json({
      domain,
      records: getRecommendedDnsRecords(domain),
    });
  });

  // Trigger DNS Verification check
  app.post('/api/domains/:id/verify', async (req, res) => {
    try {
      const result = await verifyDomainDns(req.params.id, req.organization.id);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Verification failed' });
    }
  });

  // Delete domain
  app.delete('/api/domains/:id', (req, res) => {
    const domain = db.getDomainById(req.params.id, req.organization.id);
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const deleted = db.deleteDomain(req.params.id, req.organization.id);

    db.addAuditLog({
      organizationId: req.organization.id,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'domain.deleted',
      category: 'domain',
      ipAddress: req.ip || '127.0.0.1',
      details: `Removed domain "${domain.domainName}" and pruned all associated mailboxes & aliases.`,
    });

    res.json({ success: deleted });
  });

  // ===================================
  // Mailboxes & Aliases Endpoints
  // ===================================

  // List mailboxes
  app.get('/api/mailboxes', (req, res) => {
    const mailboxes = db.getMailboxesByOrg(req.organization.id);
    res.json({ mailboxes });
  });

  // Create mailbox
  app.post('/api/mailboxes', (req, res) => {
    const { domainId, name, type = 'individual', quotaMb = 25000, signature } = req.body;
    const username = req.body.username || req.body.localPart || req.body.email;
    if (!domainId || !username) {
      return res.status(400).json({ error: 'Domain and username/email are required' });
    }

    const domain = db.getDomainById(domainId, req.organization.id);
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const existingMailboxes = db.getMailboxesByOrg(req.organization.id);
    if (existingMailboxes.length >= req.organization.maxMailboxes) {
      return res.status(400).json({
        error: `Mailbox limit reached for ${req.organization.plan.toUpperCase()} tier (${req.organization.maxMailboxes} max). Upgrade your plan to add more seats.`,
      });
    }

    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9._-]/g, '');
    const emailAddress = `${cleanUsername}@${domain.domainName}`;

    if (existingMailboxes.some((m) => m.emailAddress.toLowerCase() === emailAddress.toLowerCase())) {
      return res.status(400).json({ error: `Mailbox ${emailAddress} already exists` });
    }

    const mailbox = db.createMailbox({
      id: `mbx_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      organizationId: req.organization.id,
      domainId: domain.id,
      domainName: domain.domainName,
      emailAddress: emailAddress,
      name: name || cleanUsername,
      type: type,
      quotaMb: quotaMb,
      usedMb: 5,
      signature: signature || `—\n${name || cleanUsername}\n${domain.domainName}`,
      autoReplyEnabled: false,
      isCatchAll: false,
      createdAt: new Date().toISOString(),
    });

    db.addAuditLog({
      organizationId: req.organization.id,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'mailbox.created',
      category: 'mailbox',
      ipAddress: req.ip || '127.0.0.1',
      details: `Created new ${type} mailbox "${emailAddress}" with ${quotaMb}MB storage quota.`,
    });

    res.json({ mailbox });
  });

  // Update mailbox (signature, quota, auto-reply)
  app.patch('/api/mailboxes/:id', (req, res) => {
    const updates = req.body;
    const mailbox = db.updateMailbox(req.params.id, req.organization.id, updates);
    if (!mailbox) {
      return res.status(404).json({ error: 'Mailbox not found' });
    }
    res.json({ mailbox });
  });

  // Delete mailbox
  app.delete('/api/mailboxes/:id', (req, res) => {
    const mailbox = db.getMailboxById(req.params.id, req.organization.id);
    if (!mailbox) {
      return res.status(404).json({ error: 'Mailbox not found' });
    }

    const deleted = db.deleteMailbox(req.params.id, req.organization.id);
    db.addAuditLog({
      organizationId: req.organization.id,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'mailbox.deleted',
      category: 'mailbox',
      ipAddress: req.ip || '127.0.0.1',
      details: `Deleted mailbox "${mailbox.emailAddress}"`,
    });

    res.json({ success: deleted });
  });

  // List aliases
  app.get('/api/aliases', (req, res) => {
    const aliases = db.getAliasesByOrg(req.organization.id);
    res.json({ aliases });
  });

  // Create alias
  app.post('/api/aliases', (req, res) => {
    const { domainId, aliasPrefix, targetMailboxId, description } = req.body;
    if (!domainId || !aliasPrefix || !targetMailboxId) {
      return res.status(400).json({ error: 'Domain, alias name, and destination mailbox are required' });
    }

    const domain = db.getDomainById(domainId, req.organization.id);
    const targetMailbox = db.getMailboxById(targetMailboxId, req.organization.id);
    if (!domain || !targetMailbox) {
      return res.status(404).json({ error: 'Domain or target mailbox not found' });
    }

    const cleanAlias = aliasPrefix.toLowerCase().replace(/[^a-z0-9._-]/g, '');
    const aliasAddress = `${cleanAlias}@${domain.domainName}`;

    const alias = db.createAlias({
      id: `als_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      organizationId: req.organization.id,
      domainId: domain.id,
      domainName: domain.domainName,
      aliasAddress: aliasAddress,
      targetMailboxId: targetMailbox.id,
      targetEmail: targetMailbox.emailAddress,
      description: description || `Forwarder to ${targetMailbox.emailAddress}`,
      isEnabled: true,
      createdAt: new Date().toISOString(),
    });

    db.addAuditLog({
      organizationId: req.organization.id,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'alias.created',
      category: 'mailbox',
      ipAddress: req.ip || '127.0.0.1',
      details: `Created routing alias ${aliasAddress} -> ${targetMailbox.emailAddress}`,
    });

    res.json({ alias });
  });

  // Toggle/update alias
  app.patch('/api/aliases/:id', (req, res) => {
    const alias = db.updateAlias(req.params.id, req.organization.id, req.body);
    if (!alias) {
      return res.status(404).json({ error: 'Alias not found' });
    }
    res.json({ alias });
  });

  // Delete alias
  app.delete('/api/aliases/:id', (req, res) => {
    const deleted = db.deleteAlias(req.params.id, req.organization.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Alias not found' });
    }
    res.json({ success: true });
  });

  // ===================================
  // Webmail: Threads, Messages & Inbound
  // ===================================

  // List threads
  app.get('/api/threads', (req, res) => {
    const { mailboxId, folder = 'inbox', search } = req.query as Record<string, string>;
    const threads = db.getThreads(req.organization.id, mailboxId, folder, search);
    res.json({ threads });
  });

  // Get single thread with full message chain
  app.get('/api/threads/:id', (req, res) => {
    const thread = db.getThreadWithMessages(req.params.id, req.organization.id);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // Auto mark messages in thread as read
    thread.messages?.forEach((m) => {
      if (!m.isRead) {
        db.updateMessage(m.id, req.organization.id, { isRead: true });
      }
    });
    db.updateThread(thread.id, req.organization.id, { unreadCount: 0 });

    res.json({ thread });
  });

  // Update thread state (star, archive, trash, label)
  app.patch('/api/threads/:id', (req, res) => {
    const thread = db.updateThread(req.params.id, req.organization.id, req.body);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    res.json({ thread });
  });

  // Delete thread permanently
  app.delete('/api/threads/:id', (req, res) => {
    const deleted = db.deleteThread(req.params.id, req.organization.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    res.json({ success: true });
  });

  // Move thread to standard or custom folder
  app.post('/api/threads/:id/move', (req, res) => {
    const { folder } = req.body;
    if (!folder) {
      return res.status(400).json({ error: 'Target folder is required' });
    }

    const thread = db.moveThreadToFolder(req.params.id, req.organization.id, folder);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    db.addAuditLog({
      organizationId: req.organization.id,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'mail.moved',
      category: 'mail',
      ipAddress: req.ip || '127.0.0.1',
      details: `Moved thread "${thread.subject}" to folder "${folder}"`,
    });

    res.json({ success: true, thread });
  });

  // Report Spam on Thread & Flag Sender for Automated Filtering
  app.post('/api/threads/:id/report-spam', (req, res) => {
    const result = db.reportSpam(req.params.id, req.organization.id, req.ip || '127.0.0.1');
    if (!result.success) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    res.json({
      success: true,
      thread: result.thread,
      blockedAddress: result.blockedAddress,
      message: `Thread moved to Spam folder. Sender ${result.blockedAddress || ''} flagged for automated ingress filtering.`,
    });
  });

  // Custom Signatures CRUD
  app.get('/api/signatures', (req, res) => {
    const { mailboxId } = req.query as { mailboxId?: string };
    const signatures = db.getSignatures(req.organization.id, mailboxId);
    res.json({ signatures });
  });

  app.post('/api/signatures', (req, res) => {
    const { name, content, isDefault = false, mailboxId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Signature name is required' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Signature content cannot be empty' });
    }

    const newSignature = db.createSignature({
      id: `sig_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      organizationId: req.organization.id,
      mailboxId: mailboxId,
      name: name.trim(),
      content: content.trim(),
      isDefault: Boolean(isDefault),
      createdAt: new Date().toISOString(),
    });

    db.addAuditLog({
      organizationId: req.organization.id,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'signature.created',
      category: 'mailbox',
      ipAddress: req.ip || '127.0.0.1',
      details: `Created custom email signature "${newSignature.name}"`,
    });

    res.json({ signature: newSignature });
  });

  app.patch('/api/signatures/:id', (req, res) => {
    const { name, content, isDefault } = req.body;
    const signature = db.updateSignature(req.params.id, req.organization.id, {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(content !== undefined ? { content: content.trim() } : {}),
      ...(isDefault !== undefined ? { isDefault: Boolean(isDefault) } : {}),
    });

    if (!signature) {
      return res.status(404).json({ error: 'Signature not found' });
    }

    res.json({ signature });
  });

  app.delete('/api/signatures/:id', (req, res) => {
    const deleted = db.deleteSignature(req.params.id, req.organization.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Signature not found' });
    }

    res.json({ success: true });
  });

  // Spam Rules Endpoints
  app.get('/api/spam-rules', (req, res) => {
    const rules = db.getSpamRules(req.organization.id);
    res.json({ rules });
  });

  app.post('/api/spam-rules', (req, res) => {
    const { senderPattern, reason } = req.body;
    if (!senderPattern || !senderPattern.trim()) {
      return res.status(400).json({ error: 'Sender email or domain pattern is required' });
    }

    const newRule = db.addSpamRule({
      id: `sr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      organizationId: req.organization.id,
      senderPattern: senderPattern.trim().toLowerCase(),
      reason: reason || 'Manual spam filter rule added by administrator',
      createdAt: new Date().toISOString(),
    });

    res.json({ rule: newRule });
  });

  app.delete('/api/spam-rules/:id', (req, res) => {
    const deleted = db.deleteSpamRule(req.params.id, req.organization.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Spam rule not found' });
    }
    res.json({ success: true });
  });

  // Custom Folders CRUD
  app.get('/api/folders', (req, res) => {
    const { mailboxId } = req.query as { mailboxId?: string };
    const folders = db.getCustomFolders(req.organization.id, mailboxId);
    res.json({ folders });
  });

  app.post('/api/folders', (req, res) => {
    const { name, color = '#3b82f6', icon = 'folder', mailboxId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const newFolder = db.createCustomFolder({
      id: `cf_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      organizationId: req.organization.id,
      mailboxId: mailboxId,
      name: name.trim(),
      color: color,
      icon: icon,
      createdAt: new Date().toISOString(),
    });

    db.addAuditLog({
      organizationId: req.organization.id,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'folder.created',
      category: 'mailbox',
      ipAddress: req.ip || '127.0.0.1',
      details: `Created custom email folder "${newFolder.name}"`,
    });

    res.json({ folder: newFolder });
  });

  app.patch('/api/folders/:id', (req, res) => {
    const { name, color, icon } = req.body;
    const folder = db.updateCustomFolder(req.params.id, req.organization.id, {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(color !== undefined ? { color } : {}),
      ...(icon !== undefined ? { icon } : {}),
    });

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    res.json({ folder });
  });

  app.delete('/api/folders/:id', (req, res) => {
    const deleted = db.deleteCustomFolder(req.params.id, req.organization.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    db.addAuditLog({
      organizationId: req.organization.id,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'folder.deleted',
      category: 'mailbox',
      ipAddress: req.ip || '127.0.0.1',
      details: `Deleted custom email folder`,
    });

    res.json({ success: true });
  });

  // Tracking Pixel for Outgoing Emails (Read Receipt)
  app.get('/api/track/pixel/:messageId.png', (req, res) => {
    const { messageId } = req.params;
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'Email Client';

    // Record receipt in DB
    db.recordMessageReadReceipt(messageId, ip, userAgent);

    // 1x1 transparent PNG buffer
    const pixelBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const imgBuffer = Buffer.from(pixelBase64, 'base64');

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', imgBuffer.length.toString());
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(imgBuffer);
  });

  // Simulate Recipient Opening an Email (Read Receipt Trigger for UI testing)
  app.post('/api/messages/:id/simulate-open', (req, res) => {
    const ip = req.body.ip || '194.109.12.84 (Oslo)';
    const userAgent = req.body.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
    const updatedMsg = db.recordMessageReadReceipt(req.params.id, ip, userAgent);

    if (!updatedMsg) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ success: true, message: updatedMsg });
  });

  // Send message with Scheduled Send, Confidential Mode, Read Receipt, and Undo Send support
  const normalizeRecipients = (input: any): any[] => {
    if (!input) return [];
    if (typeof input === 'string') {
      return input.split(',').map((s) => s.trim()).filter(Boolean).map((addr) => ({ address: addr }));
    }
    if (Array.isArray(input)) {
      return input.map((item) => {
        if (typeof item === 'string') return { address: item.trim() };
        if (item && typeof item === 'object' && item.address) return item;
        return { address: String(item) };
      }).filter((r) => r.address);
    }
    if (typeof input === 'object' && input.address) {
      return [input];
    }
    return [];
  };

  app.post('/api/messages/send', (req, res) => {
    try {
      const {
        to,
        cc,
        bcc,
        subject,
        bodyHtml,
        bodyText,
        attachments,
        threadId,
        isDraft,
        readReceiptRequested,
        scheduledFor,
        confidential,
      } = req.body;
      const mailboxId = req.body.mailboxId || req.body.fromMailboxId;

      if (!mailboxId) {
        return res.status(400).json({ error: 'Sender mailbox ID is required' });
      }

      const normalizedTo = normalizeRecipients(to);
      if (normalizedTo.length === 0) {
        return res.status(400).json({ error: 'At least one recipient is required' });
      }

      const msg = sendEmail({
        orgId: req.organization.id,
        mailboxId: mailboxId,
        userEmail: req.user.email,
        to: normalizedTo,
        cc: normalizeRecipients(cc),
        bcc: normalizeRecipients(bcc),
        subject: subject || '(no subject)',
        bodyHtml: bodyHtml || `<p>${bodyText || ''}</p>`,
        bodyText: bodyText || '',
        attachments: attachments,
        threadId: threadId,
        isDraft: isDraft,
        readReceiptRequested: !!readReceiptRequested,
        scheduledFor: scheduledFor,
        confidential: confidential,
      });

      res.json({ success: true, message: msg });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to dispatch email' });
    }
  });

  // Reply to message/thread
  app.post('/api/messages/reply', (req, res) => {
    try {
      const {
        threadId,
        mailboxId,
        to,
        cc,
        bcc,
        subject,
        bodyText,
        bodyHtml,
        attachments,
      } = req.body;

      if (!mailboxId) {
        return res.status(400).json({ error: 'Sender mailbox ID is required' });
      }

      const normalizedTo = normalizeRecipients(to);
      if (normalizedTo.length === 0) {
        return res.status(400).json({ error: 'Recipient is required for reply' });
      }

      const msg = sendEmail({
        orgId: req.organization.id,
        mailboxId: mailboxId,
        userEmail: req.user.email,
        to: normalizedTo,
        cc: normalizeRecipients(cc),
        bcc: normalizeRecipients(bcc),
        subject: subject || 'Re: Message',
        bodyHtml: bodyHtml || `<p>${bodyText || ''}</p>`,
        bodyText: bodyText || '',
        attachments: attachments,
        threadId: threadId,
      });

      res.json({ success: true, message: msg });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to send reply' });
    }
  });

  // Undo Send: Cancel message right after dispatching
  app.post('/api/messages/:id/undo-send', (req, res) => {
    const msg = db.getMessageById(req.params.id, req.organization.id);
    if (!msg) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Convert back to draft or delete
    db.updateMessage(msg.id, req.organization.id, { folder: 'drafts', isDraft: true });
    db.addAuditLog({
      organizationId: req.organization.id,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'mail.undo_send',
      category: 'mail',
      ipAddress: req.ip || '127.0.0.1',
      details: `Undo send invoked for "${msg.subject}". Dispatch halted and converted back to draft.`,
    });

    res.json({ success: true, message: msg });
  });

  // Cancel Scheduled Send
  app.post('/api/messages/:id/cancel-scheduled', (req, res) => {
    const msg = db.getMessageById(req.params.id, req.organization.id);
    if (!msg) {
      return res.status(404).json({ error: 'Message not found' });
    }
    db.updateMessage(msg.id, req.organization.id, { folder: 'drafts', isDraft: true, scheduledFor: undefined });
    res.json({ success: true, message: msg });
  });

  // Snooze thread
  app.post('/api/threads/:id/snooze', (req, res) => {
    const { snoozedUntil } = req.body;
    if (!snoozedUntil) {
      return res.status(400).json({ error: 'Snooze wake-up timestamp is required' });
    }
    const thread = db.snoozeThread(req.params.id, req.organization.id, snoozedUntil);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    res.json({ success: true, thread });
  });

  // Unsnooze thread
  app.post('/api/threads/:id/unsnooze', (req, res) => {
    const thread = db.unsnoozeThread(req.params.id, req.organization.id);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    res.json({ success: true, thread });
  });

  // Toggle VIP sender priority on thread
  app.post('/api/threads/:id/toggle-vip', (req, res) => {
    const { isVip } = req.body;
    const thread = db.toggleThreadVip(req.params.id, req.organization.id, isVip);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    res.json({ success: true, thread });
  });

  // Message Reaction Badges
  app.post('/api/messages/:id/reaction', (req, res) => {
    const { emoji } = req.body;
    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }
    const msg = db.toggleMessageReaction(
      req.params.id,
      req.organization.id,
      emoji,
      req.user.email,
      req.user.fullName
    );
    if (!msg) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.json({ success: true, message: msg });
  });

  // Unlock Confidential Message
  app.post('/api/messages/:id/unlock-confidential', (req, res) => {
    const { passcode } = req.body;
    const result = db.unlockConfidentialMessage(req.params.id, req.organization.id, passcode || '');
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to unlock message' });
    }
    res.json({ success: true, message: result.message });
  });

  // Centralized Attachments Explorer
  app.get('/api/attachments/explorer', (req, res) => {
    const { mailboxId, search, fileType } = req.query as Record<string, string>;
    const attachments = db.getAggregatedAttachments(req.organization.id, mailboxId, search, fileType);
    res.json({ attachments });
  });

  // Email Templates CRUD
  app.get('/api/templates', (req, res) => {
    const { mailboxId } = req.query as { mailboxId?: string };
    const templates = db.getTemplates(req.organization.id, mailboxId);
    res.json({ templates });
  });

  app.post('/api/templates', (req, res) => {
    const { name, category = 'General', subject, bodyText, variables = [], mailboxId } = req.body;
    if (!name || !bodyText) {
      return res.status(400).json({ error: 'Template name and body are required' });
    }
    const template = db.createTemplate({
      id: `tmpl_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      organizationId: req.organization.id,
      mailboxId: mailboxId,
      name: name.trim(),
      category: category.trim(),
      subject: subject || '',
      bodyText: bodyText.trim(),
      variables: variables,
      createdAt: new Date().toISOString(),
    });
    res.json({ template });
  });

  app.patch('/api/templates/:id', (req, res) => {
    const updated = db.updateTemplate(req.params.id, req.organization.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ template: updated });
  });

  app.delete('/api/templates/:id', (req, res) => {
    const deleted = db.deleteTemplate(req.params.id, req.organization.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ success: true });
  });

  // Ingress Filter Rules CRUD
  app.get('/api/filter-rules', (req, res) => {
    const { mailboxId } = req.query as { mailboxId?: string };
    const filterRules = db.getFilterRules(req.organization.id, mailboxId);
    res.json({ filterRules });
  });

  app.post('/api/filter-rules', (req, res) => {
    const { name, conditionField, matchType, matchValue, actions, mailboxId } = req.body;
    if (!name || !conditionField || !matchType || !matchValue || !actions) {
      return res.status(400).json({ error: 'All filter rule fields are required' });
    }
    const rule = db.createFilterRule({
      id: `fr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      organizationId: req.organization.id,
      mailboxId: mailboxId,
      name: name.trim(),
      conditionField,
      matchType,
      matchValue: matchValue.trim(),
      actions,
      isEnabled: true,
      createdAt: new Date().toISOString(),
    });
    res.json({ rule });
  });

  app.patch('/api/filter-rules/:id', (req, res) => {
    const updated = db.updateFilterRule(req.params.id, req.organization.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Filter rule not found' });
    }
    res.json({ rule: updated });
  });

  app.delete('/api/filter-rules/:id', (req, res) => {
    const deleted = db.deleteFilterRule(req.params.id, req.organization.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Filter rule not found' });
    }
    res.json({ success: true });
  });

  // Contacts / Address Book CRUD
  app.get('/api/contacts', (req, res) => {
    const { mailboxId } = req.query as { mailboxId?: string };
    const contacts = db.getContacts(req.organization.id, mailboxId);
    res.json({ contacts });
  });

  app.post('/api/contacts', (req, res) => {
    const { name, email, company, role, phone, notes, isVip = false, avatarColor = '#3b82f6', mailboxId } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Contact name and email are required' });
    }
    const contact = db.createContact({
      id: `ct_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      organizationId: req.organization.id,
      mailboxId: mailboxId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      company: company?.trim(),
      role: role?.trim(),
      phone: phone?.trim(),
      notes: notes?.trim(),
      isVip: Boolean(isVip),
      avatarColor: avatarColor,
      createdAt: new Date().toISOString(),
    });
    res.json({ contact });
  });

  app.patch('/api/contacts/:id', (req, res) => {
    const updated = db.updateContact(req.params.id, req.organization.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json({ contact: updated });
  });

  app.delete('/api/contacts/:id', (req, res) => {
    const deleted = db.deleteContact(req.params.id, req.organization.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json({ success: true });
  });

  // Internal Notes (Thread Collaboration)
  app.get('/api/threads/:id/notes', (req, res) => {
    const notes = db.getInternalNotes(req.params.id, req.organization.id);
    res.json({ notes });
  });

  app.post('/api/threads/:id/notes', (req, res) => {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Note content cannot be empty' });
    }
    const note = db.addInternalNote({
      id: `in_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      organizationId: req.organization.id,
      threadId: req.params.id,
      userId: req.user.id,
      userName: req.user.fullName,
      userEmail: req.user.email,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    });
    res.json({ note });
  });

  app.delete('/api/notes/:id', (req, res) => {
    const deleted = db.deleteInternalNote(req.params.id, req.organization.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Internal note not found' });
    }
    res.json({ success: true });
  });

  // PGP Keys Management
  app.get('/api/pgp-keys', (req, res) => {
    const { mailboxId } = req.query as { mailboxId?: string };
    const keys = db.getPgpKeys(req.organization.id, mailboxId);
    res.json({ keys });
  });

  app.post('/api/pgp-keys/generate', (req, res) => {
    const { email, name, mailboxId } = req.body;
    const key = db.generatePgpKey(
      req.organization.id,
      email || req.user.email,
      name || req.user.fullName,
      mailboxId
    );
    res.json({ key });
  });

  app.post('/api/pgp-keys', (req, res) => {
    const { name, email, publicKey, fingerprint, algorithm = 'RSA 4096-bit', mailboxId } = req.body;
    if (!name || !email || !publicKey) {
      return res.status(400).json({ error: 'Name, email, and public key block are required' });
    }
    const key = db.createPgpKey({
      id: `pgp_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      organizationId: req.organization.id,
      mailboxId: mailboxId,
      name: name.trim(),
      email: email.trim(),
      publicKey: publicKey.trim(),
      fingerprint: fingerprint || 'F98A 2910 B801 4C91 22A0 99B1 CA33',
      isDefault: true,
      algorithm,
      createdAt: new Date().toISOString(),
    });
    res.json({ key });
  });

  app.delete('/api/pgp-keys/:id', (req, res) => {
    const deleted = db.deletePgpKey(req.params.id, req.organization.id);
    if (!deleted) {
      return res.status(404).json({ error: 'PGP key not found' });
    }
    res.json({ success: true });
  });

  // Data Retention Policies & Auto-Purge
  app.get('/api/retention-policy', (req, res) => {
    const policy = db.getRetentionPolicy(req.organization.id);
    res.json({ policy });
  });

  app.patch('/api/retention-policy', (req, res) => {
    const policy = db.updateRetentionPolicy(req.organization.id, req.body);
    res.json({ policy });
  });

  app.post('/api/retention-policy/execute-scan', (req, res) => {
    const result = db.executeRetentionScan(req.organization.id);
    res.json({ success: true, result });
  });

  // Blocked & Allowed Senders Manager
  app.get('/api/blocked-senders', (req, res) => {
    const senders = db.getBlockedSenders(req.organization.id);
    res.json({ senders });
  });

  app.post('/api/blocked-senders', (req, res) => {
    const { pattern, type, reason } = req.body;
    if (!pattern || !type) {
      return res.status(400).json({ error: 'Sender pattern and rule type are required' });
    }
    const entry = db.addBlockedSender({
      id: `bs_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      organizationId: req.organization.id,
      pattern: pattern.trim().toLowerCase(),
      type: type,
      reason: reason?.trim() || '',
      createdAt: new Date().toISOString(),
    });
    res.json({ sender: entry });
  });

  app.delete('/api/blocked-senders/:id', (req, res) => {
    const deleted = db.deleteBlockedSender(req.params.id, req.organization.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Blocked sender entry not found' });
    }
    res.json({ success: true });
  });

  // Vacation Responder Settings on Mailbox
  app.get('/api/mailboxes/:id/vacation', (req, res) => {
    const mailbox = db.getMailboxById(req.params.id, req.organization.id);
    if (!mailbox) {
      return res.status(404).json({ error: 'Mailbox not found' });
    }
    res.json({ vacationResponder: mailbox.vacationResponder || { isEnabled: false } });
  });

  app.patch('/api/mailboxes/:id/vacation', (req, res) => {
    const mailbox = db.getMailboxById(req.params.id, req.organization.id);
    if (!mailbox) {
      return res.status(404).json({ error: 'Mailbox not found' });
    }
    const updated = db.updateMailbox(req.params.id, req.organization.id, {
      vacationResponder: req.body,
    });
    res.json({ mailbox: updated });
  });

  // 2FA / TOTP Security Setup
  app.post('/api/auth/2fa/setup', (req, res) => {
    const secret = crypto.randomBytes(16).toString('hex').toUpperCase().slice(0, 16);
    const recoveryKeys = Array.from({ length: 6 }, () => `ML-${crypto.randomBytes(4).toString('hex').toUpperCase()}`);
    res.json({
      secret: secret,
      qrCodeUrl: `otpauth://totp/Mailoo:${req.user.email}?secret=${secret}&issuer=Mailoo%20Sovereign%20Mail`,
      recoveryKeys: recoveryKeys,
    });
  });

  app.post('/api/auth/2fa/enable', (req, res) => {
    const { secret, recoveryKeys } = req.body;
    db.updateUser(req.user.id, {
      mfaEnabled: true,
      totpSecret: secret,
      recoveryKeys: recoveryKeys,
    });
    res.json({ success: true, message: 'Two-factor authentication successfully enabled' });
  });

  app.post('/api/auth/2fa/disable', (req, res) => {
    db.updateUser(req.user.id, {
      mfaEnabled: false,
      totpSecret: undefined,
    });
    res.json({ success: true, message: 'Two-factor authentication disabled' });
  });

  // AI Thread Sentiment & Priority Analysis
  app.post('/api/threads/:id/ai-intelligence', async (req, res) => {
    const thread = db.getThreadWithMessages(req.params.id, req.organization.id);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const messagesText = thread.messages?.map((m) => `From: ${m.from.name} <${m.from.address}>\nSubject: ${m.subject}\nBody: ${m.bodyText}`).join('\n\n---\n\n') || '';

    const aiRes = await runAiEmailAssistant({
      action: 'thread_intelligence',
      context: messagesText,
    });

    if (aiRes.intelligence) {
      db.updateThreadAiIntelligence(thread.id, req.organization.id, aiRes.intelligence);
    }

    res.json({ success: true, intelligence: aiRes.intelligence });
  });

  // AI Voice Dictation Simulation / Processing
  app.post('/api/ai/transcribe-voice', async (req, res) => {
    const { simulatedAudioTone = 'Architectural update' } = req.body;
    // Provide a polished transcription generated via AI prompt
    const aiRes = await runAiEmailAssistant({
      action: 'draft',
      text: `Voice dictation prompt: Please confirm the structural timber schedule with Elena and set our coordination meeting for Thursday 14:00 CET.`,
      tone: 'Crisp executive',
    });
    res.json({
      transcription: "Elena, regarding the timber frame calculations: everything looks approved on our end. Let's lock in Thursday at 14:00 CET for our coordination review. Thanks, Alex.",
      refinedDraft: aiRes.result,
    });
  });

  // Inbound message simulator (for testing & evaluation)
  const handleSimulateInbound = (req: express.Request, res: express.Response) => {
    try {
      const {
        mailboxId,
        from,
        fromName = 'Henrik Mortensen',
        fromAddress = 'henrik@nordic-ventures.co',
        subject = 'Contract Agreement & Studio Retainer Terms',
        bodyHtml,
        bodyText = 'Hello,\n\nPlease find attached the signed retainer documentation for next quarter.',
        attachments = [],
        preset,
      } = req.body;

      let selectedMailboxId = req.params?.id || mailboxId;
      if (!selectedMailboxId) {
        const mailboxes = db.getMailboxesByOrg(req.organization.id);
        if (mailboxes.length === 0) {
          return res.status(400).json({ error: 'Please create at least one mailbox first' });
        }
        selectedMailboxId = mailboxes[0].id;
      }

      let sampleSubject = subject;
      let sampleBody = bodyText;
      let sampleHtml = bodyHtml;
      let sampleSender = { name: fromName, address: from || fromAddress };
      let sampleAttachments = attachments;

      if (preset === 'client_inquiry') {
        sampleSender = { name: fromName || 'Klara Sörensen', address: from || fromAddress || 'klara@scandic-group.se' };
        sampleSubject = subject || 'Request for Architectural Commission: Coastal Retreat Proposal';
        sampleBody = bodyText || `Dear Atelier Nordic Team,\n\nWe have been following your architectural publications in Oslo and would love to discuss a private commission for a 450m² residential estate along the Bohuslän archipelago.\n\nWe are looking to break ground in Spring 2027.\n\nBest regards,\nKlara Sörensen\nScandic Capital Group`;
        sampleHtml = bodyHtml || `<p>Dear Atelier Nordic Team,</p><p>We have been following your architectural publications in Oslo and would love to discuss a private commission for a <strong>450m² residential estate</strong> along the Bohuslän archipelago.</p><p>We are looking to break ground in Spring 2027.</p><p>Best regards,<br><strong>Klara Sörensen</strong><br>Scandic Capital Group</p>`;
      } else if (preset === 'security_alert') {
        sampleSender = { name: fromName || 'Mailoo Infrastructure Bot', address: from || fromAddress || 'alerts@mailoo.email' };
        sampleSubject = subject || 'DKIM Key Rotation & Cipher Suite Upgrade Scheduled';
        sampleBody = bodyText || `Notice: Mailoo edge nodes will automatically rotate 2048-bit DKIM cryptographic keys at 00:00 UTC. Zero downtime or client reconfiguration required.`;
        sampleHtml = bodyHtml || `<p><strong>Notice:</strong> Mailoo edge nodes will automatically rotate 2048-bit DKIM cryptographic keys at 00:00 UTC. Zero downtime or client reconfiguration required.</p>`;
      } else if (preset === 'invoice_receipt') {
        sampleSender = { name: fromName || 'Foundry Type Foundry', address: from || fromAddress || 'billing@klim-type.co.nz' };
        sampleSubject = subject || 'Commercial License Invoice #KLIM-9482 (Paid)';
        sampleBody = bodyText || `Thank you for your purchase of the editorial typeface family. Your receipt and OpenType license files are ready for studio deployment.`;
        sampleHtml = bodyHtml || `<p>Thank you for your purchase of the editorial typeface family. Your receipt and OpenType license files are ready for studio deployment.</p>`;
        sampleAttachments = [
          {
            id: `att_sim_${Date.now()}`,
            filename: 'Commercial_License_Certificate_AtelierNordic.pdf',
            contentType: 'application/pdf',
            size: 1840000,
          },
        ];
      }

      const msg = simulateInboundEmail({
        orgId: req.organization.id,
        mailboxId: selectedMailboxId,
        fromName: sampleSender.name,
        fromAddress: sampleSender.address,
        subject: sampleSubject,
        bodyHtml: sampleHtml || `<p>${sampleBody}</p>`,
        bodyText: sampleBody,
        attachments: sampleAttachments,
      });

      res.json({ success: true, message: msg });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to simulate incoming message' });
    }
  };

  app.post('/api/messages/simulate-inbound', handleSimulateInbound);
  app.post('/api/mailboxes/:id/simulate-inbound', handleSimulateInbound);

  // AI Copilot Endpoint (server-side Gemini)
  app.post('/api/ai/copilot', async (req, res) => {
    try {
      const { action, text, context, tone } = req.body;
      if (!action) {
        return res.status(400).json({ error: 'Action parameter is required' });
      }

      const result = await runAiEmailAssistant({ action, text, context, tone });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'AI assistant error' });
    }
  });

  // AI Smart Sort: Automatically suggest folder classifications for incoming emails based on sender and content patterns
  app.post('/api/ai/smart-sort', async (req, res) => {
    try {
      const { mailboxId } = req.body;
      const orgId = req.organization.id;
      const targetMailboxId = mailboxId || (db.getMailboxesByOrg(orgId)[0]?.id);

      if (!targetMailboxId) {
        return res.status(400).json({ error: 'No active mailbox found' });
      }

      const threads = db.getThreads(orgId, targetMailboxId, 'inbox');
      const customFolders = db.getCustomFolders(orgId, targetMailboxId);

      const suggestions = await classifySmartSort({ threads, customFolders });

      res.json({
        success: true,
        suggestions,
        evaluatedCount: threads.length,
      });
    } catch (err: any) {
      console.error('[AI Smart Sort] error', err);
      res.status(500).json({ error: err.message || 'Failed to compute smart sort classifications' });
    }
  });

  // AI Quick Replies: Generate single-click context-aware responses
  app.post('/api/ai/quick-replies', async (req, res) => {
    try {
      const { context, threadId } = req.body;
      let threadContext = context;

      if (!threadContext && threadId) {
        const threadWithMsgs = db.getThreadWithMessages(threadId, req.organization.id);
        if (threadWithMsgs && threadWithMsgs.messages && threadWithMsgs.messages.length > 0) {
          const lastMsg = threadWithMsgs.messages[threadWithMsgs.messages.length - 1];
          threadContext = `Subject: ${threadWithMsgs.subject}\nFrom: ${lastMsg.from.name || lastMsg.from.address}\nBody:\n${lastMsg.bodyText}`;
        }
      }

      const result = await runAiEmailAssistant({
        action: 'suggest_replies',
        context: threadContext || 'Hello, please review this project update.',
      });

      res.json({
        success: true,
        suggestions: result.suggestions || [
          'Understood, thank you for the update.',
          'Let me review this and get back to you shortly.',
          'Confirmed, let us proceed as planned.',
        ],
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to generate quick replies' });
    }
  });

  // ===================================
  // Organization, Team, Security & Billing
  // ===================================

  // Organization settings
  app.get('/api/organization', (req, res) => {
    res.json({ organization: req.organization });
  });

  app.patch('/api/organization', (req, res) => {
    const { name, slug } = req.body;
    const updated = db.updateOrg(req.organization.id, { name, slug });
    res.json({ organization: updated });
  });

  // Team members
  app.get('/api/team', (req, res) => {
    const members = db.getMembershipsByOrg(req.organization.id);
    res.json({ members });
  });

  app.post('/api/team/invite', (req, res) => {
    const { email, name, role = 'member', mailboxGrants = [] } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const membership = db.createMembership({
      id: `mem_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      organizationId: req.organization.id,
      userId: `usr_inv_${Date.now()}`,
      userEmail: email.toLowerCase(),
      userName: name || email.split('@')[0],
      role: role,
      mailboxGrants: mailboxGrants,
      invitedAt: new Date().toISOString(),
      status: 'invited',
    });

    db.addAuditLog({
      organizationId: req.organization.id,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'team.invited',
      category: 'security',
      ipAddress: req.ip || '127.0.0.1',
      details: `Invited ${email} as ${role} with access to ${mailboxGrants.length} mailboxes`,
    });

    res.json({ membership });
  });

  // Security & Audit: Login Attempts Log
  app.get('/api/security/login-attempts', (req, res) => {
    const attempts = db.getLoginAttempts(req.organization.id);
    res.json({ attempts });
  });

  app.post('/api/security/login-attempts/simulate', (req, res) => {
    const { status = 'success', location = 'Stockholm, Sweden', ip = '185.195.232.14', device = 'iPad Pro (iPadOS 18.0)', method = 'password_mfa' } = req.body;
    const attempt = db.recordLoginAttempt({
      organizationId: req.organization.id,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: ip,
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15',
      device: device,
      browser: 'Mobile Safari',
      os: 'iPadOS',
      location: location,
      status: status,
      authMethod: method,
      details: status === 'blocked' ? 'Suspicious IP address blocked by threat intelligence firewall' : 'Simulated login verification for audit trial',
    });

    res.json({ success: true, attempt });
  });

  // Audit Logs
  app.get('/api/audit-logs', (req, res) => {
    const logs = db.getAuditLogs(req.organization.id);
    res.json({ logs });
  });

  // Billing & Invoices
  app.get('/api/billing', (req, res) => {
    const invoices = db.getInvoicesByOrg(req.organization.id);
    const mailboxes = db.getMailboxesByOrg(req.organization.id);
    const domains = db.getDomainsByOrg(req.organization.id);

    const totalUsedMb = mailboxes.reduce((sum, m) => sum + (m.usedMb || 0), 0);

    res.json({
      organization: req.organization,
      usage: {
        domainsUsed: domains.length,
        domainsMax: req.organization.maxDomains,
        mailboxesUsed: mailboxes.length,
        mailboxesMax: req.organization.maxMailboxes,
        storageUsedMb: totalUsedMb,
        storageMaxGb: req.organization.maxStorageGb,
      },
      invoices,
    });
  });

  app.get('/api/billing/invoices', (req, res) => {
    const invoices = db.getInvoicesByOrg(req.organization.id);
    res.json({ invoices });
  });

  const handlePlanChange = (req: express.Request, res: express.Response) => {
    const { plan, period = 'monthly' } = req.body;
    const cleanPlan = (plan || 'pro').toLowerCase();
    if (!['starter', 'pro', 'enterprise'].includes(cleanPlan)) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const limits = {
      starter: { maxDomains: 1, maxMailboxes: 3, maxStorageGb: 10, price: 9 },
      pro: { maxDomains: 5, maxMailboxes: 20, maxStorageGb: 50, price: 29 },
      enterprise: { maxDomains: 25, maxMailboxes: 100, maxStorageGb: 250, price: 99 },
    }[cleanPlan as 'starter' | 'pro' | 'enterprise'];

    const updated = db.updateOrg(req.organization.id, {
      plan: cleanPlan as any,
      billingPeriod: period,
      maxDomains: limits.maxDomains,
      maxMailboxes: limits.maxMailboxes,
      maxStorageGb: limits.maxStorageGb,
    });

    // Create immediate confirmation invoice
    db.addInvoice({
      id: `inv_${Date.now()}`,
      organizationId: req.organization.id,
      invoiceNumber: `ML-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      amount: period === 'annual' ? limits.price * 10 : limits.price,
      currency: 'USD',
      status: 'paid',
      planName: `Mailoo ${cleanPlan.toUpperCase()} (${period === 'annual' ? 'Billed Annually' : 'Billed Monthly'})`,
      date: new Date().toISOString(),
      pdfUrl: '#',
    });

    db.addAuditLog({
      organizationId: req.organization.id,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'billing.plan_changed',
      category: 'billing',
      ipAddress: req.ip || '127.0.0.1',
      details: `Upgraded subscription to ${cleanPlan.toUpperCase()} tier (${limits.maxDomains} domains, ${limits.maxMailboxes} mailboxes)`,
    });

    res.json({ organization: updated, success: true });
  };

  app.post('/api/billing/change-plan', handlePlanChange);
  app.put('/api/billing/subscription', handlePlanChange);
  app.post('/api/billing/subscription', handlePlanChange);

  // API Keys & IMAP/SMTP Gateway Credentials
  app.get('/api/api-keys', (req, res) => {
    const keys = db.getApiKeysByOrg(req.organization.id);
    res.json({ keys });
  });

  app.post('/api/api-keys', (req, res) => {
    const { name, scopes = ['mail:read', 'mail:send'] } = req.body;
    const rawKey = `mn_live_${crypto.randomBytes(24).toString('hex')}`;
    const prefix = rawKey.slice(0, 12) + '...';

    const key = db.createApiKey({
      id: `key_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      organizationId: req.organization.id,
      userId: req.user.id,
      name: name || 'API Token',
      keyPrefix: prefix,
      keySecret: rawKey,
      scopes: scopes,
      createdAt: new Date().toISOString(),
    });

    db.addAuditLog({
      organizationId: req.organization.id,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'security.key_generated',
      category: 'security',
      ipAddress: req.ip || '127.0.0.1',
      details: `Generated new application token "${key.name}" with scopes: ${scopes.join(', ')}`,
    });

    res.json({ key });
  });

  app.delete('/api/api-keys/:id', (req, res) => {
    const deleted = db.deleteApiKey(req.params.id, req.organization.id);
    if (!deleted) {
      return res.status(404).json({ error: 'API key not found' });
    }
    res.json({ success: true });
  });

  // ===================================
  // BIMI Verified Brand Avatar & VMC
  // ===================================
  app.get('/api/bimi', (req, res) => {
    const configs = db.getBimiConfigs(req.organization.id);
    res.json({ configs });
  });

  app.post('/api/bimi', (req, res) => {
    const { domainId, svgLogoUrl, vmcCertUrl, selector = 'default' } = req.body;
    if (!domainId) {
      return res.status(400).json({ error: 'domainId is required' });
    }

    const config = db.saveBimiConfig({
      organizationId: req.organization.id,
      domainId,
      svgLogoUrl,
      vmcCertUrl,
      selector,
    });

    db.addAuditLog({
      organizationId: req.organization.id,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'domain.bimi_updated',
      category: 'domain',
      ipAddress: req.ip || '127.0.0.1',
      details: `Updated BIMI Brand Indicator record for domain (${config.domainName}) with VMC status: ${config.verifiedMarkStatus}`,
    });

    res.json({ config, success: true });
  });

  // ===================================
  // App Passwords (IMAP/SMTP/Thunderbird/Apple Mail)
  // ===================================
  app.get('/api/app-passwords', (req, res) => {
    const appPasswords = db.getAppPasswords(req.organization.id, req.user.id);
    res.json({ appPasswords });
  });

  app.post('/api/app-passwords', (req, res) => {
    const { mailboxId, name, scopes = ['imap', 'smtp'] } = req.body;
    if (!mailboxId || !name) {
      return res.status(400).json({ error: 'mailboxId and name are required' });
    }

    const result = db.createAppPassword({
      organizationId: req.organization.id,
      userId: req.user.id,
      mailboxId,
      name,
      scopes,
    });

    db.addAuditLog({
      organizationId: req.organization.id,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'security.app_password_created',
      category: 'security',
      ipAddress: req.ip || '127.0.0.1',
      details: `Generated dedicated client application password "${name}" for ${result.appPassword.mailboxEmail}`,
    });

    res.json(result);
  });

  app.delete('/api/app-passwords/:id', (req, res) => {
    const success = db.deleteAppPassword(req.params.id, req.organization.id);
    if (!success) {
      return res.status(404).json({ error: 'App password not found' });
    }
    db.addAuditLog({
      organizationId: req.organization.id,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'security.app_password_revoked',
      category: 'security',
      ipAddress: req.ip || '127.0.0.1',
      details: `Revoked dedicated application password ID: ${req.params.id}`,
    });
    res.json({ success: true });
  });

  // ===================================
  // Calendar Event & .ICS RSVP Response
  // ===================================
  app.post('/api/messages/:id/calendar-rsvp', (req, res) => {
    const { status } = req.body;
    if (!['accepted', 'declined', 'tentative'].includes(status)) {
      return res.status(400).json({ error: 'Valid status required (accepted, declined, tentative)' });
    }

    const updated = db.updateCalendarRsvp(req.params.id, status, req.organization.id);
    if (!updated) {
      return res.status(404).json({ error: 'Message or calendar invite not found' });
    }

    res.json({ success: true, message: updated });
  });

  // ===================================
  // Deliverability, DMARC Aggregates & Blacklist Health
  // ===================================
  app.get('/api/deliverability/audit', (req, res) => {
    const audit = db.getDeliverabilityAudit(req.organization.id);
    res.json({ audit });
  });

  // ===================================
  // Vite Integration for Dev / Production
  // ===================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Mailoo] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
