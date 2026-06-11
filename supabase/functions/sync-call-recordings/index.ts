import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CallRecordingData {
  device_id: string;
  phone_number: string;
  contact_name?: string;
  call_type: "incoming" | "outgoing";
  duration: number;
  file_url: string;
  file_size?: number;
  status: "pending" | "recording" | "completed" | "failed";
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

  let body: CallRecordingData | CallRecordingData[];
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const callRecordings = Array.isArray(body) ? body : [body];

  const deviceIds = [...new Set(callRecordings.map((c) => c.device_id))];
  const { data: devices } = await supabase
    .from("devices")
    .select("id, user_id")
    .in("id", deviceIds);

  const userDeviceIds = new Set(
    devices?.filter((d) => d.user_id === user.id).map((d) => d.id) || []
  );

  const validCallRecordings = callRecordings.filter((c) => userDeviceIds.has(c.device_id));

  if (validCallRecordings.length === 0) {
    return new Response(JSON.stringify({ error: "No valid call recordings for authorized devices" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const callRecordingRecords = validCallRecordings.map((c) => ({
    device_id: c.device_id,
    phone_number: c.phone_number,
    contact_name: c.contact_name || null,
    call_type: c.call_type,
    duration: c.duration || 0,
    file_url: c.file_url,
    file_size: c.file_size || null,
    status: c.status || "completed",
    timestamp: c.timestamp,
  }));

  const { error: insertError } = await supabase
    .from("call_recordings")
    .insert(callRecordingRecords);

  if (insertError) {
    return new Response(JSON.stringify({ error: "Failed to insert call recordings", details: insertError.message }), {
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
    inserted: callRecordingRecords.length,
    message: "Call recordings synced successfully",
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
