/** Shape of the `pagination` option accepted by {@link Entity.find}. */
export interface FindPagination {
    /** Maximum number of rows to return. */
    take?: number;
    /** Number of rows to skip before starting to return rows. */
    skip?: number;
}
