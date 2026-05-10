import { createClient } from "@supabase/supabase-js";

import { serverEnv } from "@/lib/env";

let adminClient: ReturnType<typeof createClient> | null = null;

export function createAdminSupabaseClient() {
  adminClient ??= createClient(
    serverEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  return adminClient;
}
