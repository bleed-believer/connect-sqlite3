import 'express-session';

/**
 * Backfills the `partitioned` and `priority` cookie attributes on
 * {@link Cookie}, which `@types/express-session` omits from the class even
 * though `CookieOptions` (and the real runtime `Cookie` implementation)
 * both support them.
 *
 * `SessionData` itself is deliberately left untouched here: every
 * top-level property set on it (besides `cookie`) is persisted and
 * restored automatically by {@link SessionParser}, so applications should
 * declare their own payload shape via their own `declare module
 * 'express-session'` block instead of relying on a fixed property from
 * this package.
 */
declare module 'express-session' {
    interface Cookie {
        /** `Partitioned` `Set-Cookie` attribute (CHIPS), or `undefined` when unset. */
        partitioned?: boolean | undefined;
        /** `Priority` `Set-Cookie` attribute, or `undefined` when unset. */
        priority?: 'low' | 'medium' | 'high' | undefined;
    }
}