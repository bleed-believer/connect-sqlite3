import type { JoinDescriptor } from '../../query-builder/index.js';
import type { RelationsOf } from './entity-relations-of.js';
import type { EntityOptions } from './entity.options.js';

/**
 * Shape of the `relations` option accepted by {@link Entity.find}, inferred
 * from the entity's own generic `O`.
 *
 * `true` joins the relation using the default `left` join type; a
 * {@link JoinDescriptor.type} value overrides it for that call.
 */
export type FindRelations<O extends EntityOptions> = {
    [K in keyof RelationsOf<O>]?: boolean | JoinDescriptor['type'];
};
