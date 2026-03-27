import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const accounts = [
    { email: "vyvojar@test.cz", password: "TestHeslo123!", displayName: "Vývojář Tomáš", role: "developer" },
    { email: "dohledci@test.cz", password: "TestHeslo123!", displayName: "Dohledčí Karel", role: "dohledci" },
    { email: "lektor@test.cz", password: "TestHeslo123!", displayName: "Lektor Jana", role: "lektor" },
    { email: "student@test.cz", password: "TestHeslo123!", displayName: "Student Petr", role: "student" },
  ];

  const results = [];

  for (const acc of accounts) {
    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const exists = existingUsers?.users?.find((u: any) => u.email === acc.email);

    if (exists) {
      results.push({ email: acc.email, status: "already exists" });
      continue;
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: acc.email,
      password: acc.password,
      email_confirm: true,
      user_metadata: { display_name: acc.displayName },
    });

    if (authError) {
      results.push({ email: acc.email, status: "error", error: authError.message });
      continue;
    }

    const userId = authData.user.id;

    // Update role (handle_new_user trigger creates profile + student role)
    if (acc.role !== "student") {
      await supabase.from("user_roles").update({ role: acc.role }).eq("user_id", userId);
    }

    results.push({ email: acc.email, status: "created", role: acc.role });
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
