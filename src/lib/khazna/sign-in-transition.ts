// One-shot flag set by the login page right before navigating, so the next AppShell
// mount plays the "arrival" reveal. Client-only module state: SSR always sees false.
let pending = false;

export function markSignInTransition() {
  pending = true;
}
export function isSignInTransitionPending() {
  return pending;
}
export function clearSignInTransition() {
  pending = false;
}
