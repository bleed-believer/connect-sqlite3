import type { FindPagination } from './entity-find-pagination.descriptor.js';
import type { FindRelations } from './entity-find-relations.descriptor.js';
import type { FindSelect } from './entity-find-select.descriptor.js';
import type { FindWhere } from './entity-find-where.descriptor.js';
import type { EntityOptions } from './entity.options.js';

/** Options accepted by {@link Entity.find}, inferred from the entity's own generic `O`. */
export interface FindOptions<O extends EntityOptions> {
    select?: FindSelect<O>;
    relations?: FindRelations<O>;
    where?: FindWhere<O>;
    pagination?: FindPagination;
}
