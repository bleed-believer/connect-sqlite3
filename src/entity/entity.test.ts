import { describe, it } from 'node:test';
import { Entity } from './entity.js';

describe('Entity', () => {
    const userTypeEntity = new Entity({
        name: 'UserType',
        column: {
            id:         { type: 'INTEGER', primary: true },
            code:       { type: 'VARCHAR' },
            info:       { type: 'NVARCHAR' },
        }
    });

    const userEntity = new Entity({
        name: 'User',
        column: {
            id:         { type: 'INTEGER', primary: true },
            nick:       { type: 'VARCHAR' },
            pass:       { type: 'VARCHAR' },
            path:       { type: 'VARCHAR',  default: '/' },
            createdAt:  { type: 'DATETIME', default: () => 'CURRENT_TIMESTAMP' },
        },
        relations: {
            userType: Entity.relation(userTypeEntity, {
                type: 'inner',
                column: e => e.id
            })
        }
    });

    it('Create entities', (t: it.TestContext) => {
        const queries: string[] = [];
        const database = {
            prepare(q: string) {
                queries.push(q);
                return {
                    run: () => {}
                };
            }
        };

        userTypeEntity.createTable(database);
        userEntity.createTable(database);
        t.assert.deepStrictEqual(queries, [
            [
                `CREATE TABLE [UserType](`,
                `[id] INTEGER PRIMARY KEY,`,
                `[code] VARCHAR,`,
                `[info] NVARCHAR`,
                `)`,
            ].join('\n'),
            [
                `CREATE TABLE [User](`,
                `[id] INTEGER PRIMARY KEY,`,
                `[userTypeId] INTEGER,`,
                `[nick] VARCHAR,`,
                `[pass] VARCHAR,`,
                `[path] VARCHAR DEFAULT '/',`,
                `[createdAt] DATETIME DEFAULT CURRENT_TIMESTAMP,`,
                `FOREIGN KEY (userTypeId) REFERENCES [UserType]([id])`,
                `)`,
            ].join('\n'),
        ]);
    });

    it('Find many items', (t: it.TestContext) => {
        let query = '';
        let parameters: unknown[] = [];
        const database = {
            prepare(q: string) {
                query = q;
                return {
                    all(...p: unknown[]) {
                        parameters = p;
                        return [
                            {
                                'id': 1,
                                'nick': 'foo',
                                'userType.id': 9,
                                'userType.code': 'MODERATOR',
                            },
                            {
                                'id': 55,
                                'nick': 'lol',
                                'userType.id': 9,
                                'userType.code': 'MODERATOR',
                            },
                            {
                                'id': 66,
                                'nick': 'joder',
                                'userType.id': 9,
                                'userType.code': 'MODERATOR',
                            }
                        ] as any;
                    }
                };
            }
        };

        const data = userEntity.find(database, {
            select: {
                id: true,
                nick: true,
                userType: {
                    id: true,
                    code: true
                }
            },
            relations: {
                userType: true
            },
            pagination: {
                take: 10,
                skip: 0
            },
            where: {
                path: {
                    expression: (c: string) => `${c} != ?`,
                    values: [ '/' ]
                },
                userType: {
                    code: {
                        expression: (c: string) => `${c} = ?`,
                        values: [ 'MODERATOR' ]
                    }
                }
            }
        });

        t.assert.deepStrictEqual(parameters, [ '/', 'MODERATOR' ]);
        t.assert.strictEqual(query, [
            `SELECT`,
            `[User].[id] AS [id],`,
            `[User].[nick] AS [nick],`,
            `[UserType].[id] AS [userType.id],`,
            `[UserType].[code] AS [userType.code]`,
            `FROM [User]`,
            `LEFT JOIN [UserType] ON [UserType].[id] = [User].[userTypeId]`,
            `WHERE`,
            `[User].[path] != ?`,
            `AND [UserType].[code] = ?`,
            `LIMIT 10`,
            `SKIP 0`,
        ].join('\n'));

        t.assert.deepStrictEqual(data, [
            {
                id: 1,
                nick: 'foo',
                userType: {
                    id: 9,
                    code: 'MODERATOR'
                }
            },
            {
                id: 55,
                nick: 'lol',
                userType: {
                    id: 9,
                    code: 'MODERATOR'
                }
            },
            {
                id: 66,
                nick: 'joder',
                userType: {
                    id: 9,
                    code: 'MODERATOR'
                }
            }
        ]);
    });
});