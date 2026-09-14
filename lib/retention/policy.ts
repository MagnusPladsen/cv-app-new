/**
 * The retention schedule, mirrored from the migration that enforces it.
 *
 * The intervals live in SQL, because that is where the deletion happens. These
 * exist so the warning email can state the same numbers, and
 * `__tests__/policy.test.ts` reads the migration to prove the two agree - a
 * warning that promises 30 days while the job deletes after 7 would be worse
 * than no warning.
 */
export const INACTIVE_MONTHS = 24
export const GRACE_DAYS = 30

/** How many accounts one run will warn. Matches the LIMIT in retention_due. */
export const BATCH_SIZE = 200
