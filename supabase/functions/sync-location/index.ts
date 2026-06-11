import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LocationData {
  device_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
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

  let body: LocationData | LocationData[];
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const locations = Array.isArray(body) ? body : [body];

  const deviceIds = [...new Set(locations.map((l) => l.device_id))];
  const { data: devices, error: deviceError } = await supabase
    .from("devices")
    .select("id, user_id")
    .in("id", deviceIds);

  if (deviceError) {
    return new Response(JSON.stringify({ error: "Database error", details: deviceError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userDeviceIds = new Set(
    devices?.filter((d) => d.user_id === user.id).map((d) => d.id) || []
  );

  const validLocations = locations.filter((l) => userDeviceIds.has(l.device_id));

  if (validLocations.length === 0) {
    return new Response(JSON.stringify({ error: "No valid locations for authorized devices" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const locationRecords = validLocations.map((l) => ({
    device_id: l.device_id,
    latitude: l.latitude,
    longitude: l.longitude,
    accuracy: l.accuracy || null,
    address: l.address || null,
    timestamp: l.timestamp,
  }));

  const { error: insertError } = await supabase
    .from("locations")
    .insert(locationRecords);

  if (insertError) {
    return new Response(JSON.stringify({ error: "Failed to insert locations", details: insertError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error: updateError } = await supabase
    .from("devices")
    .update({ last_sync: new Date().toISOString() })
    .in("id", deviceIds);

  if (updateError) {
    console.error("Failed to update last_sync:", updateError);
  }

  return new Response(JSON.stringify({
    success: true,
    inserted: locationRecords.length,
    message: "Locations synced successfully",
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
