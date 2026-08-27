import assert from 'node:assert/strict';
import { publicUser, publicApiKey, publicAppPassword } from '../src/server/sanitize.ts';

const FIXTURE = Buffer.from('Zml4dHVyZS12YWx1ZQ==', 'base64').toString('utf8');

function testSanitize() {
  const leaked = publicUser({
    id: 'usr_1',
    email: 'owner@example.com',
    fullName: 'Owner',
    role: 'owner' as const,
    mfaEnabled: true,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    passwordHash: FIXTURE,
    totpSecret: FIXTURE,
    recoveryKeys: [FIXTURE],
    verificationToken: FIXTURE,
    resetPasswordToken: FIXTURE,
  });

  assert.equal(leaked.email, 'owner@example.com');
  assert.equal('passwordHash' in leaked, false);
  assert.equal('totpSecret' in leaked, false);
  assert.equal('recoveryKeys' in leaked, false);
  assert.equal('verificationToken' in leaked, false);
  assert.equal('resetPasswordToken' in leaked, false);

  const key = publicApiKey({
    id: 'key_1',
    organizationId: 'org_1',
    userId: 'usr_1',
    name: 'CLI',
    keyPrefix: 'mn_live_abc...',
    keySecret: FIXTURE,
    scopes: ['mail:read'],
    createdAt: new Date().toISOString(),
  });
  assert.equal('keySecret' in key, false);

  const pwd = publicAppPassword({
    id: 'ap_1',
    organizationId: 'org_1',
    userId: 'usr_1',
    mailboxId: 'mbx_1',
    mailboxEmail: 'a@example.com',
    name: 'Thunderbird',
    passwordPrefix: `${FIXTURE.slice(0, 6)}...`,
    passwordSecret: FIXTURE,
    scopes: ['imap', 'smtp'],
    createdAt: new Date().toISOString(),
  });
  assert.equal('passwordSecret' in pwd, false);
  console.log('sanitize: ok');
}

async function testHttp() {
  const port = process.env.PORT || '3000';
  const base = `http://127.0.0.1:${port}`;
  let health: Response;
  try {
    health = await fetch(`${base}/api/health`);
  } catch {
    console.log('http: skipped (server not running)');
    return;
  }

  assert.equal(health.ok, true);
  const me = await fetch(`${base}/api/auth/me`);
  assert.equal(me.status, 401);

  const robots = await fetch(`${base}/robots.txt`);
  assert.equal(robots.ok, true);
  assert.match(await robots.text(), /Disallow: \/api\//);

  const securityTxt = await fetch(`${base}/.well-known/security.txt`);
  assert.equal(securityTxt.ok, true);
  assert.match(await securityTxt.text(), /security@mailoo.email/);

  const status = await fetch(`${base}/api/status`);
  assert.equal(status.ok, true);
  const statusJson = await status.json();
  assert.ok(Array.isArray(statusJson.checks));
  assert.ok(statusJson.checks.some((c: { id: string }) => c.id === 'mx'));

  const demo = await fetch(`${base}/api/auth/demo`, { method: 'POST' });
  assert.equal(demo.ok, true);
  const demoJson = await demo.json();
  assert.equal(demoJson.user.email, 'alex.vance@atelier-nordic.com');
  assert.equal('passwordHash' in demoJson.user, false);
  assert.equal('totpSecret' in demoJson.user, false);
  assert.ok(demoJson.sessionToken);

  const authed = await fetch(`${base}/api/auth/me`, {
    headers: { Authorization: `Bearer ${demoJson.sessionToken}` },
  });
  assert.equal(authed.ok, true);
  const meJson = await authed.json();
  assert.equal('passwordHash' in meJson.user, false);

  const exported = await fetch(`${base}/api/account/export`, {
    headers: { Authorization: `Bearer ${demoJson.sessionToken}` },
  });
  assert.equal(exported.ok, true);
  const dump = await exported.json();
  assert.equal(dump.organization.id, 'org_atelier_nordic');
  assert.ok(Array.isArray(dump.users));
  assert.equal(dump.users.some((u: { passwordHash?: string }) => u.passwordHash), false);

  const blocked = await fetch(`${base}/api/account`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${demoJson.sessionToken}` },
  });
  assert.equal(blocked.status, 403);

  console.log('http: ok');
}

testSanitize();
await testHttp();
