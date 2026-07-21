import type { DataTypeDescriptor } from '../../query-builder/index.js';
import type { EntityColumnDescriptor } from './entity-column.descriptor.js';
import type { RelationsOf } from './entity-relations-of.js';
import type { EntityOptions } from './entity.options.js';

type ColumnValue<C extends EntityColumnDescriptor> =
    C['nullable'] extends true
        ?   DataTypeDescriptor[C['type']] | null
        :   DataTypeDescriptor[C['type']];

/**
 * Builds a single comparison used inside a `where` clause.
 *
 * `expression` receives the fully-qualified column reference (e.g.
 * `[User].[path]`) and must return the SQL boolean expression, using `?`
 * placeholders for parameters; `values` supplies the parameters bound to
 * those placeholders, in order.
 */
export interface OperatorDescriptor<T> {
    expression: (column: string) => string;
    values: T[];
}

/**
 * Shape of the `where` option accepted by {@link Entity.find}, inferred
 * from the entity's own generic `O`.
 *
 * Own columns accept an {@link OperatorDescriptor} typed after the column's
 * declared `type`; relations accept a nested map of their own columns to
 * {@link OperatorDescriptor}s.
 */
export type FindWhere<O extends EntityOptions> = {
    [K in keyof O['column'] | keyof RelationsOf<O>]?:
        K extends keyof RelationsOf<O>
            ?   { [C in keyof RelationsOf<O>[K]['entity']['options']['column']]?:
                    OperatorDescriptor<ColumnValue<RelationsOf<O>[K]['entity']['options']['column'][C]>> }
            :   K extends keyof O['column']
                ?   OperatorDescriptor<ColumnValue<O['column'][K]>>
                :   never;
};
