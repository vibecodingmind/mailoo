import type { ApiKey, AppPassword, User } from '../types.js';

const USER_SECRET_KEYS = [
  'passwordHash',
  'totpSecret',
  'recoveryKeys',
  'verificationToken',
  'verificationTokenExpiresAt',
  'resetPasswordToken',
  'resetPasswordExpiresAt',
] as const;

export function publicUser<T extends Partial<User>>(user: T): T {
  const copy = { ...user };
  for (const key of USER_SECRET_KEYS) {
    delete (copy as Partial<User>)[key];
  }
  return copy;
}

export function publicApiKey(key: ApiKey): ApiKey {
  const { keySecret: _secret, ...rest } = key;
  return rest;
}

export function publicAppPassword(pwd: AppPassword): AppPassword {
  const { passwordSecret: _secret, ...rest } = pwd;
  return rest;
}
