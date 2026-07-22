import type { SessionData } from 'express-session';

import { Cookie } from 'express-session';

/**
 * Builds a {@link SessionData} object for use in tests, from a plain
 * `json` payload plus optional cookie attributes.
 *
 * @param o - The session's `json` payload, together with any cookie
 * attributes to set (unset ones fall back to `Cookie`'s defaults).
 * @returns The resulting session data.
 */
export function createSession(
    o: (
        { json: Record<string, unknown> } &
        Partial<Cookie>
    )
): SessionData {
    const json = o.json;
    const cookie = new Cookie();
    if (typeof o.path     !== 'undefined') cookie.path     = o.path;
    if (typeof o.domain   !== 'undefined') cookie.domain   = o.domain;
    if (typeof o.signed   !== 'undefined') cookie.signed   = o.signed;
    if (typeof o.secure   !== 'undefined') cookie.secure   = o.secure;
    if (typeof o.maxAge   !== 'undefined') cookie.maxAge   = o.maxAge;
    if (typeof o.expires  !== 'undefined') cookie.expires  = o.expires;
    if (typeof o.httpOnly !== 'undefined') cookie.httpOnly = o.httpOnly;
    if (typeof o.sameSite !== 'undefined') cookie.sameSite = o.sameSite;

    return { json, cookie };
}

/**
 * Adapts a Node-style, error-first callback method on `target` into a
 * function returning a `Promise`, so `SQLite3Store`'s callback-based API
 * can be awaited in tests.
 *
 * @param target - The object owning the method to wrap.
 * @param callback - A selector returning the callback-style method to
 * invoke on `target`.
 * @returns A function taking the method's leading arguments (everything
 * but the callback) and returning a `Promise` that resolves with the
 * success values, or rejects with the error.
 */
export const toPromise = <
    O,
    P extends unknown[],
    V extends unknown[]
>(
    target: O,
    callback: (o: O) => (
        ...a: [ ...P, (e: any, ...v: V) => unknown ]
    ) => unknown
) => (...params: P) => new Promise<V>((resolve, reject) => {
    const args = [
        ...params,
        (err: any, ...v: V) => {
            if (err) {
                reject(err);
            } else {
                resolve(v);
            }
        }
    ] as const;

    const method = callback(target);
    method.bind(target)(...args);
});