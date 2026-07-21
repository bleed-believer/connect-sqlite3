/**
 * Common contract implemented by every query builder in this module.
 *
 * All query builders are immutable: each chainable method returns a new
 * instance instead of mutating the current one.
 */
export interface QueryBuilder {
    /**
     * Builds and returns the SQL query as a string.
     *
     * Values bound to parameters are represented as `?` placeholders; the
     * actual values are retrieved through {@link QueryBuilder.getParameters}.
     */
    getQuery(): string;

    /**
     * Returns the ordered list of parameter values that correspond to the
     * `?` placeholders produced by {@link QueryBuilder.getQuery}.
     */
    getParameters(): unknown[];
}