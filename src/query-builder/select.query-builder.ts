import type { JoinDescriptor } from './interfaces/join-descriptor.js';
import type { QueryBuilder } from './interfaces/query-builder.js';

/**
 * Builds a `SELECT` statement.
 *
 * Instances are immutable: every chainable method returns a new builder
 * rather than mutating the current one, so intermediate builders can be
 * safely reused and shared.
 *
 * @example
 * ```ts
 * const qb = new SelectQueryBuilder()
 *     .select('User.id', 'User.nick')
 *     .from('User')
 *     .where('User.path != ?', '/')
 *     .limit(10);
 *
 * qb.getQuery();
 * qb.getParameters();
 * ```
 */
export class SelectQueryBuilder implements QueryBuilder {
    #parameters: unknown[] = [];
    #select: string[] = [];
    #where: string[] = [];
    #join: Omit<JoinDescriptor, 'parameters'>[] = [];
    #joinParameters: unknown[][] = [];
    #limit?: number;
    #skip?: number;
    #from?: {
        target: string;
        alias?: string;
    };

    /**
     * Returns a new builder with the selected columns replaced by the ones
     * given here. Any columns set by a previous call to
     * {@link SelectQueryBuilder.select} or
     * {@link SelectQueryBuilder.addSelect} are discarded.
     *
     * @param column First column expression (e.g. `'User.id'` or `'COUNT(*) as [total]'`).
     * @param moreColumns Additional column expressions.
     */
    select(column: string, ...moreColumns: string[]): SelectQueryBuilder;
    select(...columns: [ string, ...string[] ]): SelectQueryBuilder {
        const qb = new SelectQueryBuilder();
        qb.#parameters = this.#parameters.slice();
        qb.#select = columns;
        qb.#where = this.#where.slice();
        qb.#join = this.#join.slice();
        qb.#joinParameters = this.#joinParameters.slice();
        qb.#limit = this.#limit;
        qb.#skip = this.#skip;
        qb.#from = structuredClone(this.#from);
        return qb;
    }

    /**
     * Returns a new builder with the given columns appended to the ones
     * already selected.
     *
     * @param column First column expression to add.
     * @param moreColumns Additional column expressions to add.
     */
    addSelect(column: string, ...moreColumns: string[]): SelectQueryBuilder;
    addSelect(...columns: [ string, ...string[] ]): SelectQueryBuilder {
        const qb = new SelectQueryBuilder();
        qb.#parameters = this.#parameters.slice();
        qb.#select = [ ...this.#select, ...columns ];
        qb.#where = this.#where.slice();
        qb.#join = this.#join.slice();
        qb.#joinParameters = this.#joinParameters.slice();
        qb.#limit = this.#limit;
        qb.#skip = this.#skip;
        qb.#from = structuredClone(this.#from);
        return qb;
    }

    /**
     * Returns a new builder with the `JOIN` clauses replaced by the given
     * descriptor, discarding any joins set by previous calls to
     * {@link SelectQueryBuilder.join} or {@link SelectQueryBuilder.addJoin}.
     *
     * @param descriptor Join type, target table and `ON` condition.
     */
    join(descriptor: JoinDescriptor): SelectQueryBuilder {
        const { parameters, ...rest } = descriptor;
        const qb = new SelectQueryBuilder();
        qb.#parameters = this.#parameters.slice();
        qb.#select = this.#select.slice();
        qb.#where = this.#where.slice();
        qb.#join = [ rest ];
        qb.#joinParameters = [ parameters?.slice() ?? [] ];
        qb.#limit = this.#limit;
        qb.#skip = this.#skip;
        qb.#from = structuredClone(this.#from);
        return qb;
    }

    /**
     * Returns a new builder with the given join appended to the ones
     * already set.
     *
     * @param descriptor Join type, target table and `ON` condition.
     */
    addJoin(descriptor: JoinDescriptor): SelectQueryBuilder {
        const { parameters, ...rest } = descriptor;
        const qb = new SelectQueryBuilder();
        qb.#parameters = this.#parameters.slice();
        qb.#select = this.#select.slice();
        qb.#where = this.#where.slice();
        qb.#join = [ ...this.#join, rest ];
        qb.#joinParameters = [ ...this.#joinParameters, parameters?.slice() ?? [] ];
        qb.#limit = this.#limit;
        qb.#skip = this.#skip;
        qb.#from = structuredClone(this.#from);
        return qb;
    }

    /**
     * Returns a new builder with the `FROM` target set to the given table
     * (and optional alias).
     *
     * @param target Name of the table to select from.
     * @param alias Optional alias for the table, emitted as `AS [alias]`.
     */
    from(target: string, alias?: string): SelectQueryBuilder {
        const qb = new SelectQueryBuilder();
        qb.#parameters = this.#parameters.slice();
        qb.#select = this.#select.slice();
        qb.#where = this.#where.slice();
        qb.#join = this.#join.slice();
        qb.#joinParameters = this.#joinParameters.slice();
        qb.#limit = this.#limit;
        qb.#skip = this.#skip;
        qb.#from = { target, alias };
        return qb;
    }

    /**
     * Returns a new builder with an `AND`-joined expression appended to the
     * `WHERE` clause. Must be called after {@link SelectQueryBuilder.where}.
     *
     * @param expression SQL boolean expression, using `?` placeholders for parameters.
     * @param parameters Values bound to the `?` placeholders in `expression`, in order.
     */
    andWhere(expression: string, ...parameters: unknown[]): SelectQueryBuilder {
        const qb = new SelectQueryBuilder();
        qb.#parameters = [ ...this.#parameters, ...parameters ];
        qb.#select = this.#select.slice();
        qb.#where = [ ...this.#where, `AND ${expression}` ];
        qb.#join = this.#join.slice();
        qb.#joinParameters = this.#joinParameters.slice();
        qb.#limit = this.#limit;
        qb.#skip = this.#skip;
        qb.#from = structuredClone(this.#from);
        return qb;
    }

    /**
     * Returns a new builder with an `OR`-joined expression appended to the
     * `WHERE` clause. Must be called after {@link SelectQueryBuilder.where}.
     *
     * @param expression SQL boolean expression, using `?` placeholders for parameters.
     * @param parameters Values bound to the `?` placeholders in `expression`, in order.
     */
    orWhere(expression: string, ...parameters: unknown[]): SelectQueryBuilder {
        const qb = new SelectQueryBuilder();
        qb.#parameters = [ ...this.#parameters, ...parameters ];
        qb.#select = this.#select.slice();
        qb.#where = [ ...this.#where, `OR ${expression}` ];
        qb.#join = this.#join.slice();
        qb.#joinParameters = this.#joinParameters.slice();
        qb.#limit = this.#limit;
        qb.#skip = this.#skip;
        qb.#from = structuredClone(this.#from);
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
    where(expression: string, ...parameters: unknown[]): SelectQueryBuilder {
        const qb = new SelectQueryBuilder();
        qb.#parameters = parameters.slice();
        qb.#select = this.#select.slice();
        qb.#where = [ expression ];
        qb.#join = this.#join.slice();
        qb.#joinParameters = this.#joinParameters.slice();
        qb.#limit = this.#limit;
        qb.#skip = this.#skip;
        qb.#from = structuredClone(this.#from);
        return qb;
    }

    /**
     * Returns a new builder with the `LIMIT` clause set to `value`.
     *
     * @param value Maximum number of rows to return.
     */
    limit(value: number): SelectQueryBuilder {
        const qb = new SelectQueryBuilder();
        qb.#parameters = this.#parameters.slice();
        qb.#select = this.#select.slice();
        qb.#where = this.#where.slice();
        qb.#join = this.#join.slice();
        qb.#joinParameters = this.#joinParameters.slice();
        qb.#limit = value;
        qb.#skip = this.#skip;
        qb.#from = structuredClone(this.#from);
        return qb;
    }

    /**
     * Returns a new builder with the `SKIP` clause set to `value`.
     *
     * @param value Number of rows to skip.
     */
    skip(value: number): SelectQueryBuilder {
        const qb = new SelectQueryBuilder();
        qb.#parameters = this.#parameters.slice();
        qb.#select = this.#select.slice();
        qb.#where = this.#where.slice();
        qb.#join = this.#join.slice();
        qb.#joinParameters = this.#joinParameters.slice();
        qb.#limit = this.#limit;
        qb.#skip = value;
        qb.#from = structuredClone(this.#from);
        return qb;
    }

    /**
     * Returns the parameters bound to the `?` placeholders of the `JOIN`
     * and `WHERE` clauses built by {@link SelectQueryBuilder.getQuery}, in
     * the order they appear in the query text.
     */
    getParameters(): unknown[] {
        return [ ...this.#joinParameters.flat(), ...this.#parameters ];
    }

    /**
     * Builds the `SELECT` statement, including `FROM`, `JOIN`, `WHERE`,
     * `LIMIT` and `SKIP` clauses for whichever of those have been set.
     */
    getQuery(): string {
        const query = [ `SELECT`, this.#select.join(',\n') ];
        if (this.#from)
            query.push(typeof this.#from.alias === 'string'
                ?   `FROM [${this.#from.target}] AS [${this.#from.alias}]`
                :   `FROM [${this.#from.target}]`
            );

        for (const j of this.#join) {
            const target = typeof j.alias === 'string'
                ?   `[${j.target}] AS [${j.alias}]`
                :   `[${j.target}]`;

            query.push(`${j.type.toUpperCase()} JOIN ${target} ON ${j.on}`);
        }

        if (this.#where.length > 0)
            query.push('WHERE', ...this.#where);

        if (typeof this.#limit === 'number')
            query.push(`LIMIT ${this.#limit}`);

        if (typeof this.#skip === 'number')
            query.push(`SKIP ${this.#skip}`);

        return query.join('\n');
    }
}
