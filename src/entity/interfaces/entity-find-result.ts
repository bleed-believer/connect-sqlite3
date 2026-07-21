import type { DataTypeDescriptor } from '../../query-builder/index.js';
import type { EntityColumnDescriptor } from './entity-column.descriptor.js';
import type { RelationsOf } from './entity-relations-of.js';
import type { EntityOptions } from './entity.options.js';

type ColumnValue<C extends EntityColumnDescriptor> =
    C['nullable'] extends true
        ?   DataTypeDescriptor[C['type']] | null
        :   DataTypeDescriptor[C['type']];

/** `select` used by {@link Entity.find} when its `options.select` is omitted: every own column. */
export type DefaultSelect<O extends EntityOptions> = { [K in keyof O['column']]: true };

/**
 * Row shape returned by {@link Entity.find}, built from the columns and
 * relations flagged `true` in `Select` (own columns typed after their
 * declared `type`, relations recursed into their own selection). Every
 * field is optional since `Select` can't be narrowed to the exact call's
 * `options.select` without losing excess-property checking on `options`
 * (see {@link Entity.find}).
 */
export type FindResult<O extends EntityOptions, Select> = Partial<{
    [K in keyof Select as Select[K] extends false | undefined ? never : K]:
        K extends keyof O['column']
            ?   ColumnValue<O['column'][K]>
            :   K extends keyof RelationsOf<O>
                ?   FindResult<RelationsOf<O>[K]['entity']['options'], Select[K]>
                :   never;
}>;
