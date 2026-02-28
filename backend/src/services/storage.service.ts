import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";
import { AppError } from "../utils/errors";

const hasSupabase = Boolean(env.SUPABASE_URL && env.SUPABASE_KEY);

const supabase = hasSupabase
  ? createClient(env.SUPABASE_URL as string, env.SUPABASE_KEY as string)
  : null;

export const storageService = {
  async uploadFile(input: {
    tenantId: string;
    folder: string;
    fileName: string;
    contentType: string;
    buffer: Buffer;
  }) {
    if (!supabase) {
      throw new AppError("Supabase is not configured", 500);
    }

    const objectPath = `${input.tenantId}/${input.folder}/${Date.now()}-${input.fileName}`;

    const { error } = await supabase.storage
      .from(env.SUPABASE_BUCKET)
      .upload(objectPath, input.buffer, {
        upsert: false,
        contentType: input.contentType
      });

    if (error) {
      throw new AppError(`Supabase upload failed: ${error.message}`, 502);
    }

    const { data } = supabase.storage.from(env.SUPABASE_BUCKET).getPublicUrl(objectPath);

    return {
      path: objectPath,
      publicUrl: data.publicUrl
    };
  }
};
