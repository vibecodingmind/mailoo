export type PublicRoute = 'status' | 'privacy' | 'terms' | 'dpa' | 'subprocessors' | 'trust';

export const PUBLIC_ROUTES: PublicRoute[] = [
  'status',
  'privacy',
  'terms',
  'dpa',
  'subprocessors',
  'trust',
];

export function publicRouteFromHash(): PublicRoute | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (!hash.startsWith('#/')) return null;
  const raw = hash.replace(/^#\//, '').split('?')[0].trim();
  if ((PUBLIC_ROUTES as string[]).includes(raw)) return raw as PublicRoute;
  return null;
}

export function hashForPublicRoute(route: PublicRoute): string {
  return `#/${route}`;
}
