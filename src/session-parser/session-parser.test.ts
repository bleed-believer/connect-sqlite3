import { SessionParser } from './session-parser.js';
import { describe, it } from 'node:test';
import { Cookie } from 'express-session';

describe('SessionParser', () => {
    it('SessionParser.serialize', (t: it.TestContext) => {
        const cookie = new Cookie();
        cookie.signed = false;
        cookie.secure = true;
        cookie.expires = new Date(2026, 6, 6);
        cookie.sameSite = 'lax';

        const v = SessionParser.serialize({
            cookie,
            json: { foo: 'bar' }
        });

        t.assert.deepStrictEqual(v, {
            json: '{"foo":"bar"}',
            path: '/',
            domain: null,
            signed: 0,
            secure: 'true',
            expires: cookie.expires.toISOString(),
            httpOnly: 1,
            sameSite: 'lax'
        });
    });

    it('SessionParser.parse', (t: it.TestContext) => {
        const expires = new Date(2026, 6, 6);
        const { json, cookie } = SessionParser.parse({
            json: '{"foo":"bar"}',
            path: '/',
            domain: null,
            signed: 0,
            secure: 'true',
            expires: expires.toISOString(),
            httpOnly: 1,
            sameSite: 'lax'
        });

        t.assert.deepStrictEqual(json, { foo: 'bar' });
        t.assert.strictEqual(cookie.path, '/');
        t.assert.strictEqual(cookie.domain, undefined);
        t.assert.strictEqual(cookie.signed, false);
        t.assert.strictEqual(cookie.secure, true);
        t.assert.strictEqual(cookie.expires?.getTime(), expires.getTime());
        t.assert.strictEqual(cookie.httpOnly, true);
        t.assert.strictEqual(cookie.sameSite, 'lax');
    });

    it('round-trips a boolean sameSite value', (t: it.TestContext) => {
        const cookie = new Cookie();
        cookie.sameSite = true;

        const serialized = SessionParser.serialize({
            cookie,
            json: { foo: 'bar' }
        });

        t.assert.strictEqual(serialized.sameSite, 'true');

        const { cookie: parsed } = SessionParser.parse(serialized);
        t.assert.strictEqual(parsed.sameSite, true);
    });
});