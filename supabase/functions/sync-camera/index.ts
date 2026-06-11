import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RemoteCaptureData {
  device_id: string;
  capture_type: "photo" | "video";
  camera: "front" | "back";
  file_url: string;
  thumbnail_url?: string;
  file_size?: number;
  duration_seconds?: number;
  status: "pending" | "capturing" | "completed" | "failed";
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

  let body: RemoteCaptureData | RemoteCaptureData[];
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const captures = Array.isArray(body) ? body : [body];

  const deviceIds = [...new Set(captures.map((c) => c.device_id))];
  const { data: devices } = await supabase
    .from("devices")
    .select("id, user_id")
    .in("id", deviceIds);

  const userDeviceIds = new Set(
    devices?.filter((d) => d.user_id === user.id).map((d) => d.id) || []
  );

  const validCaptures = captures.filter((c) => userDeviceIds.has(c.device_id));

  if (validCaptures.length === 0) {
    return new Response(JSON.stringify({ error: "No valid captures for authorized devices" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const captureRecords = validCaptures.map((c) => ({
    device_id: c.device_id,
    capture_type: c.capture_type,
    camera: c.camera || "back",
    file_url: c.file_url,
    thumbnail_url: c.thumbnail_url || null,
    file_size: c.file_size || null,
    duration_seconds: c.duration_seconds || null,
    status: c.status || "completed",
    timestamp: c.timestamp,
  }));

  const { error: insertError } = await supabase
    .from("remote_captures")
    .insert(captureRecords);

  if (insertError) {
    return new Response(JSON.stringify({ error: "Failed to insert remote captures", details: insertError.message }), {
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
    inserted: captureRecords.length,
    message: "Remote captures synced successfully",
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
