"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { qrApi } from "@dinova/lib/qrApi";
import { SOCKET_URL } from "@dinova/lib/config";
import { io, Socket } from "socket.io-client";
import {
  Search,
  X,
  Plus,
  Minus,
  ShoppingBag,
  Loader2,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  Clock,
  MapPin,
  Leaf,
  Star,
  BadgeCheck,
  Utensils,
  Heart,
  Bell,
  ChefHat,
  ReceiptText,
  ChevronRight,
  Phone,
  Mail,
  User as UserIcon,
} from "lucide-react";
import clsx from "clsx";
import Link from "next/link";
import { ReviewPromptCard } from "@dinova/components/ReviewPromptCard";

type MenuItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  plateCost?: number;
  tags?: string[];
  station?: string;
  image?: string;
};
type Category = { id: string; name: string };
type CartEntry = {
  item: MenuItem;
  qty: number;
  note?: string;
};
type Cart = Record<string, CartEntry>;

function emojiFor(catName: string = "", itemName: string = "") {
  const c = catName.toLowerCase();
  const n = itemName.toLowerCase();
  if (n.includes("zinger") || n.includes("burger") || c.includes("burger")) return "🍔";
  if (n.includes("pizza") || c.includes("pizza")) return "🍕";
  if (n.includes("biryani") || c.includes("biryani") || c.includes("rice")) return "🍛";
  if (n.includes("wing")) return "🍗";
  if (n.includes("shawarma") || n.includes("wrap") || c.includes("wrap") || c.includes("roll")) return "🌯";
  if (n.includes("fries") || n.includes("chip")) return "🍟";
  if (n.includes("salad") || c.includes("salad")) return "🥗";
  if (n.includes("coffee")) return "☕";
  if (n.includes("margarita") || n.includes("juice") || n.includes("lime")) return "🧃";
  if (n.includes("cola") || n.includes("7up") || c.includes("beverage") || c.includes("drink")) return "🥤";
  if (n.includes("brownie") || n.includes("cake") || c.includes("dessert")) return "🍰";
  if (n.includes("fish")) return "🐟";
  if (n.includes("mozzarella") || n.includes("stick")) return "🧀";
  if (n.includes("wrap") || n.includes("veggie")) return "🥙";
  if (c.includes("side")) return "🍽️";
  return "🍽️";
}

const GRADIENTS = [
  "from-amber-200 via-orange-200 to-rose-200",
  "from-emerald-200 via-teal-200 to-sky-200",
  "from-fuchsia-200 via-pink-200 to-rose-200",
  "from-sky-200 via-indigo-200 to-violet-200",
  "from-yellow-200 via-amber-200 to-orange-300",
  "from-rose-200 via-red-200 to-orange-200",
  "from-lime-200 via-emerald-200 to-teal-200",
];

