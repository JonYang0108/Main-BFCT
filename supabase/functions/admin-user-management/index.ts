import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * ENTERPRISE-GRADE DENO EDGE FUNCTION
 *
 * Admin user management for Supabase
 * - Create vendor accounts (admin only)
 * - Delete vendor accounts (admin only)
 *
 * PRODUCTION REQUIREMENTS:
 * - All errors caught and logged
 * - All responses valid JSON
 * - All database operations atomic
 * - All cleanup operations defensive
 * - All inputs validated
 * - All env vars validated at request time
 */

interface DenoNamespace {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (request: Request) => Promise<Response>): Promise<void>;
}

declare const Deno: DenoNamespace;

// ============================================================================
// LOGGING & DIAGNOSTICS
// ============================================================================

function createRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
const REQUEST_ID = createRequestId();

interface LogEntry {
  timestamp: string;
  requestId: string;
  level: "info" | "warn" | "error" | "debug";
  operation: string;
  data?: Record<string, unknown>;
  error?: string;
  errorStack?: string;
}

function log(
  level: "info" | "warn" | "error" | "debug",
  operation: string,
  data?: Record<string, unknown>,
  error?: Error,
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    requestId: REQUEST_ID,
    level,
    operation,
    data,
    error: error?.message,
    errorStack: error?.stack,
  };

  const message = `[${level.toUpperCase()}] ${operation}`;
  if (level === "error") {
    console.error(message, JSON.stringify(entry, null, 2));
  } else {
    console.log(message, JSON.stringify(entry, null, 2));
  }
}

// ============================================================================
// CORS & RESPONSE HELPERS
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, Authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

/**
 * Safe response creation that NEVER throws
 * Ensures all responses are valid JSON
 */
function createSafeResponse(body: unknown, init?: ResponseInit): Response {
  try {
    // Sanitize body to ensure it's JSON serializable
    const sanitized = sanitizeForJSON(body);
    const jsonBody = JSON.stringify(sanitized);

    return new Response(jsonBody, {
      ...init,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        ...(init?.headers ?? {}),
      },
    });
  } catch (jsonError) {
    // FALLBACK: If JSON.stringify fails, return plain text error
    console.error(
      "CRITICAL: createSafeResponse JSON serialization failed",
      jsonError,
    );
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        code: "JSON_SERIALIZATION_FAILED",
        requestId: REQUEST_ID,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    );
  }
}

/**
 * Recursively sanitize object to ensure JSON serializability
 */
function sanitizeForJSON(obj: unknown, depth = 0): unknown {
  // Prevent deep recursion
  if (depth > 10) return "[Circular]";

  if (obj === null || obj === undefined) return obj;

  if (typeof obj !== "object") return obj;

  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      code: (obj as unknown as Record<string, unknown>)?.code as
        | string
        | undefined,
    };
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForJSON(item, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = (obj as Record<string, unknown>)[key];
      result[key] = sanitizeForJSON(value, depth + 1);
    }
  }

  return result;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

