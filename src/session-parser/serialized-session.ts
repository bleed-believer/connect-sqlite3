/**
 * Flat, SQLite-friendly representation of an `express-session`
 * {@link SessionData} object, as stored in and read from the sessions
 * table. Every column produced by {@link SessionParser.serialize} and
 * consumed by {@link SessionParser.parse} maps 1:1 to a property here.
 */
export interface SerializedSession {
    /** `session.json` payload, serialized as a JSON string. */
    json: string;
    /** Cookie `path`, or `null` when unset. */
    path: string | null;
    /** Cookie `domain`, or `null` when unset. */
    domain: string | null;
    /** Cookie `signed` flag, stored as `0`/`1`, or `null` when unset. */
    signed: number | null;
    /** Cookie `secure` flag, stored as `'true'`, `'false'`, `'auto'`, or `null` when unset. */
    secure: string | null;
    /** Cookie `expires` date, stored as an ISO string, or `null` when unset. */
    expires: string | null;
    /** Cookie `httpOnly` flag, stored as `0`/`1`, or `null` when unset. */
    httpOnly: number | null;
    /** Cookie `sameSite` value, stored as its string/boolean JSON form, or `null` when unset. */
    sameSite: string | null;
}