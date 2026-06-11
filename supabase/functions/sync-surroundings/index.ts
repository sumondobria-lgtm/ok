import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AmbientRecordingData {
  device_id: string;
  duration_seconds: number;
  file_url: string;
  file_size?: number;
  status: "pending" | "recording" | "completed" | "failed";
  triggered_by: "remote" | "scheduled";
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

  let body: AmbientRecordingData | AmbientRecordingData[];
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const recordings = Array.isArray(body) ? body : [body];

  const deviceIds = [...new Set(recordings.map((r) => r.device_id))];
  const { data: devices } = await supabase
    .from("devices")
    .select("id, user_id")
    .in("id", deviceIds);

  const userDeviceIds = new Set(
    devices?.filter((d) => d.user_id === user.id).map((d) => d.id) || []
  );

  const validRecordings = recordings.filter((r) => userDeviceIds.has(r.device_id));

  if (validRecordings.length === 0) {
    return new Response(JSON.stringify({ error: "No valid recordings for authorized devices" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const recordingRecords = validRecordings.map((r) => ({
    device_id: r.device_id,
    duration_seconds: r.duration_seconds,
    file_url: r.file_url,
    file_size: r.file_size || null,
    status: r.status || "completed",
    triggered_by: r.triggered_by || "remote",
    timestamp: r.timestamp,
  }));

  const { error: insertError } = await supabase
    .from("ambient_recordings")
    .insert(recordingRecords);

  if (insertError) {
    return new Response(JSON.stringify({ error: "Failed to insert ambient recordings", details: insertError.message }), {
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
    inserted: recordingRecords.length,
    message: "Ambient recordings synced successfully",
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
