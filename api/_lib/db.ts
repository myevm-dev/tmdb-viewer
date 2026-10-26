import { config } from './config.js';

export interface Db {
  query<T = Record<string, any>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }>;
}

const SCHEMA = `
create table if not exists clubs (
  address          text primary key,
  kind             text not null,
  subject_id       integer not null,
  name             text not null default '',
  symbol           text not null default '',
  image            text not null default '',
  pool_id          text not null,
  paired_token     text not null,
  token0_is_club   boolean not null,
  start_price_eth  double precision,
  deployer         text,
  tx_hash          text,
  block            bigint not null,
  created_at       timestamptz not null
);
create index if not exists clubs_pool on clubs (pool_id);
create index if not exists clubs_subject on clubs (kind, subject_id);
create index if not exists clubs_created on clubs (created_at desc);

create table if not exists trades (
  tx_hash      text not null,
  log_index    integer not null,
  club         text not null,
  block        bigint not null,
  ts           timestamptz not null,
  side         text not null,
  trader       text not null,
  club_amount  double precision not null,
  eth_amount   double precision not null,
  price_eth    double precision not null,
  eth_usd      double precision,
  primary key (tx_hash, log_index)
);
create index if not exists trades_club_ts on trades (club, ts desc);
create index if not exists trades_ts on trades (ts desc);

create table if not exists sync_state (
  id            text primary key,
  block         bigint,
  eth_usd       double precision,
  eth_usd_at    timestamptz,
  updated_at    timestamptz,
  locked_until  timestamptz
);
insert into sync_state (id) values ('main') on conflict (id) do nothing;
`;

let instance: Promise<Db> | null = null;

async function connect(): Promise<Db> {
  const url = config.databaseUrl;
  if (!url)
    throw new Error('DATABASE_URL is not set — the indexer is disabled.');

  let db: Db;
  if (url.startsWith('pglite:')) {
    // Embedded Postgres for local development and tests: "pglite:" (memory) or "pglite:./.data".
    const { PGlite } = await import('@electric-sql/pglite');
    const dir = url.slice('pglite:'.length) || undefined;
    const pg = new PGlite(dir);
    await pg.waitReady;
    db = {
      query: async (text, params) => {
        if (!params?.length && text.includes(';')) {
          await pg.exec(text);
          return { rows: [] };
        }
        const r = await pg.query(text, params as any[]);
        return { rows: r.rows as any[] };
      },
    };
  } else {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString: url, max: 3 });
    db = { query: (text, params) => pool.query(text, params as any[]) as any };
  }

  await db.query(SCHEMA);
  return db;
}

export function getDb(): Promise<Db> {
  if (!instance) {
    instance = connect().catch((e) => {
      instance = null;
      throw e;
    });
  }
  return instance;
}

/** Multi-row insert helper: values(rows) -> "($1,$2),($3,$4)" + flat params. */
export function values(rows: unknown[][]) {
  const params: unknown[] = [];
  const sql = rows
    .map(
      (r) =>
        `(${r.map((v) => (params.push(v), `$${params.length}`)).join(',')})`,
    )
    .join(',');
  return { sql, params };
}
