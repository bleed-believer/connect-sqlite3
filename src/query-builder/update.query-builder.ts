import type { JoinDescriptor } from './interfaces/join-descriptor.js';
import type { QueryBuilder } from './interfaces/query-builder.js';

/**
 * Builds an `UPDATE` statement.
 *
 * Instances are immutable: every chainable method returns a new builder
 * rather than mutating the current one, so intermediate builders can be
 * safely reused and shared.
 *
 * @example
 * ```ts
 * const qb = new UpdateQueryBuilder('User')
 *     .set('nick', 'foo')
 *     .where('User.id = ?', 1);
 *
 * qb.getQuery();
 * qb.getParameters();
 * ```
 */
export class UpdateQueryBuilder implements QueryBuilder {
    #whereParameters: unknown[] = [];
    #joinParameters: unknown[][] = [];
    #setParameters: unknown[] = [];
    #tableName: string;
    #where: string[] = [];
    #join: Omit<JoinDescriptor, 'parameters'>[] = [];
    #set: string[] = [];

    /**
     * @param tableName Name of the table to update.
     */
    constructor(tableName: string) {
        this.#tableName = tableName;
    }

    /**
     * Returns a new builder with an additional `[column] = ?` assignment
     * appended to the `SET` clause.
     *
     * @param column Name of the column to assign.
     * @param value Value bound to the assignment's `?` placeholder.
     */
    set(column: string, value: unknown): UpdateQueryBuilder {
        const qb = new UpdateQueryBuilder(this.#tableName);
        qb.#whereParameters = this.#whereParameters.slice();
        qb.#joinParameters = this.#joinParameters.slice();
        qb.#setParameters = [ ...this.#setParameters, value ];
        qb.#where = this.#where.slice();
        qb.#join = this.#join.slice();
        qb.#set = [ ...this.#set, `[${column}] = ?` ];
        return qb;
    }

    /**
     * Returns a new builder with the `JOIN` clauses replaced by the given
     * descriptor, discarding any joins set by previous calls to
     * {@link UpdateQueryBuilder.join} or {@link UpdateQueryBuilder.addJoin}.
     *
     * @param descriptor Join type, target table and `ON` condition.
     */
    join(descriptor: JoinDescriptor): UpdateQueryBuilder {
        const { parameters, ...rest } = descriptor;
        const qb = new UpdateQueryBuilder(this.#tableName);
        qb.#whereParameters = this.#whereParameters.slice();
        qb.#joinParameters = [ parameters?.slice() ?? [] ];
        qb.#setParameters = this.#setParameters.slice();
        qb.#where = this.#where.slice();
        qb.#join = [ rest ];
        qb.#set = this.#set.slice();
        return qb;
    }

    /**
     * Returns a new builder with the given join appended to the ones
     * already set.
     *
     * @param descriptor Join type, target table and `ON` condition.
     */
    addJoin(descriptor: JoinDescriptor): UpdateQueryBuilder {
        const { parameters, ...rest } = descriptor;
        const qb = new UpdateQueryBuilder(this.#tableName);
        qb.#whereParameters = this.#whereParameters.slice();
        qb.#joinParameters = [ ...this.#joinParameters, parameters?.slice() ?? [] ];
        qb.#setParameters = this.#setParameters.slice();
        qb.#where = this.#where.slice();
        qb.#join = [ ...this.#join, rest ];
        qb.#set = this.#set.slice();
        return qb;
    }

    /**
     * Returns a new builder with the `WHERE` clause replaced by the given
     * expression, discarding any conditions set by previous calls to
     * `where`, `andWhere` or `orWhere`.
     *
     * @param expression SQL boolean expression, using `?` placeholders for parameters.
     * @param parameters Values bound to the `?` placeholders in `expression`, in order.
     */
    where(expression: string, ...parameters: unknown[]): UpdateQueryBuilder {
        const qb = new UpdateQueryBuilder(this.#tableName);
        qb.#whereParameters = parameters.slice();
        qb.#joinParameters = this.#joinParameters.slice();
        qb.#setParameters = this.#setParameters.slice();
        qb.#where = [ expression ];
        qb.#join = this.#join.slice();
        qb.#set = this.#set.slice();
        return qb;
    }

    /**
     * Returns a new builder with an `AND`-joined expression appended to the
     * `WHERE` clause. Must be called after {@link UpdateQueryBuilder.where}.
     *
     * @param expression SQL boolean expression, using `?` placeholders for parameters.
     * @param parameters Values bound to the `?` placeholders in `expression`, in order.
     */
    andWhere(expression: string, ...parameters: unknown[]): UpdateQueryBuilder {
        const qb = new UpdateQueryBuilder(this.#tableName);
        qb.#whereParameters = [ ...this.#whereParameters, ...parameters ];
        qb.#joinParameters = this.#joinParameters.slice();
        qb.#setParameters = this.#setParameters.slice();
        qb.#where = [ ...this.#where, `AND ${expression}` ];
        qb.#join = this.#join.slice();
        qb.#set = this.#set.slice();
        return qb;
    }

    /**
     * Returns a new builder with an `OR`-joined expression appended to the
     * `WHERE` clause. Must be called after {@link UpdateQueryBuilder.where}.
     *
     * @param expression SQL boolean expression, using `?` placeholders for parameters.
     * @param parameters Values bound to the `?` placeholders in `expression`, in order.
     */
    orWhere(expression: string, ...parameters: unknown[]): UpdateQueryBuilder {
        const qb = new UpdateQueryBuilder(this.#tableName);
        qb.#whereParameters = [ ...this.#whereParameters, ...parameters ];
        qb.#joinParameters = this.#joinParameters.slice();
        qb.#setParameters = this.#setParameters.slice();
        qb.#where = [ ...this.#where, `OR ${expression}` ];
        qb.#join = this.#join.slice();
        qb.#set = this.#set.slice();
        return qb;
    }

    /**
     * Returns the parameters bound to the `?` placeholders of the built
     * query, in order: first the `SET` assignments, then the `JOIN`
     * conditions, then the `WHERE` conditions.
     */
    getParameters(): unknown[] {
        return [ ...this.#setParameters, ...this.#joinParameters.flat(), ...this.#whereParameters ];
    }

    /**
     * Builds the `UPDATE` statement, including the `JOIN` and `WHERE`
     * clauses if any have been set.
     */
    getQuery(): string {
        const query = [
            `UPDATE [${this.#tableName}]`,
            `SET`,
            this.#set.join(',\n'),
        ];

        for (const j of this.#join) {
            const target = typeof j.alias === 'string'
                ?   `[${j.target}] AS [${j.alias}]`
                :   `[${j.target}]`;

            query.push(`${j.type.toUpperCase()} JOIN ${target} ON ${j.on}`);
        }

        if (this.#where.length > 0)
            query.push('WHERE', ...this.#where);

        return query.join('\n');
    }
}
