import { describe, it, expect } from "vitest";
import { buildReport, ordersToCsv } from "./reports";
import type { Order, Payment, Staff } from "./types";

const now = new Date().toISOString();

function order(partial: Partial<Order> & { id: string; number: number }): Order {
  return {
    table_id: null,
    type: "dine_in",
    source: "pos",
    status: "served",
    customer_note: null,
    subtotal: 0,
    discount: 0,
    total: 0,
    created_by: null,
    created_at: now,
    updated_at: now,
    items: [],
    table: null,
    ...partial,
  };
}

function payment(p: Partial<Payment> & { id: string; order_id: string }): Payment {
  return {
    method: "cash",
    amount: 0,
    received: null,
    change: null,
    created_by: null,
    created_at: now,
    ...p,
  };
}

const staff: Staff[] = [
  { id: "s1", name: "Кассир", role: "cashier", is_active: true, created_at: now },
];

describe("buildReport", () => {
  it("түшүмдү төлөмдөр боюнча эсептейт", () => {
    const orders: Order[] = [
      order({
        id: "o1",
        number: 1,
        total: 300,
        items: [
          {
            id: "i1",
            order_id: "o1",
            product_id: "p1",
            name: "Плов",
            price: 300,
            qty: 1,
            status: "served",
            note: null,
            created_at: now,
          },
        ],
      }),
      order({ id: "o2", number: 2, total: 200, status: "pending" }), // төлөнө элек
    ];
    const payments: Payment[] = [
      payment({ id: "pay1", order_id: "o1", amount: 300, method: "card", created_by: "s1" }),
    ];

    const r = buildReport(orders, payments, staff, "today");
    expect(r.revenue).toBe(300);
    expect(r.checks).toBe(1);
    expect(r.avgCheck).toBe(300);
    expect(r.topItems[0]).toMatchObject({ name: "Плов", qty: 1, sum: 300 });
    expect(r.methods.find((m) => m.method === "card")?.amount).toBe(300);
    expect(r.cashiers[0]).toMatchObject({ name: "Кассир", amount: 300 });
  });

  it("активдүү заказдарды санайт (pending/cooking/ready)", () => {
    const orders: Order[] = [
      order({ id: "a", number: 1, status: "pending" }),
      order({ id: "b", number: 2, status: "cooking" }),
      order({ id: "c", number: 3, status: "served" }),
    ];
    const r = buildReport(orders, [], staff, "today");
    expect(r.active).toBe(2);
  });
});

describe("ordersToCsv", () => {
  it("CSV баш сабы жана сапты түзөт", () => {
    const csv = ordersToCsv([order({ id: "o1", number: 5, total: 150 })]);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("Номер");
    expect(lines[1]).toContain("5");
    expect(lines[1]).toContain("150");
  });
});
