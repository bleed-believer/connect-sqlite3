import type { SessionData } from 'express-session';

import { SessionTable } from './session-table/index.js';
import { Store } from 'express-session';

/**
 * `express-session` compatible {@link Store} backed by a SQLite table via
 * `better-sqlite3`. Each call lazily ensures the underlying table exists
 * and purges expired sessions before performing its operation.
 */
export class SQLite3Store extends Store {
    #sessionTable: SessionTable;

    /**
     * @param args - Forwarded as-is to the {@link SessionTable} constructor
     * (database target path/buffer, table name, and optional `better-sqlite3`
     * connection options).
     */
    constructor(...args: ConstructorParameters<typeof SessionTable>) {
        super();
        this.#sessionTable = new SessionTable(...args);
    }

    /**
     * Returns every stored session. As a side effect, expired sessions are
     * purged before the lookup runs.
     *
     * @param callback - Called with an error, or with all session objects
     * on success.
     */
    all(callback: (err: any, obj?: SessionData[] | null) => void): void {
        try {
            const data = this.#sessionTable.getAll();
            callback(null, data);
        } catch (err) {
            if (callback) {
                callback(err, null);
            } else {
                throw err;
            }
        }
    }

    /**
     * Deletes every stored session.
     *
     * @param callback - Called with an error, if any, once the table has
     * been cleared.
     */
    clear(callback?: (err?: any) => void): void {
        try {
            this.#sessionTable.clear();
            callback?.(null);
        } catch (err) {
            if (callback) {
                callback(err);
            } else {
                throw err;
            }
        }
    }

    /**
     * Refreshes an existing session's data, e.g. to bump its expiration.
     * A no-op when no session with the given `sid` exists — it is never
     * created. As a side effect, expired sessions are purged before the
     * refresh runs.
     *
     * @param sid - The session id to refresh.
     * @param session - The session data to persist over the existing row.
     * @param callback - Called with an error, if any, once the operation
     * completes.
     */
    touch(sid: string, session: SessionData, callback?: (err?: any) => void): void {
        try {
            this.#sessionTable.touch(sid, session);
            callback?.(null);
        } catch (err) {
            if (callback) {
                callback(err);
            } else {
                throw err;
            }
        }
    }

    /**
     * Retrieves a single session by its id. As a side effect, expired
     * sessions are purged before the lookup runs.
     *
     * @param sid - The session id to retrieve.
     * @param callback - Called with an error, or with the session data
     * (or `null` when not found) on success.
     */
    get(sid: string, callback: (err: any, session?: SessionData | null) => void): void {
        try {
            const session = this.#sessionTable.get(sid);
            callback(null, session);
        } catch (err) {
            if (callback) {
                callback(err, null);
            } else {
                throw err;
            }
        }
    }

    /**
     * Stores a session, inserting it if it doesn't exist yet or updating
     * it in place otherwise. As a side effect, expired sessions are purged
     * before the operation runs.
     *
     * @param sid - The session id to store.
     * @param session - The session data to persist.
     * @param callback - Called with an error, if any, once the operation
     * completes.
     */
    set(sid: string, session: SessionData, callback?: (err?: any) => void): void {
        try {
            this.#sessionTable.set(sid, session);
            callback?.(null);
        } catch (err) {
            if (callback) {
                callback(err);
            } else {
                throw err;
            }
        }
    }

    /**
     * Counts every stored session. As a side effect, expired sessions are
     * purged before the count runs.
     *
     * @param callback - Called with an error, or with the total number of
     * sessions on success.
     */
    length(callback: (err: any, length?: number) => void): void {
        try {
            const length = this.#sessionTable.getLength();
            callback?.(null, length);
        } catch (err) {
            if (callback) {
                callback(err);
            } else {
                throw err;
            }
        }
    }

    /**
     * Deletes a single session by its id. A no-op when no session with
     * that `sid` exists. As a side effect, expired sessions are purged
     * before the deletion runs.
     *
     * @param sid - The session id to delete.
     * @param callback - Called with an error, if any, once the operation
     * completes.
     */
    destroy(sid: string, callback?: (err?: any) => void): void {
        try {
            this.#sessionTable.delete(sid);
            callback?.(null);
        } catch (err) {
            if (callback) {
                callback(err);
            } else {
                throw err;
            }
        }
    }
}