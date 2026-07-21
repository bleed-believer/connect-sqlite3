import type { EntityRelationDescriptor } from './entity-relation.descriptor.js';
import type { EntityOptions } from './entity.options.js';

/**
 * Extracts the `relations` map declared on `O`, or `{}` when `O` declares
 * none.
 */
export type RelationsOf<O extends EntityOptions> =
    NonNullable<O['relations']> extends Record<string, EntityRelationDescriptor<any>>
        ?   NonNullable<O['relations']>
        :   Record<string, never>;
