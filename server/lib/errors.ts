export type ErrorCode =
  | 'bad_request'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'policy_blocked'
  | 'unavailable'
  | 'payload_too_large'
  | 'unsupported_media'
  | 'internal';

const STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  policy_blocked: 422,
  unavailable: 503,
  payload_too_large: 413,
  unsupported_media: 415,
  internal: 500,
};

/** An error that is safe to show to the client (code + short message + optional details). */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
  get status() {
    return STATUS[this.code];
  }
}

export const fail = (code: ErrorCode, message: string, details?: Record<string, unknown>): never => {
  throw new AppError(code, message, details);
};
