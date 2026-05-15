import {
  AuthApiError,
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractRecordMessage(value: Record<string, unknown>): string | null {
  const candidates = [
    value.message,
    value.error,
    value.details,
    value.hint,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return null;
}

export function extractSupabaseErrorMessage(
  error: unknown,
  fallback = "Something went wrong.",
): string {
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  if (error instanceof AuthApiError) {
    return error.message;
  }

  if (error instanceof FunctionsFetchError) {
    return "Unable to reach the requested Supabase Edge Function.";
  }

  if (error instanceof FunctionsRelayError) {
    return "Supabase could not relay the Edge Function request.";
  }

  if (error instanceof FunctionsHttpError) {
    return "The Edge Function returned an unexpected response.";
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (isRecord(error)) {
    const recordMessage = extractRecordMessage(error);
    if (recordMessage) {
      return recordMessage;
    }
  }

  return fallback;
}

export function toAppError(
  error: unknown,
  fallback = "Something went wrong.",
): Error {
  return new Error(extractSupabaseErrorMessage(error, fallback));
}
