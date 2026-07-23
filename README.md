# @bleed-believer/connect-sqlite3

A SQLite-backed session store for [`express-session`](https://www.npmjs.com/package/express-session), built on top of [`better-sqlite3`](https://www.npmjs.com/package/better-sqlite3).

## Installation

```bash
npm install @bleed-believer/connect-sqlite3 express-session better-sqlite3
```

`express-session` and `better-sqlite3` are peer dependencies of this store — install them alongside it.

## Usage

```ts
import express from 'express';
import session from 'express-session';
import { SQLite3Store } from '@bleed-believer/connect-sqlite3';

const app = express();

app.use(session({
    store: new SQLite3Store('./sessions.db', 'sessions'),
    secret: 'change-me',
    resave: false,
    saveUninitialized: false
}));

app.get('/', (req, res) => {
    req.session.json ??= { visits: 0 };
    req.session.json.visits += 1;

    res.send(`You've visited this page ${req.session.json.visits} time(s).`);
});

app.listen(3000);
```

Every session's arbitrary payload is stored under `req.session.json` — importing this package augments `express-session`'s `SessionData` type with that property, so `req.session.json` is typed out of the box.

The underlying SQLite table (and database file) is created automatically on first use; there is no manual setup step.

## `SQLite3Store`

```ts
new SQLite3Store(target, tableName, options?)
```

| Parameter    | Type                   | Description |
| ------------ | ---------------------- | ----------- |
| `target`     | `string \| Buffer`     | Path to the SQLite database file (or an in-memory buffer), forwarded to `better-sqlite3`. |
| `tableName`  | `string`               | Name of the table used to store sessions. |
| `options`    | `better-sqlite3.Options` (optional) | Connection options forwarded to `better-sqlite3`. |

`SQLite3Store` extends `express-session`'s `Store`, so it implements the full standard store interface (`get`, `set`, `touch`, `destroy`, `all`, `length`, `clear`) and can be passed directly to `express-session`'s `store` option, as shown above. You generally won't call these methods yourself — `express-session` calls them for you as requests come in.

### Behavior notes

- **`touch(sid, session, callback)`** only refreshes a session that already exists; it never creates one.
- Every method (`get`, `set`, `touch`, `destroy`, `all`, `length`) purges expired sessions before performing its own operation. `clear` doesn't need this pass since it wipes the table itself.
- Expiration is driven by the session cookie's `maxAge`/`expires`; a session with no expiry never gets swept by the cleanup pass.

## Development

```bash
node --run test    # run the test suite (node:test)
node --run build   # transpile to dist/ and emit type declarations
```
