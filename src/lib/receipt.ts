import type { Order } from "./types";
import { CAFE_NAME, PAYMENT_METHOD_LABEL } from "./constants";

interface ReceiptOpts {
  method?: "cash" | "card" | "qr";
  received?: number | null;
  change?: number | null;
  preliminary?: boolean; // алдын ала эсеп (төлөнө элек)
}

const fmt = (n: number) =>
  Number(n).toLocaleString("ru-RU", { maximumFractionDigits: 0 });

/** 80мм термопринтерге ылайыкталган чекти жаңы терезеде ачып басат */
export function printReceipt(order: Order, opts: ReceiptOpts) {
  const now = new Date();
  const dt = now.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const rows = (order.items ?? [])
    .map(
      (it) => `
      <tr>
        <td class="l">${escapeHtml(it.name)}</td>
        <td class="c">${it.qty}</td>
        <td class="r">${fmt(it.price)}</td>
        <td class="r">${fmt(it.price * it.qty)}</td>
      </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="ky"><head><meta charset="utf-8"><title>Чек №${order.number}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:80mm; font-family:"Courier New",monospace; font-size:12px; color:#000; padding:4mm; }
  .center { text-align:center; }
  .title { font-size:16px; font-weight:bold; }
  .muted { color:#333; font-size:11px; }
  hr { border:none; border-top:1px dashed #000; margin:6px 0; }
  table { width:100%; border-collapse:collapse; }
  th,td { padding:2px 0; font-size:11px; }
  .l { text-align:left; }
  .c { text-align:center; }
  .r { text-align:right; }
  th { border-bottom:1px solid #000; }
  .totline { display:flex; justify-content:space-between; font-size:12px; padding:1px 0; }
  .grand { font-size:15px; font-weight:bold; }
  .foot { margin-top:8px; font-size:11px; }
  @media print { @page { margin:0; } }
</style></head>
<body>
  <div class="center">
    <div class="title">${escapeHtml(CAFE_NAME)}</div>
    ${opts.preliminary ? `<div class="muted"><b>АЛДЫН АЛА ЭСЕП</b></div>` : ""}
    <div class="muted">${dt}</div>
  </div>
  <hr>
  <div class="totline"><span>Чек №</span><span><b>${order.number || "—"}</b></span></div>
  <div class="totline"><span>Стол</span><span>${
    order.table?.label ?? "Алып кетүү"
  }</span></div>
  <hr>
  <table>
    <thead><tr><th class="l">Аталышы</th><th class="c">Сан</th><th class="r">Баа</th><th class="r">Сумма</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <hr>
  <div class="totline"><span>Аралык сумма</span><span>${fmt(order.subtotal)} сом</span></div>
  ${
    order.discount > 0
      ? `<div class="totline"><span>Арзандатуу</span><span>-${fmt(order.discount)} сом</span></div>`
      : ""
  }
  <div class="totline grand"><span>ЖАЛПЫ</span><span>${fmt(order.total)} сом</span></div>
  ${
    !opts.preliminary && opts.method
      ? `<hr>
  <div class="totline"><span>Төлөм</span><span>${PAYMENT_METHOD_LABEL[opts.method]}</span></div>
  ${
    opts.method === "cash" && opts.received != null
      ? `<div class="totline"><span>Берилди</span><span>${fmt(opts.received)} сом</span></div>
         <div class="totline"><span>Кайтарым</span><span>${fmt(opts.change ?? 0)} сом</span></div>`
      : ""
  }`
      : ""
  }
  <hr>
  <div class="center foot">
    ${
      opts.preliminary
        ? "Бул алдын ала эсеп — төлөм эмес"
        : "Рахмат! Дагы келиңиз 🙏"
    }<br>
    ${escapeHtml(CAFE_NAME)}
  </div>
</body></html>`;

  // Жашыруун iframe аркылуу басабыз — popup блок болбойт, авто-басуу да иштейт
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();

  let printed = false;
  const doPrint = () => {
    if (printed) return;
    printed = true;
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      /* басуу мүмкүн болбоду — этибар жок */
    }
    // Басуудан кийин iframe'ди алып салабыз
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1500);
  };

  iframe.onload = doPrint;
  // onload иштебесе — резерв
  setTimeout(doPrint, 500);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
