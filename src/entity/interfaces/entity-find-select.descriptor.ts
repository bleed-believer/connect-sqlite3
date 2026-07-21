import type { RelationsOf } from './entity-relations-of.js';
import type { EntityOptions } from './entity.options.js';

/**
 * Shape of the `select` option accepted by {@link Entity.find}, inferred
 * from the entity's own generic `O`.
 *
 * Own columns accept a `boolean`; relations accept a nested
 * {@link FindSelect} scoped to the related entity's own options.
 */
export type FindSelect<O extends EntityOptions> = {
    [K in keyof O['column'] | keyof RelationsOf<O>]?:
        K extends keyof RelationsOf<O>
            ?   FindSelect<RelationsOf<O>[K]['entity']['options']>
            :   boolean;
};
