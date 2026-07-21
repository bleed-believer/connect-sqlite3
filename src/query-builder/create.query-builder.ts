import type { ColumnDescriptor, QueryBuilder } from './interfaces/index.js';

/**
 * Builds a `CREATE TABLE` statement.
 *
 * Instances are immutable: {@link CreateQueryBuilder.addColumn} returns a
 * new builder rather than mutating the current one, so intermediate
 * builders can be safely reused.
 *
 * @example
 * ```ts
 * const qb = new CreateQueryBuilder('User')
 *     .addColumn('id',   { type: 'INTEGER', primary: true })
 *     .addColumn('nick', { type: 'VARCHAR', nullable: false });
 *
 * qb.getQuery();
 * ```
 */
export class CreateQueryBuilder implements QueryBuilder {
    #tableName: string;
    #columns = new Map<string, ColumnDescriptor>();

    /**
     * @param tableName Name of the table to create.
     */
    constructor(tableName: string) {
        this.#tableName = tableName;
    }

    /**
     * Returns a new builder with the given column added (or replaced, if
     * `name` was already defined).
     *
     * @param name Column name.
     * @param descriptor Column type and constraints.
     */
    addColumn(name: string, descriptor: ColumnDescriptor): CreateQueryBuilder {
        const qb = new CreateQueryBuilder(this.#tableName);
        for (const [ k, v ] of this.#columns) {
            qb.#columns.set(k, structuredClone(v));
        }

        qb.#columns.set(name, descriptor);
        return qb;
    }

    /**
     * `CREATE TABLE` statements take no bound parameters, so this always
     * returns an empty array.
     */
    getParameters(): unknown[] {
        return [];
    }

    /**
     * Renders a JavaScript value as a SQL literal for use in a `DEFAULT`
     * clause. Strings are quoted and escaped, dates are serialized as ISO
     * strings, and booleans are rendered as `1`/`0`.
     */
    #stringifyValue(v: unknown): string {
        switch (true) {
            case v instanceof Date:
                return `'${v.toISOString()}'`;

            case typeof v === 'string':
                return `'${v.replace(/'/g, "''")}'`;

            case typeof v === 'boolean':
                return v ? '1' : '0';

            case typeof v === 'number':
                return v.toString();

            case v == null:
                return 'NULL';

            default: {
                throw new Error(`Not supported input value \`${v}\``);
            }
        }
    }

    /**
     * Builds the `CREATE TABLE` statement.
     * `FOREIGN KEY ... REFERENCES` clauses are appended after the columns.
     */
    getQuery(): string {
        const query = [
            `CREATE TABLE [${this.#tableName}](`
        ];

        const fks = new Map<string, ColumnDescriptor['foreign']>();
        const columns = Array
            .from(this.#columns)
            .map(([ k, n ]) => {
                const line = [ `[${k}]`, n.type ];
                if (typeof n.nullable === 'boolean')
                    line.push(!n.nullable
                        ?   'NOT NULL'
                        :   'NULL'
                    );

                if (n.primary)
                    line.push('PRIMARY KEY');

                if (n.foreign)
                    fks.set(k, n.foreign);

                if (typeof n.default !== 'undefined')
                    line.push('DEFAULT', this.#stringifyValue(n.default));

                return line.join(' ');
            });

        if (fks.size > 0) {
            Array
                .from(fks)
                .map(([ k, v ]) => [
                    'FOREIGN KEY',
                    `(${k})`,
                    'REFERENCES',
                    `[${v!.tableName}]([${v!.columnName}])`
                ])
                .map(x => x.join(' '))
                .forEach(x => columns.push(x));
        }
        
        query.push(columns.join(',\n'));
        query.push(')');
        return query.join('\n');
    }
}