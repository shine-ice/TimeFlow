export const ApiCode = {
  SUCCESS: "SUCCESS",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTH_UNAUTHORIZED: "AUTH_UNAUTHORIZED",
  AUTH_FORBIDDEN: "AUTH_FORBIDDEN",
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_INVALID_REFRESH_TOKEN: "AUTH_INVALID_REFRESH_TOKEN",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  CONFLICT: "CONFLICT",
  USER_EMAIL_EXISTS: "USER_EMAIL_EXISTS",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ApiErrorCode = Exclude<
  (typeof ApiCode)[keyof typeof ApiCode],
  typeof ApiCode.SUCCESS
>;

const apiErrorStatus: Record<ApiErrorCode, number> = {
  [ApiCode.VALIDATION_ERROR]: 400,
  [ApiCode.AUTH_UNAUTHORIZED]: 401,
  [ApiCode.AUTH_FORBIDDEN]: 403,
  [ApiCode.AUTH_INVALID_CREDENTIALS]: 401,
  [ApiCode.AUTH_INVALID_REFRESH_TOKEN]: 401,
  [ApiCode.RESOURCE_NOT_FOUND]: 404,
  [ApiCode.CONFLICT]: 409,
  [ApiCode.USER_EMAIL_EXISTS]: 409,
  [ApiCode.INTERNAL_ERROR]: 500,
};

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;
  data: unknown | null;

  constructor(
    code: ApiErrorCode,
    message?: string,
    data: unknown | null = null,
    status = apiErrorStatus[code],
  ) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export function err(
  code: ApiErrorCode,
  message?: string,
  data: unknown | null = null,
) {
  return { code, message: message || code, data };
}

export function ok<T>(data: T, message = "操作成功") {
  return { code: ApiCode.SUCCESS, message, data };
}
