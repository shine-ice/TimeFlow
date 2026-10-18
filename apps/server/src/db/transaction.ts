import type { Knex } from "knex";
import { db } from "./knex";

const TRANSACTION_RETRY_DELAYS_MS = [10, 20, 40, 80, 160, 200, 200];

function isRetryableTransactionError(error: unknown) {
  if (typeof error !== "object" || error === null) return false;
  const details = error as { code?: string; errno?: number; sqlState?: string };
  return (
    details.code === "SQLITE_BUSY" ||
    details.code === "ER_LOCK_DEADLOCK" ||
    details.code === "ER_LOCK_WAIT_TIMEOUT" ||
    details.errno === 1213 ||
    details.errno === 1205 ||
    details.sqlState === "40001"
  );
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export async function runTransaction<T>(
  work: (trx: Knex.Transaction) => Promise<T>,
) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await db.transaction(work);
    } catch (error) {
      const retryDelay = TRANSACTION_RETRY_DELAYS_MS[attempt];
      if (!isRetryableTransactionError(error) || retryDelay === undefined) {
        throw error;
      }
      await delay(retryDelay);
    }
  }
}
