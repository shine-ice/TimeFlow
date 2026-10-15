export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "INVALID_REFRESH"
  | "INTERNAL_SERVER_ERROR"
  | "CONFLICT"
  | "EMAIL_EXISTS";

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;
  details?: any;

  constructor(
    status: number,
    code: ApiErrorCode,
    message?: string,
    details?: any,
  ) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function err(code: ApiErrorCode, message?: string, details?: any) {
  return { error: { code, message: message || code, details } };
}
