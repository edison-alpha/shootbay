/**
 * Haptic Feedback Utility — Native-like vibration for mobile PWA.
 * Uses the Vibration API where supported, gracefully degrades on unsupported devices.
 */

const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

/** Light tap (button press, toggle, navigation) */
export function hapticLight(): void {
  if (canVibrate) navigator.vibrate(8);
}

/** Medium tap (important action, confirmation) */
export function hapticMedium(): void {
  if (canVibrate) navigator.vibrate(15);
}

/** Heavy tap (error, warning, destructive action) */
export function hapticHeavy(): void {
  if (canVibrate) navigator.vibrate(30);
}

/** Success pattern (reward claimed, level complete) */
export function hapticSuccess(): void {
  if (canVibrate) navigator.vibrate([10, 50, 10, 50, 15]);
}

/** Error pattern (failed action, invalid input) */
export function hapticError(): void {
  if (canVibrate) navigator.vibrate([30, 80, 30]);
}

/** Selection change (swipe, picker change) */
export function hapticSelection(): void {
  if (canVibrate) navigator.vibrate(5);
}

/** Notification pulse (new item received, realtime update) */
export function hapticNotification(): void {
  if (canVibrate) navigator.vibrate([8, 40, 8]);
}
