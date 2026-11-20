# @bleed-believer/connect-sqlite3

A SQLite-backed session store for [`express-session`](https://www.npmjs.com/package/express-session), built on top of [`better-sqlite3`](https://www.npmjs.com/package/better-sqlite3).

## Installation

```bash
npm install @bleed-believer/connect-sqlite3 express-session
```

`express-session` is a peer dependency of this store — install it alongside it. `better-sqlite3` is a regular dependency and is installed with the store.

## Usage

```ts
import express from 'express';
import session from 'express-session';
import { SQLite3Store } from '@bleed-believer/connect-sqlite3';

const app = express();

app.use(session({
    store: new SQLite3Store('./sessions.db'),
    secret: 'change-me',
    resave: false,
    saveUninitialized: false
}));

app.get('/', (req, res) => {
    req.session.visits ??= 0;
    req.session.visits += 1;

    res.send(`You've visited this page ${req.session.visits} time(s).`);
});

app.listen(3000);
```

Every top-level property you set on `req.session` (other than `cookie`, which `express-session` manages) is persisted and restored automatically — there's no dedicated payload property to nest your data under. To get it typed, declaration-merge your own shape into `SessionData`:

```ts
declare module 'express-session' {
    interface SessionData {
        visits?: number;
    }
}
```

The underlying SQLite table (and database file) is created automatically via migrations as soon as `SQLite3Store` is constructed; there is no manual setup step.

## `SQLite3Store`

```ts
new SQLite3Store(target, options?)
```

| Parameter    | Type                                  | Description |
| ------------ | ------------------------------------- | ----------- |
| `target`     | `string \| Buffer`                    | Path to the SQLite database file (or an in-memory buffer), forwarded to `better-sqlite3`. |
| `options`    | `SQLite3StoreOptions` (optional)      | See below. A `boolean` is still accepted here and means `{ verbose }`, so `new SQLite3Store(path, true)` keeps working. |

`SQLite3StoreOptions`:

| Option            | Type             | Default      | Description |
| ----------------- | ---------------- | ------------ | ----------- |
| `verbose`         | `boolean`        | `false`      | When `true`, logs every SQL statement executed against the database. |
| `purgeIntervalMs` | `number`         | `900000` (15 minutes) | How often the expired sessions are deleted. `0` disables the timer (call `purge()` yourself). The timer never keeps the process alive. |
| `now`             | `() => number`   | `Date.now`   | Returns the current time in milliseconds. Meant for tests. |

```ts
const store = new SQLite3Store('./sessions.db', {
    purgeIntervalMs: 60 * 60 * 1000 // purge once an hour
});
```

`SQLite3Store` extends `express-session`'s `Store`, so it implements the full standard store interface (`get`, `set`, `touch`, `destroy`, `all`, `length`, `clear`) and can be passed directly to `express-session`'s `store` option, as shown above. You generally won't call these methods yourself — `express-session` calls them for you as requests come in.

It also adds two methods of its own:

- **`purge(): number`** deletes every expired session right away and returns how many it deleted. Use it when the timer is disabled, or when you need the purge to happen at a specific moment.
- **`close(): void`** stops the purge timer and closes the database. Call it when your app shuts down. Calling it twice is fine; any other method called afterwards reports an error through its callback.

### Behavior notes

- Expired sessions are deleted by a timer (every 15 minutes by default) or by `purge()`, not on every call. Between purges they stay in the table, but no method ever returns them: `get` reports them as not found, and `all` and `length` skip them without deleting them.
- **`touch(sid, session, callback)`** only moves the expiration of a session that already exists, to `session.cookie.expires`. It writes nothing else, since `express-session` only calls it when the session data didn't change. It never creates a session, and it doesn't bring back one that already expired.
- **`set(sid, session, callback)`** inserts the session, or replaces it if it already exists.
- Expiration is driven by the session cookie's `maxAge`/`expires`; a session with no expiry is never purged.
- The database runs in WAL mode (`journal_mode = WAL`, `synchronous = NORMAL`), so reads and writes don't block each other. SQLite keeps two extra files next to the database, `<name>-wal` and `<name>-shm`. Keep them with it if you copy the database while the app is running.

### Upgrading from 0.1.x

0.2.0 adds a migration that runs the first time the store opens an existing database. It converts the stored expiration dates from ISO text to milliseconds and indexes them, keeping every session. A date that can't be parsed is treated as already expired. After the migration, the database can't be opened by 0.1.x anymore.

## Development

```bash
node --run test    # run the test suite (node:test)
node --run build   # transpile to dist/ and emit type declarations
```
