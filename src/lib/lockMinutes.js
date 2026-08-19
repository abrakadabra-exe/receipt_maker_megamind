export const LOCK_MIN_KEY = 'mb_lock_minutes'

export function getLockMinutes() {
  const v = Number(localStorage.getItem(LOCK_MIN_KEY))
  return Number.isFinite(v) && v >= 0 ? v : 15
}

export function setLockMinutes(n) {
  localStorage.setItem(LOCK_MIN_KEY, String(n))
}