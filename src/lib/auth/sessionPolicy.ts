export const ABSOLUTE_SESSION_LIFETIME_MS = 12 * 60 * 60 * 1000;
export const INACTIVITY_TIMEOUT_MS = 6 * 60 * 60 * 1000;
export const SESSION_CHECK_INTERVAL_MS = 60 * 1000;
export const ACTIVITY_PING_THROTTLE_MS = 60 * 1000;

export const SESSION_ACTIVITY_COOKIE = "bookit_last_activity";
export const SESSION_ACTIVITY_STORAGE_KEY = "bookit:last-activity";
export const SESSION_ACTIVITY_PING_STORAGE_KEY = "bookit:last-activity-ping";

export const SESSION_ACTIVITY_COOKIE_MAX_AGE_SECONDS =
  Math.floor(ABSOLUTE_SESSION_LIFETIME_MS / 1000);

export type SessionExpiryReason = "absolute" | "inactive";
