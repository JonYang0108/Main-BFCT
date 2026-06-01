import { getCurrentUser, supabase } from "@/integrations/supabase/client";
import { toAppError } from "@/lib/supabaseError";
import type { UserValidIdRow } from "@/types/domain";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const VALID_ID_BUCKET = "valid-ids";
const RECEIPT_BUCKET = "receipts";
const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function ensureAllowedFile(file: File): void {
  if (!ALLOWED_FILE_TYPES.has(file.type)) {
    throw new Error("Only JPG, PNG, WEBP, or PDF files are allowed.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Files must be 5MB or smaller.");
  }
}

async function requireUserId(explicitUserId?: string): Promise<string> {
  if (explicitUserId) {
    return explicitUserId;
  }

  const user = await getCurrentUser();

  if (!user) {
    throw new Error("You must be signed in to upload files.");
  }

  return user.id;
}

async function createSignedUrl(
  bucket: string,
  storagePath: string,
  expiresInSeconds = 300,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw toAppError(error, "Unable to create a signed file URL.");
  }

  return data.signedUrl;
}

export const fileService = {
  async deleteValidId(id: string): Promise<void> {
    const { data: record, error: loadError } = await supabase
      .from("user_valid_ids")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (loadError) {
      throw toAppError(loadError, "Unable to load the uploaded ID.");
    }

    if (!record) {
      return;
    }

    const { error: storageError } = await supabase.storage
      .from(VALID_ID_BUCKET)
      .remove([record.storage_path]);

    if (storageError) {
      throw toAppError(storageError, "Unable to delete the uploaded file.");
    }

    const { error: deleteError } = await supabase
      .from("user_valid_ids")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw toAppError(deleteError, "Unable to remove the file record.");
    }
  },

  async getReceiptUrl(storagePath: string): Promise<string> {
    return createSignedUrl(RECEIPT_BUCKET, storagePath);
  },

  async getValidIdUrl(storagePath: string): Promise<string> {
    return createSignedUrl(VALID_ID_BUCKET, storagePath);
  },

  async getValidIds(userId?: string): Promise<UserValidIdRow[]> {
    const targetUserId = await requireUserId(userId);
    const { data, error } = await supabase
      .from("user_valid_ids")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });

    if (error) {
      throw toAppError(error, "Unable to load your uploaded IDs.");
    }

    return data ?? [];
  },

  async uploadReceipt(paymentId: string, file: File): Promise<string> {
    ensureAllowedFile(file);

    const userId = await requireUserId();
    const safeName = sanitizeFileName(file.name);
    const storagePath = `${userId}/${paymentId}-${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(RECEIPT_BUCKET)
      .upload(storagePath, file, {
        upsert: false,
      });

    if (uploadError) {
      throw toAppError(uploadError, "Unable to upload the receipt file.");
    }

    const { error: updateError } = await supabase
      .from("payments")
      .update({
        receipt_url: storagePath,
      })
      .eq("id", paymentId);

    if (updateError) {
      throw toAppError(
        updateError,
        "Unable to attach the receipt to the payment.",
      );
    }

    return storagePath;
  },

  async uploadValidId(
    file: File,
    userId?: string,
  ): Promise<UserValidIdRow> {
    ensureAllowedFile(file);

    const targetUserId = await requireUserId(userId);

    const safeName = sanitizeFileName(file.name);

    const storagePath = `${targetUserId}/${Date.now()}-${safeName}`;

    // STORAGE UPLOAD
    const { error: uploadError } = await supabase.storage
      .from("valid-ids")
      .upload(storagePath, file, {
        upsert: false,
      });

    if (uploadError) {
      console.error(
        "STORAGE ERROR:",
        uploadError,
      );

      throw toAppError(
        uploadError,
        "Unable to upload valid ID.",
      );
    }

    // MANUAL DATABASE INSERT
    const { data, error } = await supabase
      .from("user_valid_ids")
      .insert({
        user_id: targetUserId,

        file_name: file.name,

        file_type: file.type,

        file_url: storagePath,

        storage_path: storagePath,
      } as never)
      .select()
      .single();

    if (error || !data) {
      console.error(
        "DB INSERT ERROR:",
        error,
      );

      // rollback uploaded file
      await supabase.storage
        .from("valid-ids")
        .remove([storagePath]);

      throw toAppError(
        error,
        "Unable to save valid ID record.",
      );
    }

    return data;
  },
};

export default fileService;
