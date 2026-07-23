import 'express-session';

/**
 * Augments `express-session`'s {@link SessionData} interface with the
 * `json` property, which holds the arbitrary payload stored by the
 * application inside a session. Also backfills the `partitioned` and
 * `priority` cookie attributes on {@link Cookie}, which `@types/express-session`
 * omits from the class even though `CookieOptions` (and the real runtime
 * `Cookie` implementation) both support them.
 */
declare module 'express-session' {
    interface SessionData {
        /** Arbitrary session payload set by the application. */
        json: Record<string, any>;
    }

    interface Cookie {
        /** `Partitioned` `Set-Cookie` attribute (CHIPS), or `undefined` when unset. */
        partitioned?: boolean | undefined;
        /** `Priority` `Set-Cookie` attribute, or `undefined` when unset. */
        priority?: 'low' | 'medium' | 'high' | undefined;
    }
}