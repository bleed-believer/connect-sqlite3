import { SelectQueryBuilder } from './select.query-builder.js';
import { describe, it } from 'node:test';

describe('SelectQueryBuilder', () => {
    it('Select fixed values', (t: it.TestContext) => {
        const qb = new SelectQueryBuilder()
            .select(
                `666 as [foo]`,
                `999 as [bar]`,
            );

        t.assert.deepStrictEqual(qb.getParameters(), []);
        t.assert.strictEqual(qb.getQuery(), [
            `SELECT`,
            `666 as [foo],`,
            `999 as [bar]`,
        ].join('\n'));
    });

    it('Select from table', (t: it.TestContext) => {
        const qb = new SelectQueryBuilder()
            .select(
                `User.id`,
                `User.nick`,
                `User.path`,
            )
            .from('User');

        t.assert.deepStrictEqual(qb.getParameters(), []);
        t.assert.strictEqual(qb.getQuery(), [
            `SELECT`,
            `User.id,`,
            `User.nick,`,
            `User.path`,
            `FROM [User]`,
        ].join('\n'));
    });

    it('Select from table with pagination', (t: it.TestContext) => {
        const qb = new SelectQueryBuilder()
            .select(
                `User.id`,
                `User.nick`,
                `User.path`,
            )
            .from('User')
            .limit(10)
            .skip(50);

        t.assert.deepStrictEqual(qb.getParameters(), []);
        t.assert.strictEqual(qb.getQuery(), [
            `SELECT`,
            `User.id,`,
            `User.nick,`,
            `User.path`,
            `FROM [User]`,
            `LIMIT 10`,
            `SKIP 50`,
        ].join('\n'));
    });

    it('Select from table and where expression (OR)', (t: it.TestContext) => {
        const qb = new SelectQueryBuilder()
            .select(
                `User.id`,
                `User.nick`,
                `User.path`,
            )
            .from('User')
            .where('User.path != ?', '/')
            .orWhere('User.nick like ?', 'adm%');

        t.assert.deepStrictEqual(qb.getParameters(), [ '/', 'adm%' ]);
        t.assert.strictEqual(qb.getQuery(), [
            `SELECT`,
            `User.id,`,
            `User.nick,`,
            `User.path`,
            `FROM [User]`,
            `WHERE`,
            `User.path != ?`,
            `OR User.nick like ?`,
        ].join('\n'));
    });

    it('Select from table and where expression (AND)', (t: it.TestContext) => {
        const qb = new SelectQueryBuilder()
            .select(
                `User.id`,
                `User.nick`,
                `User.path`,
            )
            .from('User')
            .where('User.path != ?', '/')
            .andWhere('User.nick like ?', 'adm%');

        t.assert.deepStrictEqual(qb.getParameters(), [ '/', 'adm%' ]);
        t.assert.strictEqual(qb.getQuery(), [
            `SELECT`,
            `User.id,`,
            `User.nick,`,
            `User.path`,
            `FROM [User]`,
            `WHERE`,
            `User.path != ?`,
            `AND User.nick like ?`,
        ].join('\n'));
    });

    it('Select from table with a single join', (t: it.TestContext) => {
        const qb = new SelectQueryBuilder()
            .select(
                `User.id`,
                `Profile.bio`,
            )
            .from('User')
            .join({
                type: 'left',
                target: 'Profile',
                alias: 'Profile',
                on: 'Profile.userId = User.id AND Profile.active = ?',
                parameters: [ 1 ],
            });

        t.assert.deepStrictEqual(qb.getParameters(), [ 1 ]);
        t.assert.strictEqual(qb.getQuery(), [
            `SELECT`,
            `User.id,`,
            `Profile.bio`,
            `FROM [User]`,
            `LEFT JOIN [Profile] AS [Profile] ON Profile.userId = User.id AND Profile.active = ?`,
        ].join('\n'));
    });

    it('Select from table with multiple joins and where expression', (t: it.TestContext) => {
        const qb = new SelectQueryBuilder()
            .select(
                `User.id`,
                `Profile.bio`,
                `Team.name`,
            )
            .from('User')
            .join({
                type: 'inner',
                target: 'Profile',
                on: 'Profile.userId = User.id',
            })
            .addJoin({
                type: 'left',
                target: 'Team',
                alias: 'Team',
                on: 'Team.id = User.teamId AND Team.active = ?',
                parameters: [ 1 ],
            })
            .where('User.path != ?', '/');

        t.assert.deepStrictEqual(qb.getParameters(), [ 1, '/' ]);
        t.assert.strictEqual(qb.getQuery(), [
            `SELECT`,
            `User.id,`,
            `Profile.bio,`,
            `Team.name`,
            `FROM [User]`,
            `INNER JOIN [Profile] ON Profile.userId = User.id`,
            `LEFT JOIN [Team] AS [Team] ON Team.id = User.teamId AND Team.active = ?`,
            `WHERE`,
            `User.path != ?`,
        ].join('\n'));
    });

    it('addJoin replaces a previous join set by join()', (t: it.TestContext) => {
        const qb = new SelectQueryBuilder()
            .select(`User.id`)
            .from('User')
            .join({
                type: 'inner',
                target: 'Profile',
                on: 'Profile.userId = User.id',
            })
            .addJoin({
                type: 'left',
                target: 'Team',
                on: 'Team.id = User.teamId',
            });

        t.assert.deepStrictEqual(qb.getParameters(), []);
        t.assert.strictEqual(qb.getQuery(), [
            `SELECT`,
            `User.id`,
            `FROM [User]`,
            `INNER JOIN [Profile] ON Profile.userId = User.id`,
            `LEFT JOIN [Team] ON Team.id = User.teamId`,
        ].join('\n'));
    });
});