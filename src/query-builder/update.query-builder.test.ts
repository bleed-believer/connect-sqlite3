import { UpdateQueryBuilder } from './update.query-builder.js';
import { describe, it } from 'node:test';

describe('UpdateQueryBuilder', () => {
    it('Update a single column', (t: it.TestContext) => {
        const qb = new UpdateQueryBuilder('User')
            .set('nick', 'foo');

        t.assert.deepStrictEqual(qb.getParameters(), [ 'foo' ]);
        t.assert.strictEqual(qb.getQuery(), [
            `UPDATE [User]`,
            `SET`,
            `[nick] = ?`,
        ].join('\n'));
    });

    it('Update multiple columns', (t: it.TestContext) => {
        const qb = new UpdateQueryBuilder('User')
            .set('nick', 'foo')
            .set('path', '/foo');

        t.assert.deepStrictEqual(qb.getParameters(), [ 'foo', '/foo' ]);
        t.assert.strictEqual(qb.getQuery(), [
            `UPDATE [User]`,
            `SET`,
            `[nick] = ?,`,
            `[path] = ?`,
        ].join('\n'));
    });

    it('Update with where expression', (t: it.TestContext) => {
        const qb = new UpdateQueryBuilder('User')
            .set('nick', 'foo')
            .where('User.id = ?', 1);

        t.assert.deepStrictEqual(qb.getParameters(), [ 'foo', 1 ]);
        t.assert.strictEqual(qb.getQuery(), [
            `UPDATE [User]`,
            `SET`,
            `[nick] = ?`,
            `WHERE`,
            `User.id = ?`,
        ].join('\n'));
    });

    it('Update with where expression (OR)', (t: it.TestContext) => {
        const qb = new UpdateQueryBuilder('User')
            .set('nick', 'foo')
            .where('User.path != ?', '/')
            .orWhere('User.nick like ?', 'adm%');

        t.assert.deepStrictEqual(qb.getParameters(), [ 'foo', '/', 'adm%' ]);
        t.assert.strictEqual(qb.getQuery(), [
            `UPDATE [User]`,
            `SET`,
            `[nick] = ?`,
            `WHERE`,
            `User.path != ?`,
            `OR User.nick like ?`,
        ].join('\n'));
    });

    it('Update with where expression (AND)', (t: it.TestContext) => {
        const qb = new UpdateQueryBuilder('User')
            .set('nick', 'foo')
            .where('User.path != ?', '/')
            .andWhere('User.nick like ?', 'adm%');

        t.assert.deepStrictEqual(qb.getParameters(), [ 'foo', '/', 'adm%' ]);
        t.assert.strictEqual(qb.getQuery(), [
            `UPDATE [User]`,
            `SET`,
            `[nick] = ?`,
            `WHERE`,
            `User.path != ?`,
            `AND User.nick like ?`,
        ].join('\n'));
    });
});
