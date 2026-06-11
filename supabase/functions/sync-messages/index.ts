import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MessageData {
  device_id: string;
  contact_name?: string;
  phone_number: string;
  message_text: string;
  message_type: "incoming" | "outgoing";
  platform: "sms" | "whatsapp" | "telegram" | "messenger";
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

  let body: MessageData | MessageData[];
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const messages = Array.isArray(body) ? body : [body];

  const deviceIds = [...new Set(messages.map((m) => m.device_id))];
  const { data: devices } = await supabase
    .from("devices")
    .select("id, user_id")
    .in("id", deviceIds);

  const userDeviceIds = new Set(
    devices?.filter((d) => d.user_id === user.id).map((d) => d.id) || []
  );

  const validMessages = messages.filter((m) => userDeviceIds.has(m.device_id));

  if (validMessages.length === 0) {
    return new Response(JSON.stringify({ error: "No valid messages for authorized devices" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const messageRecords = validMessages.map((m) => ({
    device_id: m.device_id,
    contact_name: m.contact_name || null,
    phone_number: m.phone_number,
    message_text: m.message_text,
    message_type: m.message_type,
    platform: m.platform || "sms",
    timestamp: m.timestamp,
  }));

  const { error: insertError } = await supabase
    .from("messages")
    .insert(messageRecords);

  if (insertError) {
    return new Response(JSON.stringify({ error: "Failed to insert messages", details: insertError.message }), {
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
    inserted: messageRecords.length,
    message: "Messages synced successfully",
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
