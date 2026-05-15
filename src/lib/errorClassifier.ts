/**
 * Classify Supabase and application errors into human-friendly categories.
 */

export type ErrorType =
  | "network"
  | "validation"
  | "auth"
  | "forbidden"
  | "not_found"
  | "server"
  | "unknown";

export interface ClassifiedError {
  type: ErrorType;
  message: string;
  statusCode?: number;
  isRetryable: boolean;
}

/**
 * Classify an error and extract a user-friendly message
 */
export function classifyError(error: unknown): ClassifiedError {
  if (error instanceof TypeError) {
    if (
      error.message.includes("network") ||
      error.message.includes("Failed to fetch") ||
      error.message.includes("Cannot reach") ||
      error.message.includes("Load failed")
    ) {
      return {
        type: "network",
        message:
          "Cannot reach the service right now. Please check your connection and try again.",
        isRetryable: true,
      };
    }
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    if (
      msg.includes("network") ||
      msg.includes("timeout") ||
      msg.includes("failed to fetch") ||
      msg.includes("edge function") ||
      msg.includes("relay")
    ) {
      return {
        type: "network",
        message:
          "Cannot reach the service right now. Please check your connection and try again.",
        isRetryable: true,
      };
    }

    if (
      msg.includes("invalid email") ||
      msg.includes("password should be at least") ||
      msg.includes("minimum 6 characters") ||
      msg.includes("required")
    ) {
      return {
        type: "validation",
        message: error.message,
        statusCode: 400,
        isRetryable: false,
      };
    }

    if (
      msg.includes("invalid login credentials") ||
      msg.includes("invalid email or password")
    ) {
      return {
        type: "auth",
        message: "Invalid email or password.",
        statusCode: 401,
        isRetryable: false,
      };
    }

    if (
      msg.includes("email not confirmed") ||
      msg.includes("account is still pending") ||
      msg.includes("under review")
    ) {
      return {
        type: "forbidden",
        message: "Your account is still under review. Please wait for approval.",
        statusCode: 403,
        isRetryable: false,
      };
    }

    if (msg.includes("declined") || msg.includes("suspended")) {
      return {
        type: "forbidden",
        message: error.message,
        statusCode: 403,
        isRetryable: false,
      };
    }

    if (msg.includes("not found")) {
      return {
        type: "not_found",
        message: error.message,
        statusCode: 404,
        isRetryable: false,
      };
    }

    if (msg.includes("already registered")) {
      return {
        type: "validation",
        message: "Email already registered",
        statusCode: 400,
        isRetryable: false,
      };
    }

    if (msg.includes("permission denied") || msg.includes("not allowed")) {
      return {
        type: "forbidden",
        message: error.message,
        statusCode: 403,
        isRetryable: false,
      };
    }

    if (msg.includes("500") || msg.includes("unexpected") || msg.includes("failed")) {
      return {
        type: "server",
        message: error.message,
        isRetryable: true,
      };
    }

    return {
      type: "unknown",
      message: error.message,
      isRetryable: false,
    };
  }

  return {
    type: "unknown",
    message: "An error occurred. Please try again.",
    isRetryable: false,
  };
}

/**
 * Check if an error is due to the backend being unavailable
 */
export function isBackendUnavailable(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("cannot reach") ||
      msg.includes("network") ||
      msg.includes("timeout") ||
      msg.includes("failed to fetch")
    );
  }
  return false;
}

/**
 * Extract backend error message from API response or error
 */
export function extractErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;
    if (typeof obj.message === "string") {
      return obj.message;
    }
    if (typeof obj.error === "string") {
      return obj.error;
    }
  }

  return "Unknown error";
}
