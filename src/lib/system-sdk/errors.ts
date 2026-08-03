import type {
  MaicoreExceptionName,
  ValidationErrorShape,
  DomainExceptionShape,
} from "./types.js";

/**
 * Base class for all errors raised by the SDK's HTTP layer.
 */
export class MaicoreError extends Error {
  readonly status: number;
  readonly url: string;
  readonly body: unknown;

  constructor(message: string, status: number, url: string, body: unknown) {
    super(message);
    this.name = "MaicoreError";
    this.status = status;
    this.url = url;
    this.body = body;
    Object.setPrototypeOf(this, MaicoreError.prototype);
  }
}

/** 401 — missing or invalid bearer token. */
export class MaicoreAuthenticationError extends MaicoreError {
  constructor(status: number, url: string, body: unknown) {
    super("Authentication failed: missing or invalid token.", status, url, body);
    this.name = "MaicoreAuthenticationError";
    Object.setPrototypeOf(this, MaicoreAuthenticationError.prototype);
  }
}

/** 403 — authenticated but lacks permission (e.g. missing system.admin). */
export class MaicoreForbiddenError extends MaicoreError {
  constructor(status: number, url: string, body: unknown) {
    super("Forbidden: authenticated actor lacks required permission.", status, url, body);
    this.name = "MaicoreForbiddenError";
    Object.setPrototypeOf(this, MaicoreForbiddenError.prototype);
  }
}

/** 404 — resource not found. */
export class MaicoreNotFoundError extends MaicoreError {
  constructor(status: number, url: string, body: unknown) {
    super("Resource not found.", status, url, body);
    this.name = "MaicoreNotFoundError";
    Object.setPrototypeOf(this, MaicoreNotFoundError.prototype);
  }
}

/** 422 — validation error. Carries field-level errors. */
export class MaicoreValidationError extends MaicoreError {
  readonly errors: Record<string, string[]>;

  constructor(status: number, url: string, body: ValidationErrorShape) {
    super(body.message ?? "Validation failed.", status, url, body);
    this.name = "MaicoreValidationError";
    this.errors = body.errors ?? {};
    Object.setPrototypeOf(this, MaicoreValidationError.prototype);
  }
}

/** 501 — endpoint intentionally not implemented (e.g. driver deactivate/update). */
export class MaicoreNotImplementedError extends MaicoreError {
  constructor(status: number, url: string, body: unknown) {
    super("This endpoint is not yet implemented by the platform.", status, url, body);
    this.name = "MaicoreNotImplementedError";
    Object.setPrototypeOf(this, MaicoreNotImplementedError.prototype);
  }
}

/**
 * 500 — a named domain exception (Section 17). Preserves the specific
 * exception class name from `exception` so callers can `instanceof`-style
 * branch via `.exceptionName`.
 */
export class MaicoreDomainError extends MaicoreError {
  readonly exceptionName: MaicoreExceptionName | string;

  constructor(status: number, url: string, body: DomainExceptionShape) {
    super(body.message ?? "A domain error occurred.", status, url, body);
    this.name = "MaicoreDomainError";
    // exception is a fully-qualified class name; take the last segment.
    const parts = (body.exception ?? "").split("\\");
    this.exceptionName = parts[parts.length - 1] || "UnknownException";
    Object.setPrototypeOf(this, MaicoreDomainError.prototype);
  }
}

/** Network-level failure (fetch threw, timeout, DNS, etc.) */
export class MaicoreNetworkError extends MaicoreError {
  constructor(message: string, url: string, cause: unknown) {
    super(message, 0, url, cause);
    this.name = "MaicoreNetworkError";
    Object.setPrototypeOf(this, MaicoreNetworkError.prototype);
  }
}

/**
 * Inspects a failed HTTP response and throws the most specific error type
 * available. Called internally by the HTTP client — not usually needed
 * directly by SDK consumers.
 */
export async function throwForStatus(
  response: Response,
  url: string
): Promise<never> {
  let body: unknown = undefined;

  try {
    body = await response.json();
  } catch {
    // no JSON body (e.g. empty 204/401 without payload)
  }

  const status = response.status;

  switch (status) {
    case 401:
      throw new MaicoreAuthenticationError(status, url, body);
    case 403:
      throw new MaicoreForbiddenError(status, url, body);
    case 404:
      throw new MaicoreNotFoundError(status, url, body);
    case 422:
      throw new MaicoreValidationError(status, url, body as ValidationErrorShape);
    case 501:
      throw new MaicoreNotImplementedError(status, url, body);
    case 500: {
      const shape = body as Partial<DomainExceptionShape> | undefined;

      if (shape && typeof shape.exception === "string") {
        throw new MaicoreDomainError(status, url, shape as DomainExceptionShape);
      }

      throw new MaicoreError(
        (shape && shape.message) || "Internal server error.",
        status,
        url,
        body
      );
    }
    default:
      throw new MaicoreError(
        `Unexpected response (${status}) from ${url}`,
        status,
        url,
        body
      );
  }
}
