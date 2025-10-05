import { Pool, PoolClient } from 'pg';
import pool from '../config/database';
import { execute, query } from '../utils/pgQuery';

const DEFAULT_RATIO = parseFloat(process.env.DEFAULT_TOKEN_TO_CREDIT_RATIO || '1');
const SETTINGS_ID = 1;

type DbClient = Pool | PoolClient;

export interface CreditSettings {
  token_to_credit_ratio: number;
}

function normalizeRatio(value: unknown): number {
  const ratio = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return DEFAULT_RATIO;
  }
  return ratio;
}

async function ensureSettings(client: DbClient): Promise<CreditSettings> {
  await execute(
    client,
    'INSERT INTO credit_settings (id, token_to_credit_ratio) VALUES (?, ?) ON CONFLICT (id) DO NOTHING',
    [SETTINGS_ID, DEFAULT_RATIO]
  );
  return { token_to_credit_ratio: DEFAULT_RATIO };
}

export async function getCreditSettings(client?: DbClient): Promise<CreditSettings> {
  const db = client ?? pool;
  const [rows] = await query<{ token_to_credit_ratio: string }>(
    db,
    'SELECT token_to_credit_ratio FROM credit_settings WHERE id = ?',
    [SETTINGS_ID]
  );

  if (!rows || rows.length === 0) {
    return ensureSettings(db);
  }

  return {
    token_to_credit_ratio: normalizeRatio(rows[0].token_to_credit_ratio),
  };
}

export async function getTokenToCreditRatio(client?: DbClient): Promise<number> {
  const settings = await getCreditSettings(client);
  return settings.token_to_credit_ratio;
}

export async function updateTokenToCreditRatio(ratio: number, client?: DbClient): Promise<CreditSettings> {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new Error('token_to_credit_ratio must be greater than 0');
  }

  const db = client ?? pool;

  await execute(
    db,
    `INSERT INTO credit_settings (id, token_to_credit_ratio)
     VALUES (?, ?)
     ON CONFLICT (id) DO UPDATE SET token_to_credit_ratio = EXCLUDED.token_to_credit_ratio, updated_at = CURRENT_TIMESTAMP`,
    [SETTINGS_ID, ratio]
  );

  return {
    token_to_credit_ratio: ratio,
  };
}

