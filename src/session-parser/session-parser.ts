import type { SerializedSession } from './serialized-session.js';
import type { SessionData } from 'express-session';

import { Cookie } from 'express-session';

/**
 * Converts `express-session` {@link SessionData} objects to and from the
 * flat {@link SerializedSession} shape used to persist sessions in the
 * SQLite table.
 */
export class SessionParser {
    /**
     * Serializes a {@link SessionData} object into the flat row shape
     * stored in the sessions table.
     *
     * @param v - The session data to serialize.
     * @returns The serialized representation, ready to be persisted.
     */
    static serialize(v: SessionData): SerializedSession {
        return {
            json: JSON.stringify(v.json),
            path: v.cookie.path ?? null,
            domain: v.cookie.domain ?? null,
            signed: typeof v.cookie.signed === 'boolean'
            ?   v.cookie.signed ? 1 : 0
            :   null,
            secure: typeof v.cookie.secure === 'boolean'
            ?   JSON.stringify(v.cookie.secure)
            :   v.cookie.secure ?? null,
            expires: v.cookie.expires instanceof Date
            ?   v.cookie.expires.toISOString()
            :   null,
            httpOnly: typeof v.cookie.httpOnly === 'boolean'
            ?   v.cookie.httpOnly ? 1 : 0
            :   null,
            sameSite: typeof v.cookie.sameSite === 'boolean'
            ?   JSON.stringify(v.cookie.sameSite)
            :   v.cookie.sameSite ?? null
        };
    }

    /**
     * Reconstructs a {@link SessionData} object from its serialized row
     * shape, as read back from the sessions table.
     *
     * @param v - The serialized row to parse.
     * @returns The reconstructed session data.
     */
    static parse(v: SerializedSession): SessionData {
        const json = JSON.parse(v.json);
        const cookie = new Cookie();
        
        if (typeof v.path === 'string')
            cookie.path = v.path;

        if (typeof v.domain === 'string')
            cookie.domain = v.domain;

        if (typeof v.signed === 'number')
            cookie.signed = v.signed === 1;

        switch (v.secure) {
            case 'auto': {
                cookie.secure = 'auto';
                break;
            }

            case 'true':
            case 'false': {
                cookie.secure = JSON.parse(v.secure);
                break;
            }
        }

        if (typeof v.expires === 'string')
            cookie.expires = new Date(v.expires);

        if (typeof v.httpOnly === 'number')
            cookie.httpOnly = v.httpOnly === 1;

        switch (true) {
            case v.sameSite === 'lax':
            case v.sameSite === 'none':
            case v.sameSite === 'strict': {
                cookie.sameSite = v.sameSite;
                break;
            }

            case typeof v.sameSite === 'number': {
                cookie.sameSite = v.sameSite === 1;
                break;
            }
        }

        if (typeof v.sameSite === 'number')
            cookie.sameSite = v.sameSite === 1;

        return { cookie, json };
    }
}