import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyPgSig, payboxAck } from "@/lib/paybox";

export const runtime = "nodejs";

function xml(body: string) {
  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}

export async function POST(req: NextRequest) {
  const secret = process.env.PAYBOX_SECRET_KEY || "";

  // PayBox form-encoded жөнөтөт
  const raw = await req.text();
  const params: Record<string, string> = {};
  new URLSearchParams(raw).forEach((v, k) => (params[k] = v));

  // 1) Кол тамганы текшеребиз (жасалма webhook'тон коргоо)
  if (!verifyPgSig("callback", params, secret)) {
    return xml(payboxAck(secret, false, "Кол тамга туура эмес"));
  }

  // 2) Төлөм ийгиликтүү болсо — катталат
  const orderId = params.pg_order_id;
  const result = params.pg_result; // '1' = ийгиликтүү
  if (result === "1" && orderId) {
    const sb = supabaseAdmin();
    const { data: order } = await sb
      .from("orders")
      .select("id, total")
      .eq("id", orderId)
      .maybeSingle();

    if (order) {
      const { data: existing } = await sb
        .from("payments")
        .select("id")
        .eq("order_id", orderId)
        .maybeSingle();
      if (!existing) {
        await sb.from("payments").insert({
          order_id: orderId,
          method: "online",
          amount: Number(params.pg_amount || order.total),
          received: null,
          change: null,
          created_by: null,
        });
      }
    }
  }

  // 3) PayBox'ко ырастоо жообу
  return xml(payboxAck(secret, true, "Кабыл алынды"));
}
