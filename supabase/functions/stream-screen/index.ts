import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface StreamSession {
  webrtc_offer?: string;
  webrtc_answer?: string;
  ice_candidates?: string;
  status: string;
  started_at?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
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

  if (req.method === "POST") {
    let body: {
      device_id: string;
      action: "start" | "offer" | "answer" | "ice" | "end";
      webrtc_offer?: string;
      webrtc_answer?: string;
      ice_candidates?: string;
      session_id?: string;
    };

    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: device } = await supabase
      .from("devices")
      .select("id, user_id")
      .eq("id", body.device_id)
      .single();

    if (!device || device.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Device not found or unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    switch (body.action) {
      case "start": {
        const { data: session, error } = await supabase
          .from("screen_stream_sessions")
          .insert({
            device_id: body.device_id,
            status: "pending",
          })
          .select()
          .single();

        if (error) {
          return new Response(JSON.stringify({ error: "Failed to create session", details: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({
          success: true,
          session_id: session.id,
          message: "Stream session created",
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "offer": {
        if (!body.session_id || !body.webrtc_offer) {
          return new Response(JSON.stringify({ error: "Missing session_id or webrtc_offer" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error } = await supabase
          .from("screen_stream_sessions")
          .update({
            webrtc_offer: body.webrtc_offer,
            status: "connecting",
            started_at: new Date().toISOString(),
          })
          .eq("id", body.session_id);

        if (error) {
          return new Response(JSON.stringify({ error: "Failed to update session", details: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({
          success: true,
          message: "WebRTC offer stored",
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "answer": {
        if (!body.session_id || !body.webrtc_answer) {
          return new Response(JSON.stringify({ error: "Missing session_id or webrtc_answer" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error } = await supabase
          .from("screen_stream_sessions")
          .update({
            webrtc_answer: body.webrtc_answer,
            status: "streaming",
          })
          .eq("id", body.session_id);

        if (error) {
          return new Response(JSON.stringify({ error: "Failed to update session", details: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({
          success: true,
          message: "WebRTC answer stored",
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "ice": {
        if (!body.session_id || !body.ice_candidates) {
          return new Response(JSON.stringify({ error: "Missing session_id or ice_candidates" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error } = await supabase
          .from("screen_stream_sessions")
          .update({
            ice_candidates: body.ice_candidates,
          })
          .eq("id", body.session_id);

        if (error) {
          return new Response(JSON.stringify({ error: "Failed to update session", details: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({
          success: true,
          message: "ICE candidates stored",
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "end": {
        if (!body.session_id) {
          return new Response(JSON.stringify({ error: "Missing session_id" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error } = await supabase
          .from("screen_stream_sessions")
          .update({
            status: "ended",
            ended_at: new Date().toISOString(),
          })
          .eq("id", body.session_id);

        if (error) {
          return new Response(JSON.stringify({ error: "Failed to end session", details: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({
          success: true,
          message: "Stream session ended",
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  }

  if (req.method === "GET") {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "Missing session_id parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: session, error } = await supabase
      .from("screen_stream_sessions")
      .select(`
        id,
        device_id,
        webrtc_offer,
        webrtc_answer,
        ice_candidates,
        status,
        started_at,
        ended_at,
        created_at,
        devices!inner(user_id)
      `)
      .eq("id", sessionId)
      .single();

    if (error || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((session.devices as { user_id: string }).user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { devices, ...sessionData } = session as { devices: { user_id: string }; [key: string]: unknown };

    return new Response(JSON.stringify({
      success: true,
      session: sessionData,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
