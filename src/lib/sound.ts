// Заказ даяр болгонун үн менен жарыялоо.
// Үн файлдары: /public/sounds/orders/1.mp3 ... 100.mp3
// Заказ номери 100дөн ашканда кайра 1ден башталат (циклдик).
// Файл ассетте жок болсо — эч кандай ката чыкпайт (унчукпай өткөрүп жиберет).

/** Номерди 1..100 диапазонуна келтирет */
export function announceNumber(orderNumber: number): number {
  const mod = orderNumber % 100;
  return mod === 0 ? 100 : mod;
}

/** Заказ даяр болгонун жарыялаган үндү ойнотот */
export function playOrderReady(orderNumber: number): void {
  if (typeof window === "undefined") return;
  const n = announceNumber(orderNumber);
  try {
    const audio = new Audio(`/sounds/orders/${n}.mp3`);
    // Жүктөө/ойнотуу катасы болсо — унчукпай өткөрүп жиберебиз
    audio.addEventListener("error", () => {});
    const p = audio.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        /* файл жок же autoplay тыюу салынган — этибар албайбыз */
      });
    }
  } catch {
    /* эч кандай ката чыгарбайбыз */
  }
}
