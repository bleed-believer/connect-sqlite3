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
        cookie.partitioned = true;
        cookie.priority = 'high';

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
            sameSite: 'lax',
            partitioned: 1,
            priority: 'high',
            originalMaxAge: cookie.originalMaxAge
        });
    });

    it('SessionParser.serialize defaults a missing json payload to {}', (t: it.TestContext) => {
        const cookie = new Cookie();
        const v = SessionParser.serialize({ cookie } as any);
        t.assert.strictEqual(v.json, '{}');
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
            sameSite: 'lax',
            partitioned: 1,
            priority: 'high',
            originalMaxAge: 30_000
        });

        t.assert.deepStrictEqual(json, { foo: 'bar' });
        t.assert.strictEqual(cookie.path, '/');
        t.assert.strictEqual(cookie.domain, undefined);
        t.assert.strictEqual(cookie.signed, false);
        t.assert.strictEqual(cookie.secure, true);
        t.assert.strictEqual(cookie.expires?.getTime(), expires.getTime());
        t.assert.strictEqual(cookie.httpOnly, true);
        t.assert.strictEqual(cookie.sameSite, 'lax');
        t.assert.strictEqual(cookie.partitioned, true);
        t.assert.strictEqual(cookie.priority, 'high');
        t.assert.strictEqual(cookie.originalMaxAge, 30_000);
    });

    it('round-trips originalMaxAge so touch() extends expires by the full window', (t: it.TestContext) => {
        const cookie = new Cookie();
        cookie.maxAge = 30_000;

        const serialized = SessionParser.serialize({ cookie, json: {} });
        t.assert.strictEqual(serialized.originalMaxAge, 30_000);

        // Simulate time passing before the session is read back: the
        // persisted `expires` is unchanged, but `originalMaxAge` must
        // survive the round-trip unshrunk.
        const { cookie: parsed } = SessionParser.parse(serialized);
        t.assert.strictEqual(parsed.originalMaxAge, 30_000);

        // Emulate express-session's `Session.prototype.touch()`.
        const before = parsed.expires!.getTime();
        parsed.maxAge = parsed.originalMaxAge!;
        t.assert.ok(parsed.expires!.getTime() >= before);
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