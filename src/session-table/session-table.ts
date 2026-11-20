import type { SQLite3Object } from '../sqlite3/index.js';
import type { SessionData } from 'express-session';

import { SessionQueries } from './session-queries.js';

/**
 * Low-level data access layer over a `better-sqlite3` database, storing
 * `express-session` sessions in a single table. All values are
 * serialized/deserialized through `SessionParser`.
 *
 * Reads never return an expired session, but nothing here deletes them
 * except {@link purge}: the caller decides when to run it.
 */
export class SessionTable {
    #queries: SessionQueries;
    #now: () => number;

    /**
     * @param sqlite3 - The connection to operate on. The sessions table
     * must already exist (the `SQLite3` constructor runs the migrations).
     * @param now - Returns the current time in milliseconds. Defaults to
     * `Date.now`.
     */
    constructor(sqlite3: SQLite3Object, now: () => number = Date.now) {
        this.#queries = new SessionQueries(sqlite3);
        this.#now = now;
    }

    /** Counts the sessions that haven't expired. */
    getLength(): number {
        return this.#queries.getLength(this.#now());
    }

    /** Returns every session that hasn't expired. */
    getAll(): SessionData[] {
        return this.#queries.getAll(this.#now());
    }

    /** Returns the session, or `null` if it's missing or expired. */
    get(sid: string): SessionData | null {
        return this.#queries.get(sid, this.#now());
    }

    /** Inserts the session, or replaces it if it already exists. */
    set(sid: string, sessionData: SessionData): void {
        this.#queries.upsert(sid, sessionData);
    }

    clear(): void {
        this.#queries.clear();
    }

    delete(sid: string): void {
        this.#queries.delete(sid);
    }

    /**
     * Moves the expiration of an existing, unexpired session to
     * `sessionData.cookie.expires`. Nothing else is written, and a missing
     * or expired session is never created.
     */
    touch(sid: string, sessionData: SessionData): void {
        const expires = sessionData.cookie?.expires instanceof Date
        ?   sessionData.cookie.expires.getTime()
        :   null;

        this.#queries.touch(sid, expires, this.#now());
    }

    /**
     * Deletes every expired session. Sessions without an expiration are
     * kept.
     *
     * @returns How many sessions were deleted.
     */
    purge(): number {
        return this.#queries.purge(this.#now()).changes;
    }
}
