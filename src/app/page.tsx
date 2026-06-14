import Link from "next/link";
import {
  ChefHat,
  LayoutDashboard,
  Smartphone,
  ShoppingCart,
  ConciergeBell,
  ArrowRight,
} from "lucide-react";
import { IS_DEMO } from "@/lib/api";

const ROLES = [
  {
    href: "/pos",
    title: "Касса / POS",
    desc: "Буйрутма кабыл алуу, төлөм, чек",
    icon: ShoppingCart,
    tone: "from-amber-500/15 to-orange-500/5",
  },
  {
    href: "/kitchen",
    title: "Ашкана",
    desc: "Жаңы буйрутмалар, даярдоо статусу",
    icon: ChefHat,
    tone: "from-emerald-500/15 to-teal-500/5",
  },
  {
    href: "/waiter",
    title: "Официант",
    desc: "Даяр буйрутмаларды жеткирүү, столдор",
    icon: ConciergeBell,
    tone: "from-sky-500/15 to-cyan-500/5",
  },
  {
    href: "/admin",
    title: "Админ панел",
    desc: "Меню, баалар, столдор, отчёт",
    icon: LayoutDashboard,
    tone: "from-indigo-500/15 to-violet-500/5",
  },
  {
    href: "/menu/demo",
    title: "QR меню (демо)",
    desc: "Кардар көрө турган меню",
    icon: Smartphone,
    tone: "from-rose-500/15 to-pink-500/5",
  },
];

export default function Home() {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-sm text-muted-foreground mb-5">
            <span className="size-2 rounded-full bg-success animate-pulse" />
            Бирдиктүү кафе системасы
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Кафе <span className="text-primary">POS</span> &amp; QR меню
          </h1>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
            Буйрутма кассадан ашканага реалтайм өтөт. Кардар QR аркылуу меню
            көрөт. Баары бир жерден башкарылат.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {ROLES.map((r) => {
            const Icon = r.icon;
            return (
              <Link
                key={r.href}
                href={r.href}
                className={`group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${r.tone} p-6 transition-all hover:shadow-md hover:-translate-y-0.5`}
              >
                <div className="flex items-start justify-between">
                  <div className="rounded-xl bg-card p-3 shadow-sm">
                    <Icon className="size-6 text-primary" />
                  </div>
                  <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
                <h2 className="mt-4 text-lg font-semibold">{r.title}</h2>
                <p className="text-sm text-muted-foreground">{r.desc}</p>
              </Link>
            );
          })}
        </div>

        {IS_DEMO ? (
          <p className="mt-8 text-center text-xs text-muted-foreground">
            🔸 Азыр <b className="text-foreground">локалдык демо режим</b> —
            маалымат браузерде сакталат. Касса менен Ашкананы эки өзүнчө табта
            ачып, реалтайм агымды текшериңиз.
          </p>
        ) : (
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Supabase туташкан — маалымат базада сакталат.
          </p>
        )}
      </div>
    </main>
  );
}