function gradientFor(name: string = "") {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

function tagMeta(tag: string) {
  const map: Record<string, { bg: string; icon: React.ReactNode }> = {
    Bestseller: { bg: "bg-amber-100 text-amber-800", icon: <BadgeCheck className="w-3 h-3" /> },
    Spicy: { bg: "bg-rose-100 text-rose-700", icon: "🌶️" },
    Veg: { bg: "bg-emerald-100 text-emerald-700", icon: <Leaf className="w-3 h-3" /> },
    Healthy: { bg: "bg-sky-100 text-sky-700", icon: "💪" },
    New: { bg: "bg-violet-100 text-violet-700", icon: <Sparkles className="w-3 h-3" /> },
  };
  return map[tag] ?? { bg: "bg-ink-100 text-ink-700", icon: null };
}

export default function QRMenuPage() {
  const params = useParams();
  const router = useRouter();
  const tableCode = decodeURIComponent(String(params?.tableCode ?? ""));
  const sessionKey = `ff_qr_order_${tableCode}`;

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Cart>({});
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [orderNote, setOrderNote] = useState("");
  const [placing, setPlacing] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState<{
    ok: boolean;
    reason?: string;
    discount?: number;
  } | null>(null);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [customerPoints, setCustomerPoints] = useState(0);

  // Restore customer details the guest gave on a previous order at this device
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ff_qr_customer");
      if (raw) {
        const c = JSON.parse(raw);
        setName(c.name ?? "");
        setPhone(c.phone ?? "");
        setEmail(c.email ?? "");
        if (typeof c.marketingOptIn === "boolean")
          setMarketingOptIn(c.marketingOptIn);
      }
    } catch {}
  }, []);
  const [activeCat, setActiveCat] = useState<string>("");
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [reviewTarget, setReviewTarget] = useState<any | null>(null);
  const [reviewDismissed, setReviewDismissed] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(i);
  }, []);

  // Look up returning-customer's loyalty points by phone to offer redemption
  useEffect(() => {
    if (!phone || phone.replace(/\D/g, "").length < 7) {
      setCustomerPoints(0);
      setRedeemPoints(0);
      return;
    }
    // Public endpoint is intentionally absent for privacy; we rely on the
    // server to validate segments and apply points. For a simple UX signal,
    // we'll just offer redemption and let the server gate it.
  }, [phone]);

  // Live coupon validation
  useEffect(() => {
    const code = couponCode.trim();
    if (!code || Object.keys(cart).length === 0) {
      setCouponStatus(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `${typeof window !== "undefined" ? "" : ""}${
            process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
          }/api/promotions/validate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code,
              channel: "Dine-in",
              customerPhone: phone || undefined,
              items: Object.values(cart).map((c: any) => ({
                menuItemId: c.item.id,
                qty: c.qty,
              })),
            }),
          }
        );
        const data = await r.json();
        setCouponStatus({
          ok: !!data.ok,
          reason: data.reason,
          discount: data.discountAmount,
        });
      } catch {
        setCouponStatus({ ok: false, reason: "Could not validate" });
      }
    }, 250);
    return () => clearTimeout(t);
  }, [couponCode, cart, phone]);

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [cartBump, setCartBump] = useState(0);

  useEffect(() => {
    qrApi
      .get(`/api/qr/menu/${encodeURIComponent(tableCode)}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [tableCode]);

  // Restore session: prefer saved order id, fall back to table's active order on server.
  // The server filters out sessions that have been closed by staff, so this
  // automatically shows a fresh slate to the next guest.
  const refreshActiveOrder = useCallback(async () => {
    try {
      const saved =
        typeof window !== "undefined"
          ? localStorage.getItem(sessionKey)
          : null;
      if (saved) {
        const r = await qrApi.get<{ order: any }>(`/api/qr/order/${saved}`);
        if (
          ["Completed", "Cancelled"].includes(r.order.status) ||
          r.order.sessionClosed
        ) {
          localStorage.removeItem(sessionKey);
          setActiveOrder(null);
        } else {
          setActiveOrder(r.order);
          return;
        }
      }
      // Server fallback — same phone may have cleared storage, or first scan
      // after a concurrent order was placed from another device at the same table.
      const srv = await qrApi.get<{ order: any | null }>(
        `/api/qr/table/${encodeURIComponent(tableCode)}/active-order`
      );
      if (srv.order) {
        localStorage.setItem(sessionKey, srv.order.id);
        setActiveOrder(srv.order);
      } else {
        setActiveOrder(null);
      }
    } catch {
      setActiveOrder(null);
    }
  }, [tableCode, sessionKey]);

  useEffect(() => {
    refreshActiveOrder();
  }, [refreshActiveOrder]);

  // Look for a recent served/completed order at this table without a review.
  // If found, surface the big review card at the top of the menu.
  const refreshReviewTarget = useCallback(async () => {
    try {
      const r = await qrApi.get<{ order: any | null }>(
        `/api/qr/table/${encodeURIComponent(tableCode)}/pending-review`
      );
      if (!r.order) {
        setReviewTarget(null);
        return;
      }
      // Respect per-order dismissal (localStorage) + per-session dismissal
      const alreadyReviewed =
        typeof window !== "undefined" &&
        localStorage.getItem(`ff_qr_reviewed_${r.order.id}`) === "1";
      if (alreadyReviewed) {
        setReviewTarget(null);
      } else {
        setReviewTarget(r.order);
      }
    } catch {
      setReviewTarget(null);
    }
  }, [tableCode]);

  useEffect(() => {
    refreshReviewTarget();
  }, [refreshReviewTarget]);

  // Live status updates for the active order — and react to table-free signals
  // so the banner and review prompt disappear the instant staff end the session.
  useEffect(() => {
    const s: Socket = io(SOCKET_URL, { transports: ["websocket"] });
    const onOrderUpdate = (o: any) => {
      if (!activeOrder) return;
      if (o?.id === activeOrder.id || o?._id === activeOrder.id) {
        if (
          ["Completed", "Cancelled"].includes(o.status) ||
          o.sessionClosed
        ) {
          localStorage.removeItem(sessionKey);
          setActiveOrder(null);
          refreshReviewTarget();
        } else {
          setActiveOrder(o);
        }
      }
      // Session-close broadcast (no id, just tableId match) — refresh lookups
      if (
        o?.tableId &&
        activeOrder?.tableId &&
        o.tableId === activeOrder.tableId &&
        !o.id
      ) {
        refreshActiveOrder();
        refreshReviewTarget();
      }
    };
    const onTableUpdate = () => {
      // Something about our table changed — re-check both the active order
      // pointer and review target.
      refreshActiveOrder();
      refreshReviewTarget();
    };
    s.on("order:update", onOrderUpdate);
    s.on("table:update", onTableUpdate);
    return () => {
      s.disconnect();
    };
  }, [activeOrder?.id, sessionKey, refreshActiveOrder, refreshReviewTarget]);

  const categories: Category[] = data?.categories ?? [];
  const items: MenuItem[] = data?.items ?? [];
  const taxRate = data?.outlet?.taxRate ?? 0.16;
  const serviceRate = data?.outlet?.serviceRate ?? 0.05;

  const byCategory = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const c of categories) map.set(c.id, []);
    for (const it of items) {
      if (!q || it.name.toLowerCase().includes(q.toLowerCase())) {
        if (!map.has(it.categoryId)) map.set(it.categoryId, []);
        map.get(it.categoryId)!.push(it);
      }
    }
    return map;
  }, [categories, items, q]);

  const visibleCategories = categories.filter(
    (c) => (byCategory.get(c.id)?.length ?? 0) > 0
  );

  useEffect(() => {
    if (!visibleCategories.length) return;
    setActiveCat((cur) =>
      cur && visibleCategories.some((c) => c.id === cur) ? cur : visibleCategories[0].id
    );
  }, [visibleCategories]);

  useEffect(() => {
    if (!visibleCategories.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const inView = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (inView[0]) {
          const id = inView[0].target.getAttribute("data-catid");
          if (id) setActiveCat(id);
        }
      },
      { rootMargin: "-140px 0px -55% 0px", threshold: [0, 0.2, 0.5, 1] }
    );
    for (const c of visibleCategories) {
      const el = sectionRefs.current[c.id];
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [visibleCategories]);

  useEffect(() => {
    const el = chipRefs.current[activeCat];
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeCat]);

  const cartItems = Object.values(cart);
  const totalQty = cartItems.reduce((s, c) => s + c.qty, 0);
  const subtotal = cartItems.reduce((s, c) => s + c.item.price * c.qty, 0);
  const tax = Math.round(subtotal * taxRate);
  const service = Math.round(subtotal * serviceRate);
  const total = subtotal + tax + service;

  function addToCart(it: MenuItem, qty = 1, note?: string) {
    setCart((c) => {
      const cur = c[it.id];
      const nQty = (cur?.qty ?? 0) + qty;
      if (nQty <= 0) {
        const n = { ...c };
        delete n[it.id];
        return n;
      }
      return { ...c, [it.id]: { item: it, qty: nQty, note: note ?? cur?.note } };
    });
    setCartBump((x) => x + 1);
    if (typeof navigator !== "undefined" && (navigator as any).vibrate) {
      try {
        (navigator as any).vibrate(12);
      } catch {}
    }
  }

  function setQty(id: string, qty: number) {
    setCart((c) => {
      const cur = c[id];
      if (!cur) return c;
      if (qty <= 0) {
        const n = { ...c };
        delete n[id];
        return n;
      }
      return { ...c, [id]: { ...cur, qty } };
    });
  }

  async function place() {
    if (cartItems.length === 0) return;
    setPlacing(true);
    try {
      const payload = {
        items: cartItems.map((c) => ({
          menuItemId: c.item.id,
          qty: c.qty,
          note: c.note,
        })),
      };

      let orderId: string;
      if (activeOrder) {
        const r = await qrApi.post<{ order: any }>(
          `/api/qr/orders/${activeOrder.id}/append`,
          payload
        );
        orderId = r.order.id;
      } else {
        const r = await qrApi.post<{ order: any }>(
          `/api/qr/orders/${encodeURIComponent(tableCode)}`,
          {
            customerName: name || "Walk-in guest",
            customerPhone: phone || undefined,
            customerEmail: email || undefined,
            marketingOptIn,
            couponCode: couponStatus?.ok ? couponCode.trim() : undefined,
            redeemPoints: redeemPoints > 0 ? redeemPoints : undefined,
            ...payload,
          }
        );
        orderId = r.order.id;
      }
      try {
        localStorage.setItem(sessionKey, orderId);
        // Remember the guest's details for their next visit on this device
        if (name || phone || email) {
          localStorage.setItem(
            "ff_qr_customer",
            JSON.stringify({ name, phone, email, marketingOptIn })
          );
        }
      } catch {}
      router.push(`/qr/order/${orderId}`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setPlacing(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-ink-50 to-white">
        <div className="max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center mx-auto mb-4">
            <X className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-bold text-ink-900">Can&apos;t load menu</h1>
          <p className="text-sm text-ink-500 mt-1">{error}</p>
          <p className="text-xs text-ink-400 mt-4">
            Scan the QR at your table to start.
          </p>
        </div>
      </div>
    );
  }
  if (!data) return <MenuSkeleton />;

  return (
    <div className="min-h-screen bg-[#f8f5f0] text-ink-900 pb-32">
      <Hero outlet={data.outlet} table={data.table} />

      {reviewTarget && !reviewDismissed ? (
        <ReviewPromptCard
          order={reviewTarget}
          onSubmitted={() => {
            // Keep the card in "Thank you" state briefly, then clear it
            setTimeout(() => {
              setReviewTarget(null);
            }, 4000);
          }}
          onDismiss={() => setReviewDismissed(true)}
        />
      ) : (
        activeOrder && <ActiveOrderBanner order={activeOrder} />
      )}

      {/* Sticky search + categories */}
      <div className="sticky top-0 z-30 bg-[#f8f5f0]/95 backdrop-blur-md border-b border-ink-100 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search the menu — biryani, pizza, cold coffee…"
              className="w-full h-11 pl-10 pr-10 rounded-full bg-white border border-ink-200 shadow-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none text-sm"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-ink-100 text-ink-500 flex items-center justify-center hover:bg-ink-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-3 -mx-1 px-1">
            {visibleCategories.map((c) => {
              const active = activeCat === c.id;
              return (
                <button
                  key={c.id}
                  ref={(el) => {
                    chipRefs.current[c.id] = el;
                  }}
                  onClick={() => {
                    const el = sectionRefs.current[c.id];
                    if (el) {
                      const top =
                        el.getBoundingClientRect().top + window.scrollY - 120;
                      window.scrollTo({ top, behavior: "smooth" });
                    }
                  }}
                  className={clsx(
                    "shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full transition-colors",
                    active
                      ? "bg-ink-900 text-white shadow-sm"
                      : "bg-white border border-ink-200 text-ink-700 hover:bg-ink-50"
                  )}
                >
                  <span>{emojiFor(c.name)}</span>
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto">
        {visibleCategories.length === 0 && (
          <div className="p-16 text-center">
            <div className="text-5xl mb-3">🤷</div>
            <p className="text-sm text-ink-500">
              Nothing matches “{q}”. Try another search.
            </p>
          </div>
        )}

        {visibleCategories.map((cat) => {
          const list = byCategory.get(cat.id) ?? [];
          return (
            <section
              key={cat.id}
              data-catid={cat.id}
              ref={(el) => {
                sectionRefs.current[cat.id] = el;
              }}
              className="scroll-mt-32 px-4 pt-7"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-ink-200 flex items-center justify-center text-xl shadow-sm">
                    {emojiFor(cat.name)}
                  </div>
                  <div>
                    <h2 className="text-[20px] font-bold tracking-tight leading-tight">
                      {cat.name}
                    </h2>
                    <p className="text-[11px] text-ink-500">
                      {list.length} {list.length === 1 ? "item" : "items"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {list.map((it) => (
                  <ItemCard
                    key={it.id}
                    it={it}
                    category={cat.name}
                    inCart={cart[it.id]?.qty ?? 0}
                    onOpen={() => setSelected(it)}
                    onQuick={() => addToCart(it, 1)}
                    onInc={() => addToCart(it, 1)}
                    onDec={() => addToCart(it, -1)}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {visibleCategories.length > 0 && (
          <div className="px-4 pt-8 pb-4 text-center">
            <p className="text-[11px] text-ink-400">
              Tap any item for details · prices include no hidden fees
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-ink-500">
              <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
              Made fresh · Dinova
            </div>
          </div>
        )}
      </main>

      {/* Floating cart bar */}
      {totalQty > 0 && !cartOpen && !selected && (
        <div className="fixed left-0 right-0 bottom-0 z-30 p-3 bg-gradient-to-t from-[#f8f5f0] via-[#f8f5f0]/95 to-transparent pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <button
              onClick={() => setCartOpen(true)}
              key={cartBump}
              className="ff-bounce-in w-full h-14 flex items-center gap-3 px-4 rounded-2xl bg-ink-900 text-white shadow-pop hover:bg-ink-800 transition-colors"
            >
              <div className="relative">
                <ShoppingBag className="w-5 h-5" />
                <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500 text-[10px] font-bold flex items-center justify-center">
                  {totalQty}
                </span>
              </div>
              <span className="flex-1 text-left">
                <p className="text-[11px] font-medium text-white/70 leading-none">
                  {activeOrder
                    ? `${totalQty} new item${totalQty === 1 ? "" : "s"} to add`
                    : `${totalQty} item${totalQty === 1 ? "" : "s"} in cart`}
                </p>
                <p className="text-sm font-bold mt-0.5">
                  Rs {total.toLocaleString()}
                </p>
              </span>
              <span className="text-sm font-semibold">
                {activeOrder ? "Review & add →" : "View order →"}
              </span>
            </button>
          </div>
        </div>
      )}

      <ItemSheet
        item={selected}
        onClose={() => setSelected(null)}
        currentQty={selected ? cart[selected.id]?.qty ?? 0 : 0}
        onAdd={(qty, note) => {
          if (!selected) return;
          // replace, not add
          setCart((c) => {
            if (qty <= 0) {
              const n = { ...c };
              delete n[selected.id];
              return n;
            }
            return { ...c, [selected.id]: { item: selected, qty, note } };
          });
          setCartBump((x) => x + 1);
          setSelected(null);
        }}
      />

      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        subtotal={subtotal}
        tax={tax}
        taxRate={taxRate}
        service={service}
        serviceRate={serviceRate}
        total={total}
        onQty={setQty}
        name={name}
        setName={setName}
        note={orderNote}
        setNote={setOrderNote}
        table={data.table}
        activeOrder={activeOrder}
        phone={phone}
        setPhone={setPhone}
        email={email}
        setEmail={setEmail}
        marketingOptIn={marketingOptIn}
        setMarketingOptIn={setMarketingOptIn}
        couponCode={couponCode}
        setCouponCode={setCouponCode}
        couponStatus={couponStatus}
        redeemPoints={redeemPoints}
        setRedeemPoints={setRedeemPoints}
        customerPoints={customerPoints}
        onPlace={place}
        placing={placing}
      />
    </div>
  );
}

function ActiveOrderBanner({ order }: { order: any }) {
  const elapsedMin = order.elapsedMin ?? 0;
  const etaMs = order.eta
    ? new Date(order.eta).getTime() - Date.now()
    : null;
  const committedEta =
    etaMs !== null ? Math.max(0, Math.ceil(etaMs / 60000)) : null;
  const etaOverdue = etaMs !== null && etaMs < 0;

  const label =
    order.status === "Pending"
      ? "Sending to reception"
      : order.status === "Queued"
      ? "Kitchen will accept any moment"
      : order.status === "In Progress"
      ? committedEta !== null
        ? etaOverdue
          ? "Wrapping up now"
          : `Ready in ~${committedEta} min`
        : "Kitchen is on it"
      : order.status === "Ready"
      ? "Your food is ready!"
      : order.status === "Served"
      ? "Enjoy your meal"
      : "Order update";

  const sub =
    order.status === "Pending"
      ? `Reception is reviewing your order`
      : order.status === "Queued"
      ? `Chef will set prep time shortly`
      : order.status === "In Progress"
      ? committedEta !== null
        ? `${elapsedMin}m elapsed${
            etaOverdue ? " · finalising" : ""
          }`
        : "On the grill now"
      : order.status === "Ready"
      ? `Waiter notified · Table ${order.tableCode}`
      : order.status === "Served"
      ? `Hope it hits the spot`
      : `${elapsedMin} min elapsed`;

  const tone =
    order.status === "Ready"
      ? "from-emerald-500 to-emerald-600"
      : order.status === "Served"
      ? "from-sky-500 to-sky-600"
      : "from-brand-500 to-brand-600";

  const Icon =
    order.status === "Ready"
      ? Bell
      : order.status === "Served"
      ? CheckCircle2
      : order.status === "Queued"
      ? ReceiptText
      : ChefHat;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4">
      <Link
        href={`/qr/order/${order.id}`}
        className={clsx(
          "ff-bounce-in group relative flex items-center gap-3 p-4 rounded-2xl text-white bg-gradient-to-br shadow-pop overflow-hidden",
          tone
        )}
      >
        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
          <Icon
            className={clsx(
              "w-5 h-5",
              order.status === "Ready" && "animate-pulseDot"
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-white/70">
            Your order · {order.code}
          </p>
          <p className="text-[15px] font-bold leading-tight">{label}</p>
          <p className="text-[11px] text-white/85 mt-0.5">
            {sub} · {order.items?.length ?? 0} items · Rs{" "}
            {(order.total ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-1 text-sm font-semibold shrink-0 group-hover:translate-x-0.5 transition-transform">
          Track
          <ChevronRight className="w-4 h-4" />
        </div>
      </Link>
      <p className="text-[11px] text-ink-500 text-center mt-2">
        Tap any item below to <span className="font-semibold">add it to this order</span> — kitchen will get an addendum.
      </p>
    </div>
  );
}

function Hero({ outlet, table }: { outlet: any; table: any }) {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-ink-900 via-ink-900 to-brand-900" />
      <div className="absolute inset-0 ff-grain opacity-90" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-brand-500/30 blur-3xl" />
      <div className="absolute -top-10 -right-10 w-60 h-60 rounded-full bg-amber-400/20 blur-3xl" />

      <div className="relative max-w-2xl mx-auto px-5 pt-7 pb-16 text-white">
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-white/25 bg-white shadow-md">
            <img
              src="/android-chrome-192x192.png"
              alt=""
              width={44}
              height={44}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-semibold">
              Dinova
            </p>
            <h1 className="text-[22px] font-bold tracking-tight leading-tight truncate">
              {outlet?.name?.replace(/^Dinova\s*[—-]?\s*/i, "") ?? "Welcome"}
            </h1>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[11px] font-medium text-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulseDot" />
            Open
          </div>
        </div>

        <p className="text-sm text-white/80 leading-relaxed mt-4 max-w-md">
          Scan done ✨ — browse the live menu, customize your order, and track
          it in real time from your phone.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Stat icon={<Star className="w-3 h-3 fill-amber-300 text-amber-300" />} label="4.7 rated" />
          <Stat icon={<Clock className="w-3 h-3" />} label="~18 min" />
          <Stat icon={<MapPin className="w-3 h-3" />} label={outlet?.address?.split(",")[1]?.trim() ?? "Gulberg"} />
        </div>
      </div>

      {/* Table card */}
      <div className="relative max-w-2xl mx-auto px-4 -mt-9">
        <div className="card flex flex-col gap-3 bg-white p-4 shadow-pop sm:flex-row sm:items-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-bold shrink-0">
            {table?.code ?? "—"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-ink-500">You&apos;re at</p>
            <p className="font-bold text-ink-900 leading-tight">
              Table {table?.code} · {table?.zone}
            </p>
            <p className="text-[11px] text-ink-500 mt-0.5">
              Seats {table?.capacity} · orders go straight to the kitchen
            </p>
          </div>
          <div className="inline-flex items-center gap-1 self-start rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-semibold text-ink-700 sm:self-auto">
            <Utensils className="w-3 h-3" /> Dine-in
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-[11px] font-medium text-white/90">
      {icon}
      {label}
    </div>
  );
}

function ItemCard({
  it,
  category,
  inCart,
  onOpen,
  onInc,
  onDec,
  onQuick,
}: {
  it: MenuItem;
  category: string;
  inCart: number;
  onOpen: () => void;
  onInc: () => void;
  onDec: () => void;
  onQuick: () => void;
}) {
  const grad = gradientFor(it.name);
  const emoji = emojiFor(category, it.name);
  return (
    <div
      onClick={onOpen}
      className="card overflow-hidden flex cursor-pointer hover:shadow-pop transition-shadow active:scale-[0.995]"
    >
      <div className="flex-1 min-w-0 p-4 pr-3">
        {it.tags && it.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {it.tags.slice(0, 2).map((t) => {
              const m = tagMeta(t);
              return (
                <span
                  key={t}
                  className={clsx(
                    "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                    m.bg
                  )}
                >
                  {m.icon}
                  {t}
                </span>
              );
            })}
          </div>
        )}
        <h3 className="text-[15px] font-bold leading-tight text-ink-900">
          {it.name}
        </h3>
        {it.description && (
          <p className="text-[11px] text-ink-500 mt-1 leading-snug line-clamp-2">
            {it.description}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[15px] font-extrabold tracking-tight text-ink-900">
            Rs {it.price.toLocaleString()}
          </span>
          {inCart > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-3 h-3" />
              {inCart} in cart
            </span>
          )}
        </div>
      </div>

      <div
        className={clsx(
          "relative w-28 sm:w-32 shrink-0 bg-gradient-to-br flex items-center justify-center",
          grad
        )}
      >
        <span className="text-5xl sm:text-6xl leading-none drop-shadow-sm">
          {emoji}
        </span>
        {inCart > 0 ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-white rounded-full shadow-md border border-ink-100"
          >
            <button
              onClick={onDec}
              className="w-7 h-7 rounded-full flex items-center justify-center text-ink-800 hover:bg-ink-100"
              aria-label="Decrease"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-bold tabular-nums w-4 text-center">
              {inCart}
            </span>
            <button
              onClick={onInc}
              className="w-7 h-7 rounded-full flex items-center justify-center text-ink-800 hover:bg-ink-100"
              aria-label="Increase"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuick();
            }}
            className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-white text-brand-600 shadow-md hover:shadow-lg flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Add"
          >
            <Plus className="w-4 h-4" strokeWidth={3} />
          </button>
        )}
      </div>
    </div>
  );
}

function Sheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 ff-fade-in"
          onClick={onClose}
        />
      )}
      <div
        className={clsx(
          "fixed left-0 right-0 bottom-0 z-50 bg-white rounded-t-3xl flex flex-col max-h-[92vh] transition-transform duration-300 ease-out will-change-transform shadow-pop",
          open ? "translate-y-0" : "translate-y-full pointer-events-none"
        )}
      >
        <div className="pt-2.5 pb-1 flex justify-center">
          <span className="w-10 h-1.5 rounded-full bg-ink-200" />
        </div>
        {children}
      </div>
    </>
  );
}

function ItemSheet({
  item,
  onClose,
  currentQty,
  onAdd,
}: {
  item: MenuItem | null;
  onClose: () => void;
  currentQty: number;
  onAdd: (qty: number, note?: string) => void;
}) {
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (item) {
      setQty(Math.max(1, currentQty || 1));
      setNote("");
    }
  }, [item, currentQty]);

  const open = !!item;
  return (
    <Sheet open={open} onClose={onClose}>
      {item && (
        <>
          <div
            className={clsx(
              "relative h-56 flex items-center justify-center bg-gradient-to-br",
              gradientFor(item.name)
            )}
          >
            <span className="text-8xl drop-shadow-md">
              {emojiFor("", item.name)}
            </span>
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur text-ink-900 shadow-sm flex items-center justify-center hover:bg-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pt-5 pb-24">
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {item.tags.map((t) => {
                  const m = tagMeta(t);
                  return (
                    <span
                      key={t}
                      className={clsx(
                        "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                        m.bg
                      )}
                    >
                      {m.icon}
                      {t}
                    </span>
                  );
                })}
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-2xl font-bold tracking-tight text-ink-900">
                  {item.name}
                </h2>
                {item.description && (
                  <p className="text-sm text-ink-500 mt-1.5 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-ink-400">
                  Price
                </p>
                <p className="text-xl font-extrabold text-ink-900 tabular-nums">
                  Rs {item.price.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mt-5 pt-5 border-t border-ink-100">
              <label className="block text-xs font-semibold text-ink-700 mb-2">
                Special instructions
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="e.g. extra spicy, no onions, well-done"
                className="w-full px-3 py-2 rounded-xl border border-ink-200 bg-white text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none resize-none"
              />
              <p className="text-[11px] text-ink-400 mt-1">
                We&apos;ll send this straight to the kitchen.
              </p>
            </div>

            <div className="mt-5 pt-5 border-t border-ink-100">
              <p className="text-xs font-semibold text-ink-700 mb-2">
                Quantity
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex items-center bg-ink-100 rounded-full">
                  <button
                    onClick={() => setQty((q) => Math.max(0, q - 1))}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-ink-800 hover:bg-ink-200"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center text-lg font-bold tabular-nums">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty((q) => q + 1)}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-ink-800 hover:bg-ink-200"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-sm text-ink-500">
                  {currentQty > 0
                    ? `Currently ${currentQty} in cart`
                    : "Not in cart yet"}
                </span>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 left-0 right-0 p-4 bg-white border-t border-ink-100 shadow-[0_-8px_20px_-8px_rgba(15,23,42,0.08)]">
            <button
              onClick={() => onAdd(qty, note || undefined)}
              className="w-full h-12 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-bold flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
            >
              {qty <= 0 ? (
                <>Remove from cart</>
              ) : currentQty > 0 ? (
                <>
                  Update · Rs {(item.price * qty).toLocaleString()}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" strokeWidth={3} />
                  Add to order · Rs {(item.price * qty).toLocaleString()}
                </>
              )}
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}

function CartSheet({
  open,
  onClose,
  cart,
  subtotal,
  tax,
  taxRate,
  service,
  serviceRate,
  total,
  onQty,
  name,
  setName,
  note,
  setNote,
  table,
  activeOrder,
  phone,
  setPhone,
  email,
  setEmail,
  marketingOptIn,
  setMarketingOptIn,
  couponCode,
  setCouponCode,
  couponStatus,
  redeemPoints,
  setRedeemPoints,
  customerPoints,
  onPlace,
  placing,
}: {
  open: boolean;
  onClose: () => void;
  cart: Cart;
  subtotal: number;
  tax: number;
  taxRate: number;
  service: number;
  serviceRate: number;
  total: number;
  onQty: (id: string, qty: number) => void;
  name: string;
  setName: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  table: any;
  activeOrder: any | null;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  marketingOptIn: boolean;
  setMarketingOptIn: (v: boolean) => void;
  couponCode: string;
  setCouponCode: (v: string) => void;
  couponStatus: { ok: boolean; reason?: string; discount?: number } | null;
  redeemPoints: number;
  setRedeemPoints: (v: number) => void;
  customerPoints: number;
  onPlace: () => void;
  placing: boolean;
}) {
  const hasActive = !!activeOrder;
  const couponDiscount =
    couponStatus?.ok && couponStatus.discount ? couponStatus.discount : 0;
  const netBase = Math.max(0, subtotal - couponDiscount - redeemPoints);
  const adjustedTax = Math.round(netBase * taxRate);
  const adjustedService = Math.round(netBase * serviceRate);
  const adjustedTotal = netBase + adjustedTax + adjustedService;
  const pointsEarned = Math.max(0, Math.round(adjustedTotal * 0.1));
  const items = Object.values(cart);
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="px-5 pt-1 pb-3 flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-800"
        >
          <ChevronLeft className="w-4 h-4" /> Back to menu
        </button>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full hover:bg-ink-100 flex items-center justify-center"
        >
          <X className="w-4 h-4 text-ink-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28">
        <h2 className="text-2xl font-bold tracking-tight">
          {hasActive ? "Add to your order" : "Your order"}
        </h2>
        <p className="text-sm text-ink-500 mt-0.5">
          {items.length === 0
            ? "Cart is empty"
            : `${items.reduce((s, c) => s + c.qty, 0)} items at Table ${table?.code ?? "—"}`}
        </p>
        {hasActive && items.length > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-brand-50 border border-brand-200 text-[12px] text-brand-800 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
            <p>
              These items will be <strong>added to order {activeOrder.code}</strong>{" "}
              — same bill, kitchen gets an addendum ticket.
            </p>
          </div>
        )}

        {items.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-ink-100 text-ink-400 flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <p className="text-sm text-ink-500">
              Tap items on the menu to add them here.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-4 space-y-2.5">
              {items.map((c) => {
                const grad = gradientFor(c.item.name);
                return (
                  <div
                    key={c.item.id}
                    className="flex items-center gap-3 p-2 rounded-2xl bg-white border border-ink-100"
                  >
                    <div
                      className={clsx(
                        "w-14 h-14 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br",
                        grad
                      )}
                    >
                      <span className="text-2xl">
                        {emojiFor("", c.item.name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink-900 truncate">
                        {c.item.name}
                      </p>
                      <p className="text-[11px] text-ink-500">
                        Rs {c.item.price.toLocaleString()} each
                      </p>
                      {c.note && (
                        <p className="text-[11px] text-brand-600 mt-0.5 italic line-clamp-1">
                          ⚡ {c.note}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 bg-ink-100 rounded-full">
                      <button
                        onClick={() => onQty(c.item.id, c.qty - 1)}
                        className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-ink-200"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold tabular-nums">
                        {c.qty}
                      </span>
                      <button
                        onClick={() => onQty(c.item.id, c.qty + 1)}
                        className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-ink-200"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {!hasActive && (
              <div className="mt-5 space-y-2">
                <div className="relative">
                  <input
                    value={couponCode}
                    onChange={(e) =>
                      setCouponCode(e.target.value.toUpperCase())
                    }
                    placeholder="Coupon code · e.g. WELCOME100"
                    className="w-full h-11 px-3 rounded-xl border border-ink-200 bg-white text-sm font-mono focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                  />
                  {couponCode && couponStatus && (
                    <p
                      className={clsx(
                        "text-[11px] mt-1 px-1",
                        couponStatus.ok
                          ? "text-emerald-600"
                          : "text-rose-600"
                      )}
                    >
                      {couponStatus.ok
                        ? `✓ Rs ${(couponStatus.discount ?? 0).toLocaleString()} off`
                        : `⚠ ${couponStatus.reason}`}
                    </p>
                  )}
                </div>
                {phone && customerPoints > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <label className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      Redeem {customerPoints} loyalty points (1 pt = Rs 1)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={Math.min(customerPoints, subtotal)}
                      value={redeemPoints}
                      onChange={(e) =>
                        setRedeemPoints(Number(e.target.value))
                      }
                      className="w-full mt-2"
                    />
                    <p className="text-[11px] text-amber-800 tabular-nums">
                      Using {redeemPoints} pts = Rs {redeemPoints} off
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 p-4 rounded-2xl bg-ink-50 space-y-1.5 text-sm">
              <div className="flex justify-between text-ink-600">
                <span>Subtotal</span>
                <span className="tabular-nums">
                  Rs {subtotal.toLocaleString()}
                </span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Coupon {couponCode}</span>
                  <span className="tabular-nums">
                    − Rs {couponDiscount.toLocaleString()}
                  </span>
                </div>
              )}
              {redeemPoints > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Loyalty points</span>
                  <span className="tabular-nums">
                    − Rs {redeemPoints.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-ink-600">
                <span>Tax ({Math.round(taxRate * 100)}%)</span>
                <span className="tabular-nums">
                  Rs {adjustedTax.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-ink-600">
                <span>Service ({Math.round(serviceRate * 100)}%)</span>
                <span className="tabular-nums">
                  Rs {adjustedService.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between font-bold text-ink-900 pt-2 border-t border-ink-200">
                <span>Total</span>
                <span className="tabular-nums">
                  Rs {adjustedTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {!hasActive && (
              <>
                {/* Loyalty carrot — makes the ask feel like a gift, not a form */}
                <div className="mt-5 p-4 rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-amber-500 text-white shadow-pop relative overflow-hidden">
                  <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/15 blur-2xl pointer-events-none" />
                  <div className="relative">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/90 mb-1">
                      <Sparkles className="w-3 h-3" /> Join Dinova loyalty
                    </div>
                    <p className="text-[15px] font-extrabold leading-tight">
                      Earn{" "}
                      <span className="tabular-nums">{pointsEarned}</span>{" "}
                      point{pointsEarned === 1 ? "" : "s"} on this order
                    </p>
                    <p className="text-[11px] text-white/85 mt-0.5">
                      1 point = Rs 1 off your next visit · auto-tracked on your phone
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <FieldBlock
                    label="Your name"
                    hint="Helps the waiter find you at the table"
                    optional
                  >
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ayesha"
                      className="w-full h-11 px-3 rounded-xl border border-ink-200 bg-white text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                    />
                  </FieldBlock>

                  <FieldBlock
                    label="Phone number"
                    hint="We'll text you when your order is ready · also saves your loyalty points"
                    optional
                    icon="phone"
                  >
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+92 300 1234567"
                      className="w-full h-11 px-3 rounded-xl border border-ink-200 bg-white text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                    />
                  </FieldBlock>

                  <FieldBlock
                    label="Email"
                    hint="For your digital receipt — no spam, we promise"
                    optional
                    icon="mail"
                  >
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ayesha@example.com"
                      className="w-full h-11 px-3 rounded-xl border border-ink-200 bg-white text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                    />
                  </FieldBlock>

                  <label className="flex items-start gap-2 p-3 rounded-xl bg-ink-50 border border-ink-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={marketingOptIn}
                      onChange={(e) => setMarketingOptIn(e.target.checked)}
                      className="mt-0.5 w-4 h-4"
                    />
                    <span className="text-[12px] text-ink-700 leading-snug">
                      Send me new menu drops and occasional treats.{" "}
                      <span className="text-ink-500">
                        Unsubscribe anytime — we only send what we'd open ourselves.
                      </span>
                    </span>
                  </label>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                    Any requests for the kitchen?
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="e.g. one order needs to be gluten-free"
                    className="w-full px-3 py-2 rounded-xl border border-ink-200 bg-white text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none resize-none"
                  />
                </div>
              </>
            )}

            <p className="text-[11px] text-ink-400 mt-3 leading-relaxed">
              {hasActive
                ? "You'll land back on the tracking page with the updated bill."
                : "Pay at the counter or via the tracking page after your food is served. No card needed to order."}
            </p>
          </>
        )}
      </div>

      <div className="sticky bottom-0 left-0 right-0 p-4 bg-white border-t border-ink-100 shadow-[0_-8px_20px_-8px_rgba(15,23,42,0.08)]">
        <button
          onClick={onPlace}
          disabled={placing || items.length === 0}
          className="w-full h-12 rounded-2xl bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
        >
          {placing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />{" "}
              {hasActive ? "Adding to order…" : "Placing order…"}
            </>
          ) : hasActive ? (
            <>
              <Plus className="w-4 h-4" strokeWidth={3} />
              Add to order · Rs {total.toLocaleString()}
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Place order · Rs {adjustedTotal.toLocaleString()}
            </>
          )}
        </button>
      </div>
    </Sheet>
  );
}

function FieldBlock({
  label,
  hint,
  optional,
  icon,
  children,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  icon?: "phone" | "mail" | "user";
  children: React.ReactNode;
}) {
  const Icon =
    icon === "phone" ? Phone : icon === "mail" ? Mail : UserIcon;
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <Icon className="w-3.5 h-3.5 text-brand-500" />}
        <span className="text-xs font-semibold text-ink-700">{label}</span>
        {optional && (
          <span className="text-[10px] text-ink-400 font-medium">optional</span>
        )}
      </div>
      {children}
      {hint && (
        <p className="text-[11px] text-ink-500 mt-1 leading-snug">{hint}</p>
      )}
    </div>
  );
}

function MenuSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8f5f0]">
      <div className="h-64 bg-gradient-to-br from-ink-900 via-ink-900 to-brand-900 ff-grain" />
      <div className="max-w-2xl mx-auto px-4 -mt-9">
        <div className="card p-4 h-[72px] animate-pulse bg-ink-100" />
        <div className="mt-6 h-10 w-full rounded-full bg-ink-100 animate-pulse" />
        <div className="flex gap-2 mt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-24 rounded-full bg-ink-100 animate-pulse"
            />
          ))}
        </div>
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card h-28 animate-pulse bg-ink-50" />
          ))}
        </div>
      </div>
    </div>
  );
}