class HttpError extends Error {
  constructor(
    public status: number,
    override message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

class ValidationError extends HttpError {
  constructor(message: string) {
    super(400, message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

class AuthenticationError extends HttpError {
  constructor(message: string) {
    super(401, message, "AUTHENTICATION_ERROR");
    this.name = "AuthenticationError";
  }
}

class AuthorizationError extends HttpError {
  constructor(message: string) {
    super(403, message, "AUTHORIZATION_ERROR");
    this.name = "AuthorizationError";
  }
}

class ConflictError extends HttpError {
  constructor(message: string) {
    super(409, message, "CONFLICT_ERROR");
    this.name = "ConflictError";
  }
}

// ============================================================================
// ENVIRONMENT VALIDATION
// ============================================================================

interface ValidatedEnv {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}

function validateEnvironment(): ValidatedEnv {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl) {
    throw new HttpError(
      500,
      "SUPABASE_URL not configured",
      "ENV_SUPABASE_URL_MISSING",
    );
  }

  if (!supabaseServiceRoleKey) {
    throw new HttpError(
      500,
      "SUPABASE_SERVICE_ROLE_KEY not configured",
      "ENV_SERVICE_ROLE_KEY_MISSING",
    );
  }

  if (!supabaseUrl.startsWith("https://")) {
    throw new HttpError(
      500,
      "SUPABASE_URL must be HTTPS",
      "ENV_SUPABASE_URL_INVALID",
    );
  }

  if (supabaseServiceRoleKey.length < 20) {
    throw new HttpError(
      500,
      "SUPABASE_SERVICE_ROLE_KEY invalid format",
      "ENV_SERVICE_ROLE_KEY_INVALID_FORMAT",
    );
  }

  return { supabaseUrl, supabaseServiceRoleKey };
}

// ============================================================================
// REQUEST PARSING & VALIDATION
// ============================================================================

type AdminAction = "create-vendor" | "delete-user";

interface CreateVendorPayload {
  action: "create-vendor";
  address: string | null;
  businessName: string | null;
  email: string;
  fullName: string;
  password: string;
  phone: string | null;
}

interface DeleteUserPayload {
  action: "delete-user";
  userId: string;
}

type RequestPayload = CreateVendorPayload | DeleteUserPayload;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function requireStringField(
  payload: Record<string, unknown>,
  key: string,
): string {
  const value = asNullableString(payload[key]);
  if (!value) throw new ValidationError(`Missing required field: ${key}`);
  return value;
}

function validateEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new ValidationError(`Invalid email format: ${email}`);
  }
  if (trimmed.length > 254) {
    throw new ValidationError("Email too long (max 254 characters)");
  }
  return trimmed;
}

function validatePassword(password: string): string {
  if (password.length < 8) {
    throw new ValidationError("Password must be at least 8 characters");
  }
  if (password.length > 128) {
    throw new ValidationError("Password too long (max 128 characters)");
  }
  return password;
}

function validateUserId(userId: string): string {
  if (!/^[a-f0-9-]{36}$/.test(userId)) {
    throw new ValidationError("Invalid user ID format");
  }
  return userId;
}

async function parseRequestPayload(request: Request): Promise<RequestPayload> {
  let jsonData: unknown;

  try {
    const contentType = request.headers.get("Content-Type");
    if (!contentType?.includes("application/json")) {
      throw new ValidationError("Content-Type must be application/json");
    }

    const text = await request.text();
    if (!text) {
      throw new ValidationError("Request body is empty");
    }

    jsonData = JSON.parse(text);
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    throw new ValidationError(`Invalid JSON payload: ${errorMessage}`);
  }

  if (!isRecord(jsonData)) {
    throw new ValidationError("Request body must be a JSON object");
  }

  const action = jsonData.action;

  if (action === "create-vendor") {
    return {
      action,
      address: asNullableString(jsonData.address),
      businessName: asNullableString(jsonData.businessName),
      email: validateEmail(requireStringField(jsonData, "email")),
      fullName: requireStringField(jsonData, "fullName"),
      password: validatePassword(requireStringField(jsonData, "password")),
      phone: asNullableString(jsonData.phone),
    };
  }

  if (action === "delete-user") {
    return {
      action,
      userId: validateUserId(requireStringField(jsonData, "userId")),
    };
  }

  throw new ValidationError(`Unsupported action: ${String(action)}`);
}

// ============================================================================
// AUTHENTICATION & AUTHORIZATION
// ============================================================================

async function verifyAdmin(
  request: Request,
  supabase: SupabaseClient,
): Promise<string> {
  const authorization = request.headers.get("Authorization");
  const token = authorization?.replace("Bearer ", "").trim();

  if (!token) {
    throw new AuthenticationError("Missing authorization token");
  }

  log("info", "auth.verifyAdmin", { hasToken: true });

  let user;
  let authError: Error | null = null;

  try {
    const response = await supabase.auth.getUser(token);
    user = response.data?.user;
    authError = response.error || null;
  } catch (error) {
    authError = error instanceof Error ? error : new Error(String(error));
  }

  if (authError || !user) {
    const errorMessage = authError?.message || "User not found";
    log("warn", "auth.verifyAdmin failed", {
      reason: "Invalid token",
      error: errorMessage,
    });
    throw new AuthenticationError(`Unauthorized: ${errorMessage}`);
  }

  log("info", "auth.verifyAdmin token validated", { userId: user.id });

  // Check admin role
  let adminRole;
  let roleError: Error | null = null;

  try {
    const response = await supabase
      .from("user_roles")
      .select("role", { count: "exact" })
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    adminRole = response.data;
    roleError = response.error || null;
  } catch (error) {
    roleError = error instanceof Error ? error : new Error(String(error));
  }

  if (roleError || !adminRole) {
    const errorMessage = roleError?.message || "No admin role found";
    log("warn", "auth.verifyAdmin role check failed", {
      userId: user.id,
      error: errorMessage,
    });
    throw new AuthorizationError(`Admin role required: ${errorMessage}`);
  }

  log("info", "auth.verifyAdmin admin confirmed", { userId: user.id });
  return user.id;
}

// ============================================================================
// VENDOR ACCOUNT OPERATIONS
// ============================================================================

interface CreateVendorResult {
  success: boolean;
  userId: string;
}

async function createVendorAccount(
  payload: CreateVendorPayload,
  supabase: SupabaseClient,
): Promise<CreateVendorResult> {
  log("info", "vendor.create started", { email: payload.email });

  // Check for existing profile
  log("info", "vendor.create checking existing email");
  let existingProfile;
  let checkError: Error | null = null;

  try {
    const response = await supabase
      .from("profiles")
      .select("user_id", { count: "exact" })
      .eq("email", payload.email)
      .maybeSingle();

    existingProfile = response.data;
    checkError = response.error || null;
  } catch (error) {
    checkError = error instanceof Error ? error : new Error(String(error));
  }

  if (checkError) {
    log("error", "vendor.create existing profile check failed", {}, checkError);
    throw new HttpError(
      500,
      `Database error: ${checkError.message}`,
      "DB_PROFILE_CHECK_FAILED",
    );
  }

  if (existingProfile) {
    log("warn", "vendor.create email conflict", {
      email: payload.email,
    });
    throw new ConflictError(
      `A vendor with email ${payload.email} already exists`,
    );
  }

  // Create auth user
  log("info", "vendor.create creating auth user", { email: payload.email });
  let createdUser;
  let createUserError: Error | null = null;

  try {
    const response = await supabase.auth.admin.createUser({
      email: payload.email,
      email_confirm: true,
      password: payload.password,
      user_metadata: {
        address: payload.address,
        business_name: payload.businessName,
        contact_number: payload.phone,
        full_name: payload.fullName,
        phone: payload.phone,
        provisioned_by_admin: true,
      },
    });

    createdUser = response.data;
    createUserError = response.error || null;
  } catch (error) {
    createUserError = error instanceof Error ? error : new Error(String(error));
  }

  if (createUserError || !createdUser?.user) {
    const errorMessage = createUserError?.message || "Unknown error";
    log(
      "error",
      "vendor.create auth user creation failed",
      {},
      createUserError || new Error(errorMessage),
    );
    throw new HttpError(
      500,
      `Failed to create auth user: ${errorMessage}`,
      "AUTH_USER_CREATION_FAILED",
    );
  }

  const userId = createdUser.user.id;
  log("info", "vendor.create auth user created", { userId });

  // Create profile record
  log("info", "vendor.create creating profile", { userId });
  let profileError: Error | null = null;

  try {
    const { error } = await supabase.from("profiles").insert({
      account_status: "active",
      address: payload.address,
      business_name: payload.businessName,
      contact_number: payload.phone,
      email: payload.email,
      full_name: payload.fullName,
      phone: payload.phone,
      role: "vendor",
      user_id: userId,
    } as Record<string, unknown>);

    profileError = error || null;
  } catch (error) {
    profileError = error instanceof Error ? error : new Error(String(error));
  }

  if (profileError) {
    await supabase.auth.admin.deleteUser(userId);
    log("error", "ROLLBACK TRIGGERED - profile failed");
    log(
      "error",
      "vendor.create profile creation failed",
      { userId },
      profileError,
    );

    // Rollback: Delete auth user
    try {
      await supabase.auth.admin.deleteUser(userId);
      log("info", "vendor.create rollback auth user deleted", { userId });
    } catch (rollbackError) {
      const err = rollbackError instanceof Error
        ? rollbackError
        : new Error(String(rollbackError));
      log("error", "vendor.create rollback failed", { userId }, err);
    }

    throw new HttpError(
      500,
      `Failed to create profile: ${profileError.message}`,
      "PROFILE_INSERT_FAILED",
    );
  }

  log("info", "vendor.create profile created", { userId });

  // Create role record
  log("info", "vendor.create creating role", { userId });
  let roleError: Error | null = null;

  try {
    const { error } = await supabase.from("user_roles").insert({
      role: "vendor",
      user_id: userId,
    } as Record<string, unknown>);

    roleError = error || null;
  } catch (error) {
    roleError = error instanceof Error ? error : new Error(String(error));
  }

  if (roleError) {
    log(
      "error",
      "vendor.create role insert failed, rolling back",
      { userId },
      roleError,
    );

    // Rollback: Delete profile, then auth user
    try {
      await supabase.from("profiles").delete().eq("user_id", userId);
      log("info", "vendor.create rollback profile deleted", { userId });
    } catch (rollbackError) {
      const err = rollbackError instanceof Error
        ? rollbackError
        : new Error(String(rollbackError));
      log(
        "error",
        "vendor.create rollback profile delete failed",
        { userId },
        err,
      );
    }

    try {
      await supabase.auth.admin.deleteUser(userId);
      log("info", "vendor.create rollback auth user deleted", { userId });
    } catch (rollbackError) {
      const err = rollbackError instanceof Error
        ? rollbackError
        : new Error(String(rollbackError));
      log(
        "error",
        "vendor.create rollback auth delete failed",
        { userId },
        err,
      );
    }

    throw new HttpError(
      500,
      `Failed to create role: ${roleError.message}`,
      "ROLE_INSERT_FAILED",
    );
  }

  log("info", "vendor.create completed successfully", { userId });
  return { success: true, userId };
}

interface DeleteVendorResult {
  success: boolean;
  userId: string;
}

async function deleteVendorAccount(
  userId: string,
  supabase: SupabaseClient,
): Promise<DeleteVendorResult> {
  log("info", "vendor.delete started", { userId });

  // Delete valid IDs
  log("info", "vendor.delete fetching valid IDs");
  let validIds: Array<{ storage_path: string }> = [];
  let validIdsError: Error | null = null;

  try {
    const response = await supabase
      .from("user_valid_ids")
      .select("storage_path", { count: "exact" })
      .eq("user_id", userId);

    validIds = response.data || [];
    validIdsError = response.error || null;
  } catch (error) {
    validIdsError = error instanceof Error ? error : new Error(String(error));
  }

  if (validIdsError) {
    log(
      "error",
      "vendor.delete valid IDs fetch failed",
      { userId },
      validIdsError,
    );
    throw new HttpError(
      500,
      `Failed to fetch valid IDs: ${validIdsError.message}`,
      "VALID_IDS_FETCH_FAILED",
    );
  }

  if (validIds.length > 0) {
    log("info", "vendor.delete removing valid ID files", {
      userId,
      count: validIds.length,
    });

    const paths = validIds.map(
      (item: { storage_path: string }) => item.storage_path,
    );
    let storageError: Error | null = null;

    try {
      const response = await supabase.storage.from("valid-ids").remove(paths);
      storageError = response.error || null;
    } catch (error) {
      storageError = error instanceof Error ? error : new Error(String(error));
    }

    if (storageError) {
      log(
        "warn",
        "vendor.delete valid ID file removal failed (non-fatal)",
        { userId },
        storageError,
      );
      // Don't throw - continue with deletion
    }
  }

  // Delete payment receipts
  log("info", "vendor.delete fetching payment receipts");
  let paymentReceipts: Array<{ receipt_url: string | null }> = [];
  let receiptsError: Error | null = null;

  try {
    const response = await supabase
      .from("payments")
      .select("receipt_url", { count: "exact" })
      .eq("vendor_id", userId)
      .not("receipt_url", "is", null);

    paymentReceipts = response.data || [];
    receiptsError = response.error || null;
  } catch (error) {
    receiptsError = error instanceof Error ? error : new Error(String(error));
  }

  if (receiptsError) {
    log(
      "error",
      "vendor.delete payment receipts fetch failed",
      { userId },
      receiptsError,
    );
    throw new HttpError(
      500,
      `Failed to fetch receipts: ${receiptsError.message}`,
      "RECEIPTS_FETCH_FAILED",
    );
  }

  const receiptPaths = (paymentReceipts || [])
    .map((item: { receipt_url: string | null }) => item.receipt_url)
    .filter(
      (value: string | null): value is string => !!value && value.length > 0,
    );

  if (receiptPaths.length > 0) {
    log("info", "vendor.delete removing receipt files", {
      userId,
      count: receiptPaths.length,
    });

    let receiptStorageError: Error | null = null;

    try {
      const response = await supabase.storage
        .from("receipts")
        .remove(receiptPaths);
      receiptStorageError = response.error || null;
    } catch (error) {
      receiptStorageError = error instanceof Error
        ? error
        : new Error(String(error));
    }

    if (receiptStorageError) {
      log(
        "warn",
        "vendor.delete receipt file removal failed (non-fatal)",
        { userId },
        receiptStorageError,
      );
      // Don't throw - continue with deletion
    }
  }

  // Update stalls
  log("info", "vendor.delete updating stalls");
  let stallError: Error | null = null;

  try {
    const { error } = await supabase
      .from("stalls")
      .update({ status: "available", vendor_id: null } as Record<
        string,
        unknown
      >)
      .eq("vendor_id", userId);
    stallError = error || null;
  } catch (error) {
    stallError = error instanceof Error ? error : new Error(String(error));
  }

  if (stallError) {
    log("error", "vendor.delete stalls update failed", { userId }, stallError);
    throw new HttpError(
      500,
      `Failed to update stalls: ${stallError.message}`,
      "STALLS_UPDATE_FAILED",
    );
  }

  // Delete from database tables
  const tables: Array<[string, string]> = [
    ["payments", "vendor_id"],
    ["user_valid_ids", "user_id"],
    ["vendor_requests", "user_id"],
    ["user_roles", "user_id"],
    ["notifications", "user_id"],
    ["profiles", "user_id"],
  ];

  for (const [table, column] of tables) {
    log("info", `vendor.delete deleting from ${table}`);
    let deleteError: Error | null = null;

    try {
      const { error } = await supabase.from(table).delete().eq(column, userId);
      deleteError = error || null;
    } catch (error) {
      deleteError = error instanceof Error ? error : new Error(String(error));
    }

    if (deleteError) {
      log(
        "error",
        `vendor.delete ${table} delete failed`,
        { userId, table },
        deleteError,
      );
      throw new HttpError(
        500,
        `Failed to delete from ${table}: ${deleteError.message}`,
        `DELETE_${table.toUpperCase()}_FAILED`,
      );
    }
  }

  // Delete auth user
  log("info", "vendor.delete deleting auth user", { userId });
  let deleteUserError: Error | null = null;

  try {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    deleteUserError = error || null;
  } catch (error) {
    deleteUserError = error instanceof Error ? error : new Error(String(error));
  }

  if (deleteUserError) {
    log(
      "error",
      "vendor.delete auth user deletion failed",
      { userId },
      deleteUserError,
    );
    throw new HttpError(
      500,
      `Failed to delete auth user: ${deleteUserError.message}`,
      "AUTH_USER_DELETE_FAILED",
    );
  }

  log("info", "vendor.delete completed successfully", { userId });
  return { success: true, userId };
}

// ============================================================================
// REQUEST HANDLER
// ============================================================================

Deno.serve(async (request: Request): Promise<Response> => {
  const method = request.method.toUpperCase();
  const path = new URL(request.url).pathname;

  log("info", "request.received", {
    method,
    path,
    hasAuth: !!request.headers.get("Authorization"),
  });

  try {
    // Handle preflight FIRST
    if (method === "OPTIONS") {
      log("info", "request.options", { path });
      return new Response("ok", {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Only POST is allowed
    if (method !== "POST") {
      log("warn", "request.invalid_method", { method });
      return createSafeResponse(
        {
          error: "Method not allowed",
          code: "METHOD_NOT_ALLOWED",
          requestId: REQUEST_ID,
        },
        { status: 405 },
      );
    }

    // Validate environment
    let env: ValidatedEnv;
    try {
      env = validateEnvironment();
    } catch (envError) {
      const err = envError instanceof Error
        ? envError
        : new Error(String(envError));
      log("error", "env.validation_failed", {}, err);
      const httpError = envError as HttpError;
      return createSafeResponse(
        {
          error: httpError instanceof HttpError
            ? httpError.message
            : "Environment configuration error",
          code: httpError?.code || "ENV_VALIDATION_FAILED",
          requestId: REQUEST_ID,
        },
        { status: 500 },
      );
    }

    // Create Supabase client
    const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);

    // Parse and validate request payload
    let payload: RequestPayload;
    try {
      payload = await parseRequestPayload(request);
      log("info", "request.payload_valid", { action: payload.action });
    } catch (parseError) {
      const err = parseError instanceof Error
        ? parseError
        : new Error(String(parseError));
      log("warn", "request.payload_invalid", {}, err);
      const httpError = parseError as HttpError;
      return createSafeResponse(
        {
          error: httpError instanceof ValidationError
            ? httpError.message
            : "Invalid request payload",
          code: httpError?.code || "PAYLOAD_VALIDATION_FAILED",
          requestId: REQUEST_ID,
        },
        { status: 400 },
      );
    }

    // Verify admin authorization
    let adminId: string;
    try {
      adminId = await verifyAdmin(request, supabase);
      log("info", "request.admin_verified", { adminId });
    } catch (authError) {
      const err = authError instanceof Error
        ? authError
        : new Error(String(authError));
      log("warn", "request.auth_failed", {}, err);
      const httpError = authError as HttpError;
      return createSafeResponse(
        {
          error: httpError?.message || "Authentication failed",
          code: httpError?.code || "AUTHENTICATION_FAILED",
          requestId: REQUEST_ID,
        },
        { status: httpError?.status || 401 },
      );
    }

    // Process action
    let result: CreateVendorResult | DeleteVendorResult;
    try {
      if (payload.action === "create-vendor") {
        log("info", "action.create_vendor", {
          email: payload.email,
          adminId,
        });
        result = await createVendorAccount(payload, supabase);
      } else if (payload.action === "delete-user") {
        log("info", "action.delete_user", {
          userId: payload.userId,
          adminId,
        });
        result = await deleteVendorAccount(payload.userId, supabase);
      } else {
        throw new ValidationError(`Unsupported action`);
      }

      log("info", "action.completed", { action: payload.action, result });
    } catch (actionError) {
      const err = actionError instanceof Error
        ? actionError
        : new Error(String(actionError));
      log("error", "action.failed", { action: payload.action, adminId }, err);
      const httpError = actionError as HttpError;
      return createSafeResponse(
        {
          error: httpError?.message || "Action failed",
          code: httpError?.code || "ACTION_FAILED",
          requestId: REQUEST_ID,
        },
        { status: httpError?.status || 500 },
      );
    }

    // Success response
    return createSafeResponse(
      {
        ...result,
        requestId: REQUEST_ID,
      },
      { status: 200 },
    );
  } catch (error) {
    // CRITICAL: Unhandled exception in handler
    const err = error instanceof Error ? error : new Error(String(error));
    log("error", "handler.unhandled_exception", {}, err);

    return createSafeResponse(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        requestId: REQUEST_ID,
      },
      { status: 500 },
    );
  }
});
