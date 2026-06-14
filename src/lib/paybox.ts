// PayBox.money (Freedompay) интеграциясы — сервер тарапта гана колдонулат.
// Документация: https://paybox.money / Freedompay API.
import crypto from "crypto";

const API_URL =
  process.env.PAYBOX_API_URL || "https://api.paybox.money/init_payment.php";

function md5(s: string): string {
  return crypto.createHash("md5").update(s, "utf8").digest("hex");
}

/** PayBox кол тамгасы: md5(script;sorted_values;secret) */
export function pgSign(
  scriptName: string,
  params: Record<string, string | number>,
  secret: string,
): string {
  const ordered = Object.keys(params)
    .filter((k) => k !== "pg_sig")
    .sort()
    .map((k) => String(params[k]));
  return md5([scriptName, ...ordered, secret].join(";"));
}

export function verifyPgSig(
  scriptName: string,
  params: Record<string, string>,
  secret: string,
): boolean {
  const received = params.pg_sig;
  if (!received) return false;
  return pgSign(scriptName, params, secret) === received;
}

function randomSalt(): string {
  return crypto.randomBytes(8).toString("hex");
}

interface InitParams {
  orderId: string;
  amount: number;
  description: string;
  resultUrl: string; // webhook (pg_result_url)
  successUrl: string;
  failureUrl: string;
}

/** PayBox'ка төлөм түзүп, кардар багытталуучу URL кайтарат */
export async function payboxInit(p: InitParams): Promise<string> {
  const merchantId = process.env.PAYBOX_MERCHANT_ID;
  const secret = process.env.PAYBOX_SECRET_KEY;
  if (!merchantId || !secret) {
    throw new Error("PayBox конфигурацияланган эмес (env жок)");
  }

  const params: Record<string, string | number> = {
    pg_merchant_id: merchantId,
    pg_order_id: p.orderId,
    pg_amount: p.amount,
    pg_currency: "KGS",
    pg_description: p.description,
    pg_salt: randomSalt(),
    pg_result_url: p.resultUrl,
    pg_success_url: p.successUrl,
    pg_failure_url: p.failureUrl,
    pg_request_method: "POST",
    pg_testing_mode: process.env.PAYBOX_TESTING_MODE === "0" ? 0 : 1,
  };
  params.pg_sig = pgSign("init_payment.php", params, secret);

  const body = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  );
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const xml = await res.text();

  const status = xml.match(/<pg_status>(.*?)<\/pg_status>/)?.[1];
  const redirect = xml.match(/<pg_redirect_url>(.*?)<\/pg_redirect_url>/)?.[1];
  if (status !== "ok" || !redirect) {
    const err = xml.match(/<pg_error_description>(.*?)<\/pg_error_description>/)?.[1];
    throw new Error(err || "PayBox төлөм түзүлбөдү");
  }
  return decodeXml(redirect);
}

/** Webhook'ко жооп XML (PayBox кабыл алуу үчүн) */
export function payboxAck(secret: string, ok: boolean, message = ""): string {
  const params: Record<string, string> = {
    pg_status: ok ? "ok" : "error",
    pg_description: message,
    pg_salt: randomSalt(),
  };
  params.pg_sig = pgSign("callback", params, secret);
  return `<?xml version="1.0" encoding="utf-8"?>
<response>
  <pg_status>${params.pg_status}</pg_status>
  <pg_description>${params.pg_description}</pg_description>
  <pg_salt>${params.pg_salt}</pg_salt>
  <pg_sig>${params.pg_sig}</pg_sig>
</response>`;
}

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}
