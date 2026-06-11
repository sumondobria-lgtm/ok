import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BrowserHistoryData {
  device_id: string;
  url: string;
  title?: string;
  visit_count?: number;
  is_blocked?: boolean;
  timestamp: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing authorization token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: BrowserHistoryData | BrowserHistoryData[];
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const historyItems = Array.isArray(body) ? body : [body];

  const deviceIds = [...new Set(historyItems.map((h) => h.device_id))];
  const { data: devices } = await supabase
    .from("devices")
    .select("id, user_id")
    .in("id", deviceIds);

  const userDeviceIds = new Set(
    devices?.filter((d) => d.user_id === user.id).map((d) => d.id) || []
  );

  const validHistoryItems = historyItems.filter((h) => userDeviceIds.has(h.device_id));

  if (validHistoryItems.length === 0) {
    return new Response(JSON.stringify({ error: "No valid browser history for authorized devices" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const historyRecords = validHistoryItems.map((h) => ({
    device_id: h.device_id,
    url: h.url,
    title: h.title || null,
    visit_count: h.visit_count || 1,
    is_blocked: h.is_blocked || false,
    timestamp: h.timestamp,
  }));

  const { error: insertError } = await supabase
    .from("browser_history")
    .insert(historyRecords);

  if (insertError) {
    return new Response(JSON.stringify({ error: "Failed to insert browser history", details: insertError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await supabase
    .from("devices")
    .update({ last_sync: new Date().toISOString() })
    .in("id", deviceIds);

  return new Response(JSON.stringify({
    success: true,
    inserted: historyRecords.length,
    message: "Browser history synced successfully",
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
