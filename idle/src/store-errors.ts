/** Typed persistence errors for the JSON save layer. */

export type StoreErrorCode =
  | "STORE_ENOENT"
  | "STORE_JSON_INVALID"
  | "STORE_STRUCTURE_INVALID"
  | "STORE_PERMISSION"
  | "STORE_IO_READ"
  | "STORE_IO_WRITE"
  | "STORE_SCHEMA_INCOMPATIBLE"
  | "STORE_PERSISTENCE_BLOCKED"
  | "STORE_BACKUP_INVALID"
  | "STORE_NOT_FOUND";

export class StoreError extends Error {
  readonly code: StoreErrorCode;
  readonly status: number;
  readonly causeDetail?: unknown;

  constructor(code: StoreErrorCode, message: string, status = 500, causeDetail?: unknown) {
    super(message);
    this.name = "StoreError";
    this.code = code;
    this.status = status;
    this.causeDetail = causeDetail;
  }
}

export function isStoreError(err: unknown): err is StoreError {
  return err instanceof StoreError;
}
