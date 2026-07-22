import 'express-session';

/**
 * Augments `express-session`'s {@link SessionData} interface with the
 * `json` property, which holds the arbitrary payload stored by the
 * application inside a session.
 */
declare module 'express-session' {
    interface SessionData {
        /** Arbitrary session payload set by the application. */
        json: Record<string, any>;
    }
}