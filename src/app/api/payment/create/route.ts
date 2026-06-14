import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { payboxInit } from "@/lib/paybox";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "orderId керек" }, { status: 400 });
    }

    // Заказдын суммасын СЕРВЕРДЕ окуйбуз (кардар өзгөртө албашы үчүн)
    const sb = supabaseAdmin();
    const { data: order, error } = await sb
      .from("orders")
      .select("id, number, total, status")
      .eq("id", orderId)
      .maybeSingle();
    if (error || !order) {
      return NextResponse.json({ error: "Заказ табылган жок" }, { status: 404 });
    }
    if (Number(order.total) <= 0) {
      return NextResponse.json({ error: "Заказ суммасы 0" }, { status: 400 });
    }

    // Кайра төлөмдөн коргоо
    const { data: existing } = await sb
      .from("payments")
      .select("id")
      .eq("order_id", orderId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: "Бул заказ мурунтан төлөнгөн" },
        { status: 409 },
      );
    }

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;

    const redirectUrl = await payboxInit({
      orderId: order.id,
      amount: Number(order.total),
      description: `Заказ №${order.number}`,
      resultUrl: `${origin}/api/payment/callback`,
      successUrl: `${origin}/pay/result?status=success&n=${order.number}`,
      failureUrl: `${origin}/pay/result?status=fail&n=${order.number}`,
    });

    return NextResponse.json({ redirectUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ката";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
