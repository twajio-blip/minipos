/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, @next/next/no-location-assign-relative-destination */
"use client";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import LanguageTranslator from "./LanguageTranslator";
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  EllipsisVertical,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";

const TODAY = new Date().toISOString().slice(0, 10);
const BANGLA_DIGITS = ["\u09e6", "\u09e7", "\u09e8", "\u09e9", "\u09ea", "\u09eb", "\u09ec", "\u09ed", "\u09ee", "\u09ef"];
const toBanglaNumber = (value: string | number) =>
  String(value).replace(/\d/g, (digit) => BANGLA_DIGITS[Number(digit)]);
const toEnglishNumber = (value: string) =>
  value.replace(/[\u09e6-\u09ef]/g, (digit) => String(BANGLA_DIGITS.indexOf(digit)));
const cleanDecimal = (value: string) => {
  const cleaned = toEnglishNumber(value).replace(/[^\d.]/g, "");
  const [whole = "", ...fractions] = cleaned.split(".");
  return fractions.length ? `${whole}.${fractions.join("")}` : whole;
};
const cleanDate = (value: string) =>
  toEnglishNumber(value).replace(/[^\d-]/g, "").slice(0, 10);
const decimalValue = (value: string | number, bangla = false) =>
  bangla ? toBanglaNumber(value) : String(value);
const cash = (v: any, c = "৳") =>
  `${c}${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
async function api(url: string, options?: RequestInit) {
  const r = await fetch(url, options);
  if (r.status === 401) {
    location.href = "/login";
    throw new Error("Unauthenticated");
  }
  const text = await r.text();
  let j: any = {};
  try { j = text ? JSON.parse(text) : {}; } catch { j = {}; }
  if (!r.ok) throw new Error(j.message || "Request failed");
  return j;
}
async function post(body: any) {
  return api("/api/pos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function useData(type: string, extra = "", tick = 0) {
  const [data, setData] = useState<any>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    setLoading(true);
    setError("");
    api(`/api/pos?type=${type}${extra}`)
      .then(setData)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load data"))
      .finally(() => setLoading(false));
  }, [type, extra, tick]);
  return { data, loading, error };
}
function Header({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
function Empty({ text = "Nothing here yet." }: { text?: string }) {
  return <div className="py-12 text-center text-sm text-slate-400">{text}</div>;
}
function Status({ value }: { value: string }) {
  return (
    <span
      className={`badge ${value === "active" ? "badge-active" : "badge-cancelled"}`}
    >
      {value}
    </span>
  );
}
function SaleActions({
  onView,
  onPrint,
  onEdit,
  onDelete,
}: {
  onView: () => void;
  onPrint: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menu, setMenu] = useState<{
    top: number;
    left: number;
    up: boolean;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    document.addEventListener("pointerdown", close);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
      document.removeEventListener("pointerdown", close);
    };
  }, [menu]);
  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (menu) return setMenu(null);
    const r = buttonRef.current!.getBoundingClientRect();
    const up = window.innerHeight - r.bottom < 175;
    setMenu({
      top: up ? r.top - 5 : r.bottom + 5,
      left: Math.max(8, Math.min(r.right - 136, window.innerWidth - 144)),
      up,
    });
  }
  function run(fn: () => void) {
    setMenu(null);
    fn();
  }
  return (
    <>
      <button
        ref={buttonRef}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={toggle}
        className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        aria-label="Sale actions"
        aria-expanded={Boolean(menu)}
      >
        <EllipsisVertical size={18} />
      </button>
      {menu &&
        createPortal(
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className={`fixed z-[200] w-34 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-xl ${menu.up ? "-translate-y-full" : ""}`}
            style={{ top: menu.top, left: menu.left }}
          >
            <button
              className="block w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
              onClick={() => run(onView)}
            >
              View
            </button>
            <button
              className="block w-full px-3 py-2 text-left text-emerald-700 hover:bg-emerald-50"
              onClick={() => run(onPrint)}
            >
              Print
            </button>
            <button
              className="block w-full px-3 py-2 text-left text-blue-700 hover:bg-blue-50"
              onClick={() => run(onEdit)}
            >
              Edit
            </button>
            <button
              className="block w-full px-3 py-2 text-left text-red-600 hover:bg-red-50"
              onClick={() => run(onDelete)}
            >
              Delete
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
function ReturnActions({
  canEdit,
  onView,
  onEdit,
  onDelete,
}: {
  canEdit: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menu, setMenu] = useState<{
    top: number;
    left: number;
    up: boolean;
  } | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    document.addEventListener("pointerdown", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [menu]);
  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (menu) return setMenu(null);
    const r = ref.current!.getBoundingClientRect();
    const up = window.innerHeight - r.bottom < 140;
    setMenu({
      top: up ? r.top - 5 : r.bottom + 5,
      left: Math.max(8, Math.min(r.right - 136, window.innerWidth - 144)),
      up,
    });
  }
  function run(fn: () => void) {
    setMenu(null);
    fn();
  }
  return (
    <>
      <button
        ref={ref}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={toggle}
        className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        aria-label="Return actions"
      >
        <EllipsisVertical size={18} />
      </button>
      {menu &&
        createPortal(
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className={`fixed z-[200] w-34 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-xl ${menu.up ? "-translate-y-full" : ""}`}
            style={{ top: menu.top, left: menu.left }}
          >
            <button
              className="block w-full px-3 py-2 text-left hover:bg-slate-50"
              onClick={() => run(onView)}
            >
              View
            </button>
            {canEdit && (
              <button
                className="block w-full px-3 py-2 text-left text-blue-700 hover:bg-blue-50"
                onClick={() => run(onEdit)}
              >
                Edit
              </button>
            )}
            <button
              className="block w-full px-3 py-2 text-left text-red-600 hover:bg-red-50"
              onClick={() => run(onDelete)}
            >
              Delete
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
function ProductActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menu, setMenu] = useState<{
    top: number;
    left: number;
    up: boolean;
  } | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    document.addEventListener("pointerdown", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [menu]);
  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (menu) return setMenu(null);
    const r = ref.current!.getBoundingClientRect();
    const up = window.innerHeight - r.bottom < 110;
    setMenu({
      top: up ? r.top - 5 : r.bottom + 5,
      left: Math.max(8, Math.min(r.right - 136, window.innerWidth - 144)),
      up,
    });
  }
  function run(fn: () => void) {
    setMenu(null);
    fn();
  }
  return (
    <>
      <button
        ref={ref}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={toggle}
        className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        aria-label="Product actions"
      >
        <EllipsisVertical size={18} />
      </button>
      {menu &&
        createPortal(
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className={`fixed z-[200] w-34 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-xl ${menu.up ? "-translate-y-full" : ""}`}
            style={{ top: menu.top, left: menu.left }}
          >
            <button
              className="block w-full px-3 py-2 text-left text-blue-700 hover:bg-blue-50"
              onClick={() => run(onEdit)}
            >
              Edit
            </button>
            <button
              className="block w-full px-3 py-2 text-left text-red-600 hover:bg-red-50"
              onClick={() => run(onDelete)}
            >
              Delete
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="modal-bg">
      <div className={`modal ${wide ? "!w-[min(1050px,100%)]" : ""}`}>
        <div className="no-print mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const nav = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["sales", "Sales", ReceiptText],
  ["customers", "Customers", Users],
  ["areas", "Areas", MapPin],
  ["villages", "Villages", MapPin],
  ["products", "Products", Package],
  ["payments", "Payments", CircleDollarSign],
  ["returns", "Returns", RotateCcw],
  ["settings", "Settings", Settings],
] as const;

export default function PosApp() {
  const router = useRouter();
  const [page, setPage] = useState("dashboard");
  const [mobile, setMobile] = useState(false);
  const [toast, setToast] = useState("");
  const [tick, setTick] = useState(0);
  const { data: businessSettings } = useData("settings", "", tick);
  const businessName = businessSettings?.business_name || "Lite POS";
  const notify = (s: string) => {
    setToast(s);
    setTimeout(() => setToast(""), 2500);
  };
  const refresh = () => setTick((x) => x + 1);
  async function toggleLanguage() {
    const language = businessSettings?.language === "bn" ? "en" : "bn";
    await post({ action: "settings.language", language });
    localStorage.setItem("lite-pos-language", language);
    refresh();
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }
  const View =
    page === "dashboard"
      ? Dashboard
      : page === "sale"
        ? SaleForm
        : page === "sales"
          ? Sales
          : page === "customers"
            ? Customers
            : page === "areas"
              ? Areas
              : page === "villages"
                ? Villages
              : page === "products"
                ? Products
                : page === "payments"
                  ? Payments
                  : page === "returns"
                    ? Returns
                    : page === "sales-report"
                      ? Reports
                      : page === "product-return-report"
                        ? ProductReturnReport
                        : page === "customer-due-report"
                          ? CustomerDueReport
                          : page === "customer-payment-report"
                            ? CustomerPaymentReport
                            : SettingsView;
  return (
    <div className="min-h-screen md:flex">
      <LanguageTranslator language={businessSettings?.language} numeralSystem={businessSettings?.numeral_system} />
      {toast && <div className="toast">{toast}</div>}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#152b28] text-white transition-transform md:sticky md:h-screen md:translate-x-0 ${mobile ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-18 items-center gap-3 border-b border-white/10 px-5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#43a88e]">
            <ReceiptText size={20} />
          </span>
          <div className="min-w-0">
            <b className="block truncate" title={businessName}>
              {businessName}
            </b>
            <p className="text-xs text-white/55">Sales made simple</p>
          </div>
          <button
            onClick={() => setMobile(false)}
            className="ml-auto md:hidden"
          >
            <X />
          </button>
        </div>
        <SidebarNav
          page={page}
          select={(id) => {
            setPage(id);
            setMobile(false);
          }}
        />
        <button
          onClick={logout}
          className="m-3 mt-1 flex shrink-0 items-center gap-3 rounded-lg border-t border-white/10 px-3 py-3 text-sm text-white/60 hover:bg-white/10 hover:text-white"
        >
          <LogOut size={18} />
          Log out
        </button>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="no-print flex h-16 items-center border-b border-slate-200 bg-white px-4 md:px-7">
          <button className="mr-3 md:hidden" onClick={() => setMobile(true)}>
            <Menu />
          </button>
          <p className="truncate text-sm font-semibold" title={businessName}>
            {businessName}
          </p>
          <button
            onClick={toggleLanguage}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
            title={businessSettings?.language === "bn" ? "Switch to English" : "বাংলায় পরিবর্তন করুন"}
          >
            <RefreshCw size={18} />
            <span>{businessSettings?.language === "bn" ? "EN" : "বাংলা"}</span>
          </button>
        </header>
        <div className="main-pad p-5 md:p-7">
          <View
            tick={tick}
            notify={notify}
            refresh={refresh}
            go={setPage}
            banglaNumbers={businessSettings?.numeral_system === "bn"}
          />
        </div>
      </main>
    </div>
  );
}

function SidebarNav({
  page,
  select,
}: {
  page: string;
  select: (id: string) => void;
}) {
  const reportPage = page.endsWith("-report");
  const [reportsOpen, setReportsOpen] = useState(reportPage);
  const [customerOpen, setCustomerOpen] = useState(
    page.startsWith("customer-") && reportPage,
  );
  const item = (id: string, label: string, Icon: any) => (
    <button
      key={id}
      onClick={() => select(id)}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${page === id ? "bg-white/13 text-white" : "text-white/65 hover:bg-white/7 hover:text-white"}`}
    >
      <Icon size={18} />
      {label}
      {page === id && <ChevronRight size={15} className="ml-auto" />}
    </button>
  );
  return (
    <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
      {nav.slice(0, -1).map(([id, label, Icon]) => item(id, label, Icon))}
      <button
        onClick={() => setReportsOpen((v) => !v)}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${reportPage ? "text-white" : "text-white/65 hover:bg-white/7 hover:text-white"}`}
      >
        <BarChart3 size={18} />
        Reports
        {reportsOpen ? (
          <ChevronDown size={15} className="ml-auto" />
        ) : (
          <ChevronRight size={15} className="ml-auto" />
        )}
      </button>
      {reportsOpen && (
        <div className="ml-5 space-y-1 border-l border-white/10 pl-2">
          <button
            onClick={() => select("sales-report")}
            className={`block w-full rounded-md px-3 py-2 text-left text-xs ${page === "sales-report" ? "bg-white/13 text-white" : "text-white/60 hover:text-white"}`}
          >
            Detailed Sales Report
          </button>
          <button
            onClick={() => select("product-return-report")}
            className={`block w-full rounded-md px-3 py-2 text-left text-xs ${page === "product-return-report" ? "bg-white/13 text-white" : "text-white/60 hover:text-white"}`}
          >
            Product Return Report
          </button>
          <button
            onClick={() => setCustomerOpen((v) => !v)}
            className="flex w-full items-center rounded-md px-3 py-2 text-left text-xs text-white/60 hover:text-white"
          >
            Customer Reports
            {customerOpen ? (
              <ChevronDown size={13} className="ml-auto" />
            ) : (
              <ChevronRight size={13} className="ml-auto" />
            )}
          </button>
          {customerOpen && (
            <div className="ml-3 space-y-1 border-l border-white/10 pl-2">
              <button
                onClick={() => select("customer-due-report")}
                className={`block w-full rounded-md px-2 py-2 text-left text-xs ${page === "customer-due-report" ? "bg-white/13 text-white" : "text-white/55 hover:text-white"}`}
              >
                Customer Due Report
              </button>
              <button
                onClick={() => select("customer-payment-report")}
                className={`block w-full rounded-md px-2 py-2 text-left text-xs ${page === "customer-payment-report" ? "bg-white/13 text-white" : "text-white/55 hover:text-white"}`}
              >
                Payment History
              </button>
            </div>
          )}
        </div>
      )}
      {item("settings", "Settings", Settings)}
    </nav>
  );
}

function Dashboard({ tick, go }: { tick: number; go: (s: string) => void }) {
  const { data, loading, error } = useData("dashboard", "", tick);
  if (loading) return <p>Loading…</p>;
  if (error || !data?.metrics)
    return <div className="card border-red-200 bg-red-50 p-5 text-red-700"><b>Dashboard could not load.</b><p className="mt-1 text-sm">{error || "The server returned an invalid response."}</p></div>;
  const m = data.metrics;
  const cards = [
    ["Today's sales", m.today_sales, "bg-emerald-50 text-emerald-700"],
    ["Net sales", m.today_net, "bg-blue-50 text-blue-700"],
    ["Return & refund", m.today_returns, "bg-red-50 text-red-700"],
    ["Collections", m.today_collections, "bg-violet-50 text-violet-700"],
    ["Total due", m.total_due, "bg-amber-50 text-amber-700"],
    ["Customer advance", m.total_advance, "bg-cyan-50 text-cyan-700"],
    ["Invoices", m.today_invoices, "bg-slate-100 text-slate-700"],
  ];
  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Today's business at a glance"
        action={
          <button onClick={() => go("sale")} className="btn btn-primary">
            <Plus size={17} />
            New sale
          </button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([l, v, c]) => (
          <div className="card p-5" key={String(l)}>
            <p className="text-sm text-slate-500">{l}</p>
            <p className="mt-2 text-2xl font-bold">
              {l === "Invoices" ? v : cash(v)}
            </p>
            <span
              className={`mt-4 inline-block rounded-md px-2 py-1 text-xs ${c}`}
            >
              Today
            </span>
          </div>
        ))}
      </div>
      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-3">
        <section className="card min-w-0 overflow-hidden p-4 sm:p-5 xl:col-span-2">
          <h2 className="mb-4 font-bold">Recent sales</h2>
          <div className="table-wrap max-h-72 w-full max-w-full overflow-auto overscroll-contain md:max-h-none">
            <table className="table min-w-[560px]">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th className="amount">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((x: any) => (
                  <tr key={x.id}>
                    <td className="font-semibold">{x.invoice_no}</td>
                    <td>{x.customer_name}</td>
                    <td>{x.sale_date}</td>
                    <td className="amount">{cash(x.grand_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card min-w-0 overflow-hidden p-4 sm:p-5">
          <h2 className="mb-4 font-bold">Top products</h2>
          {data.top.length ? (
            data.top.map((x: any) => (
              <div
                key={x.product_name}
                className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-sm" title={x.product_name}>{x.product_name}</b>
                  <p className="text-xs text-slate-400">{x.quantity} sold</p>
                </div>
                <span className="shrink-0 text-right text-sm font-bold">{cash(x.amount)}</span>
              </div>
            ))
          ) : (
            <Empty />
          )}
        </section>
      </div>
    </>
  );
}

function CustomerSelect({
  value,
  onChange,
  emptyLabel = "Walk-in Customer",
  placeholder = emptyLabel,
  areaId = 0,
  villageId = 0,
  refreshKey = 0,
}: {
  value: any;
  onChange: (v: any, customer?: any) => void;
  emptyLabel?: string;
  placeholder?: string;
  areaId?: number;
  villageId?: number;
  refreshKey?: number;
}) {
  const { data = [] } = useData("customers", "", refreshKey);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrap = useRef<HTMLDivElement>(null);
  const selected = data.find((c: any) => Number(c.id) === Number(value));
  const filtered = data.filter(
    (c: any) =>
      (!areaId || Number(c.area_id) === Number(areaId)) &&
      (!villageId || Number(c.village_id) === Number(villageId)) &&
      `${c.code} ${c.name} ${c.phone || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return (
    <div ref={wrap} className="relative z-30 focus-within:z-50">
      <input
        className="field"
        value={
          open
            ? query
            : selected
              ? `${selected.code} — ${selected.name}`
              : placeholder
        }
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onClick={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        placeholder="Search customer"
      />
      {open && (
        <div className="absolute z-40 mt-1 max-h-56 w-full min-w-64 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
          <button
            type="button"
            className="sticky top-0 block w-full border-b bg-emerald-50 px-3 py-2 text-left text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
            onClick={() => {
              onChange(null);
              setOpen(false);
              setQuery("");
            }}
          >
            {emptyLabel}
          </button>
          {filtered.map((c: any) => (
            <button
              type="button"
              key={c.id}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
              onClick={() => {
                onChange(Number(c.id), c);
                setOpen(false);
                setQuery("");
              }}
            >
              <b>{c.name}</b>
              <span className="ml-2 text-xs text-slate-400">
                {c.code}
                {c.phone ? ` • ${c.phone}` : ""}
              </span>
            </button>
          ))}
          {!filtered.length && (
            <p className="px-3 py-3 text-sm text-slate-400">
              No customer found
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function AreaSelect({
  value,
  onChange,
  allLabel = "All Areas",
  name,
  required = false,
  activeOnly = false,
}: {
  value: any;
  onChange?: (value: number) => void;
  allLabel?: string;
  name?: string;
  required?: boolean;
  activeOnly?: boolean;
}) {
  const { data = [] } = useData("areas");
  const areas = activeOnly
    ? data.filter((area: any) => area.status === "active")
    : data;
  return (
    <select
      className="field"
      name={name}
      value={value || ""}
      required={required}
      onChange={(event) => onChange?.(Number(event.target.value) || 0)}
    >
      <option value="">{allLabel}</option>
      {areas.map((area: any) => (
        <option key={area.id} value={area.id}>
          {area.name}
        </option>
      ))}
    </select>
  );
}
function VillageSelect({ value, onChange, areaId = 0, allLabel = "All Villages", name, required = false, activeOnly = false }: { value: any; onChange?: (value: number, village?: any) => void; areaId?: number; allLabel?: string; name?: string; required?: boolean; activeOnly?: boolean }) {
  const { data = [] } = useData("villages", areaId ? `&area_id=${areaId}` : "");
  const villages = activeOnly ? data.filter((village: any) => village.status === "active") : data;
  return <select className="field" name={name} value={value || ""} required={required} disabled={Boolean(name && !areaId)} onChange={(event) => {
    const id = Number(event.target.value) || 0;
    onChange?.(id, villages.find((v: any) => Number(v.id) === id));
  }}>
    <option value="">{name && !areaId ? "Choose area first" : allLabel}</option>
    {villages.map((village: any) => <option key={village.id} value={village.id}>{village.name}</option>)}
  </select>;
}
function ReportProductSelect({
  value,
  onChange,
}: {
  value: any;
  onChange: (v: number) => void;
}) {
  const { data = [] } = useData("product-list");
  return (
    <select
      className="field"
      value={value || ""}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
    >
      <option value="">All products</option>
      {data.map((p: any) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
function ProductInput({
  line,
  onChange,
  required = true,
}: {
  line: any;
  onChange: (v: any) => void;
  required?: boolean;
}) {
  const [q, setQ] = useState(line.name);
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) {
      setItems([]);
      return;
    }
    const t = setTimeout(() => {
      if (q.trim())
        api(`/api/pos?type=products&q=${encodeURIComponent(q)}`).then(setItems);
      else setItems([]);
    }, 180);
    return () => clearTimeout(t);
  }, [q, open]);
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return (
    <div ref={wrap} className="relative min-w-0">
      <input
        className="field w-full min-w-0"
        value={q}
        placeholder="Type product name"
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          onChange({ ...line, name: e.target.value, product_id: null });
        }}
        required={required}
      />
      {open && q && items.length > 0 && (
        <div className="absolute left-0 top-full z-[9999] mt-2 max-h-64 w-[min(18rem,calc(100vw-3rem))] max-w-[calc(100vw-3rem)] overflow-auto rounded-xl border-2 border-emerald-600 bg-white p-1.5 shadow-[0_20px_50px_rgba(15,23,42,0.35)] sm:w-full sm:min-w-72">
          <div className="sticky top-0 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-emerald-800">
            <Search size={14} />
            Suggested products
          </div>
          {items.map((p) => (
            <button
              type="button"
              key={p.id}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-800 transition hover:bg-emerald-100 hover:text-emerald-900 focus:bg-emerald-100 focus:outline-none"
              onClick={() => {
                setQ(p.name);
                setOpen(false);
                onChange({ ...line, name: p.name, product_id: p.id, unit_price: Number(p.price || 0) });
              }}
            >
              <Package size={16} className="shrink-0 text-emerald-700" />
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function SaleForm({
  notify,
  go,
  banglaNumbers = false,
}: {
  notify: (s: string) => void;
  go: (s: string) => void;
  banglaNumbers?: boolean;
}) {
  const [customer, setCustomer] = useState<any>(null);
  const [customerRefresh, setCustomerRefresh] = useState(0);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newCustomerArea, setNewCustomerArea] = useState(0);
  const [newCustomerVillage, setNewCustomerVillage] = useState(0);
  const [date, setDate] = useState(TODAY);
  const [buyer, setBuyer] = useState("");
  const [phone, setPhone] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [manualDue, setManualDue] = useState(0);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<any[]>([
    { name: "", product_id: null, quantity: 1, unit_price: 0, discount: 0 },
  ]);
  const update = (i: number, v: any) =>
    setLines((x) => x.map((r, n) => (n === i ? v : r)));
  const subtotal = useMemo(
    () =>
      lines.reduce(
        (a, x) => a + Number(x.quantity || 0) * Number(x.unit_price || 0),
        0,
      ),
    [lines],
  );
  const lineDisc = useMemo(
    () => lines.reduce((a, x) => a + Number(x.discount || 0), 0),
    [lines],
  );
  const total = Math.max(0, subtotal - lineDisc - Number(discount || 0));
  const hasNamedProduct = lines.some((line) => String(line.name || "").trim());
  const displayedTotal = hasNamedProduct ? total : paid + manualDue;
  useEffect(() => {
    if (!customer) setPaid(total);
  }, [customer, total]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!customer) {
      setNewCustomerOpen(true);
      return;
    }
    setBusy(true);
    try {
      await post({
        action: "sale.save",
        sale_date: date,
        customer_id: customer,
        buyer_name: buyer,
        buyer_phone: phone,
        invoice_discount: discount,
        paid_amount: paid,
        manual_due_amount: manualDue,
        notes,
        items: lines,
      });
      notify("Sale saved successfully");
      go("sales");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function saveNewCustomer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      const values = Object.fromEntries(new FormData(e.currentTarget));
      const created = await post({
        action: "customer.save",
        name: values.name,
        phone: values.phone,
        area_id: values.area_id,
        village_id: values.village_id,
        opening_amount: cleanDecimal(String(values.opening_amount || "0")) || "0",
        opening_type: "due",
        opening_date: TODAY,
        status: "active",
      });
      setCustomer(Number(created.id));
      setBuyer("");
      setPhone("");
      setCustomerRefresh((value) => value + 1);
      setNewCustomerOpen(false);
      setNewCustomerArea(0);
      setNewCustomerVillage(0);
      notify("Customer created and selected");
    } catch (error: any) {
      alert(error.message);
    }
  }
  return (
    <>
      <form onSubmit={submit}>
      <Header
        title="New Sale"
        subtitle="Type a product name or select a previous suggestion"
      />
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_330px] xl:gap-5">
        <section className="card min-w-0 p-3 sm:p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Customer</label>
              <CustomerSelect
                value={customer}
                refreshKey={customerRefresh}
                emptyLabel="New Customer"
                placeholder=""
                onChange={(value) => {
                  if (value) setCustomer(value);
                  else setNewCustomerOpen(true);
                }}
              />
            </div>
            <div>
              <label className="label">Sale date</label>
              <input
                className="field"
                type={banglaNumbers ? "text" : "date"}
                inputMode={banglaNumbers ? "numeric" : undefined}
                placeholder={banglaNumbers ? "বছর-মাস-দিন" : undefined}
                value={banglaNumbers ? toBanglaNumber(date) : date}
                onChange={(e) => setDate(banglaNumbers ? cleanDate(e.target.value) : e.target.value)}
                pattern={banglaNumbers ? "[০-৯]{4}-[০-৯]{2}-[০-৯]{2}" : undefined}
                required
              />
            </div>
          </div>
          <div className="sale-lines-wrap mt-5 table-wrap overflow-visible">
            <table className="sale-lines-table table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="w-24">Qty</th>
                  <th className="w-32">Price</th>
                  <th className="w-28">Discount</th>
                  <th className="amount">Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((x, i) => (
                  <tr key={i}>
                    <td data-label="Product">
                      <ProductInput line={x} onChange={(v) => update(i, v)} required={false} />
                    </td>
                    <td data-label="Qty">
                      <input
                        className="field"
                        type="text"
                        inputMode="decimal"
                        value={decimalValue(x.quantity, banglaNumbers)}
                        onChange={(e) =>
                          update(i, { ...x, quantity: cleanDecimal(e.target.value) })
                        }
                      />
                    </td>
                    <td data-label="Price">
                      <input
                        className="field"
                        type="text"
                        inputMode="decimal"
                        value={decimalValue(x.unit_price, banglaNumbers)}
                        onChange={(e) =>
                          update(i, { ...x, unit_price: cleanDecimal(e.target.value) })
                        }
                      />
                    </td>
                    <td data-label="Discount">
                      <input
                        className="field"
                        type="text"
                        inputMode="decimal"
                        value={decimalValue(x.discount, banglaNumbers)}
                        onChange={(e) =>
                          update(i, { ...x, discount: cleanDecimal(e.target.value) })
                        }
                      />
                    </td>
                    <td data-label="Total" className="amount font-semibold">
                      {cash(
                        Number(x.quantity) * Number(x.unit_price) -
                          Number(x.discount),
                      )}
                    </td>
                    <td className="sale-line-remove">
                      <button
                        type="button"
                        disabled={lines.length === 1}
                        onClick={() =>
                          setLines((v) => v.filter((_, n) => n !== i))
                        }
                        className="text-red-500"
                      >
                        <X size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={() =>
              setLines((v) => [
                ...v,
                {
                  name: "",
                  product_id: null,
                  quantity: 1,
                  unit_price: 0,
                  discount: 0,
                },
              ])
            }
            className="btn btn-soft mt-4 w-full sm:w-auto"
          >
            <Plus size={16} />
            Add row
          </button>
        </section>
        <aside className="card h-fit min-w-0 p-4 sm:p-5 xl:sticky xl:top-5">
          <h2 className="mb-4 font-bold">Payment summary</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <b>{cash(subtotal)}</b>
            </div>
            <div className="flex justify-between">
              <span>Line discount</span>
              <b>- {cash(lineDisc)}</b>
            </div>
            <div>
              <label className="label">Invoice discount</label>
              <input
                className="field text-right"
                type="text"
                inputMode="decimal"
                value={decimalValue(discount, banglaNumbers)}
                onChange={(e) => setDiscount(Number(cleanDecimal(e.target.value) || 0))}
              />
            </div>
            <div className="flex justify-between border-t pt-3 text-lg">
              <b>Grand total</b>
              <b>{cash(displayedTotal)}</b>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="label !mb-0">Paid amount (Cash)</label>
                {hasNamedProduct && (
                  <button
                    type="button"
                    className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                    onClick={() => setPaid(total)}
                  >
                    Full Pay
                  </button>
                )}
              </div>
              <input
                className="field text-right"
                type="text"
                inputMode="decimal"
                value={decimalValue(paid, banglaNumbers)}
                onChange={(e) => setPaid(Number(cleanDecimal(e.target.value) || 0))}
              />
            </div>
            {!hasNamedProduct && (
              <div>
                <label className="label">Due amount (no product)</label>
                <input
                  className="field text-right"
                  type="text"
                  inputMode="decimal"
                  value={decimalValue(manualDue, banglaNumbers)}
                  onChange={(event) => setManualDue(Number(cleanDecimal(event.target.value) || 0))}
                />
              </div>
            )}
            <div className="flex justify-between">
              <span>Due</span>
              <b className="text-amber-700">{cash(Math.max(0, displayedTotal - paid))}</b>
            </div>
            {hasNamedProduct && paid > total && (
              <div className="flex justify-between text-emerald-700">
                <span>Previous due payment / advance</span>
                <b>{cash(paid - total)}</b>
              </div>
            )}
            <div>
              <label className="label">Notes</label>
              <textarea
                className="field"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <button disabled={busy} className="btn btn-primary mt-2 w-full">
              {busy ? "Saving…" : "Save sale"}
            </button>
          </div>
        </aside>
      </div>
      </form>
      {newCustomerOpen && (
        <Modal title="New Customer" onClose={() => setNewCustomerOpen(false)}>
          <form onSubmit={saveNewCustomer} className="space-y-4">
            <div>
              <label className="label">Customer name</label>
              <input className="field" name="name" required autoFocus />
            </div>
            <div>
              <label className="label">Phone number</label>
              <input className="field" name="phone" required />
            </div>
            <div>
              <label className="label">Area</label>
              <AreaSelect name="area_id" value={newCustomerArea} onChange={(value) => { setNewCustomerArea(value); setNewCustomerVillage(0); }} allLabel="Choose area" activeOnly required />
            </div>
            <div>
              <label className="label">Village</label>
              <VillageSelect name="village_id" value={newCustomerVillage} areaId={newCustomerArea} onChange={setNewCustomerVillage} allLabel="Choose village" activeOnly required />
            </div>
            <div>
              <label className="label">Opening due</label>
              <input
                className="field"
                name="opening_amount"
                type="text"
                inputMode="decimal"
                defaultValue={decimalValue(0, banglaNumbers)}
                onInput={(event) => {
                  event.currentTarget.value = decimalValue(cleanDecimal(event.currentTarget.value), banglaNumbers);
                }}
                required
              />
              <p className="mt-1 text-xs text-slate-500">Opening date: {TODAY}</p>
            </div>
            <button className="btn btn-primary w-full">Save Customer</button>
          </form>
        </Modal>
      )}
    </>
  );
}

function Sales({
  tick,
  notify,
  refresh,
  go,
  banglaNumbers = false,
}: {
  tick: number;
  notify: (s: string) => void;
  refresh: () => void;
  go: (s: string) => void;
  banglaNumbers?: boolean;
}) {
  const [q, setQ] = useState("");
  const { data = [], loading } = useData(
    "sales",
    `&q=${encodeURIComponent(q)}`,
    tick,
  );
  const [view, setView] = useState<any>(null);
  const [printInvoice, setPrintInvoice] = useState<any>(null);
  const [edit, setEdit] = useState<number | null>(null);
  async function open(id: number) {
    setView(await api(`/api/pos?type=sale&id=${id}`));
  }
  async function openPrint(id: number) {
    setPrintInvoice(await api(`/api/pos?type=sale&id=${id}`));
  }
  async function remove(id: number) {
    if (
      !confirm(
        "Delete this sale permanently? This will also remove its returns and customer ledger effects.",
      )
    )
      return;
    try {
      await post({ action: "sale.delete", id });
      notify("Sale deleted");
      refresh();
    } catch (e: any) {
      alert(e.message);
    }
  }
  return (
    <>
      <Header
        title="Sales"
        subtitle="View, fully edit, print, or delete invoices"
        action={
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-3 text-slate-400"
              />
              <input
                className="field !pl-9"
                placeholder="Search invoice/customer"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <button onClick={() => go("sale")} className="btn btn-primary">
              <Plus size={17} />
              Add New Sale
            </button>
          </div>
        }
      />
      <div className="card p-4">
        {loading ? (
          <p>Loading…</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th className="amount">Total</th>
                  <th className="amount">Paid</th>
                  <th className="amount">Due</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((x: any) => (
                  <tr key={x.id}>
                    <td className="font-semibold">{x.invoice_no}</td>
                    <td>{x.sale_date}</td>
                    <td>{x.customer_name || x.buyer_name || "Walk-in"}</td>
                    <td className="amount">{cash(x.grand_total)}</td>
                    <td className="amount">{cash(x.paid_amount)}</td>
                    <td className="amount">{cash(x.due_amount)}</td>
                    <td>
                      <SaleActions
                        onView={() => open(x.id)}
                        onPrint={() => openPrint(x.id)}
                        onEdit={() => setEdit(x.id)}
                        onDelete={() => remove(x.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {view && <Invoice data={view} onClose={() => setView(null)} />}{" "}
      {printInvoice && (
        <Invoice data={printInvoice} onClose={() => setPrintInvoice(null)} printMode />
      )}
      {edit && (
        <EditSaleModal
          saleId={edit}
          banglaNumbers={banglaNumbers}
          onClose={() => setEdit(null)}
          done={() => {
            setEdit(null);
            notify("Sale updated");
            refresh();
          }}
        />
      )}
    </>
  );
}
function Invoice({ data, onClose, printMode = false }: { data: any; onClose: () => void; printMode?: boolean }) {
  const s = data.sale;
  const { data: settings } = useData("settings");
  const [format, setFormat] = useState("pos-80mm");
  const [invoiceLanguage, setInvoiceLanguage] = useState("en");
  useEffect(() => {
    if (!settings?.id) return;
    const preferred = settings.invoice_format === "a4"
      ? "a4"
      : settings.thermal_width === "58mm"
        ? "pos-58mm"
        : "pos-80mm";
    setFormat(preferred);
    setInvoiceLanguage(settings.invoice_language || "en");
  }, [settings]);
  const isPos = format.startsWith("pos-");
  const receiptWidth = format === "pos-58mm" ? "58mm" : "80mm";
  const label = (english: string, bangla: string) => invoiceLanguage === "bn" ? bangla : invoiceLanguage === "both" ? `${english} / ${bangla}` : english;
  const invoiceValue = (value: any) => settings?.numeral_system === "bn"
    ? String(value).replace(/\d/g, (digit) => ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"][Number(digit)])
    : String(value);
  const invoiceAmount = (value: any) => invoiceValue(cash(value));
  return (
    <Modal title={printMode ? "Print Invoice" : "Invoice"} onClose={onClose}>
      <style media="print">{`@page { size: ${printMode && isPos ? `${receiptWidth} auto` : "A4"}; margin: ${printMode && isPos ? "3mm" : "12mm"}; }`}</style>
      {printMode && (
        <div className="no-print mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <label className="label">Printer / invoice format</label>
            <select className="field" value={format} onChange={(event) => setFormat(event.target.value)}>
              <option value="pos-80mm">POS printer — 80mm</option>
              <option value="pos-58mm">POS printer — 58mm</option>
              <option value="a4">Regular printer — A4</option>
            </select>
          </div>
          <div>
            <label className="label">Invoice language</label>
            <select className="field" value={invoiceLanguage} onChange={(event) => setInvoiceLanguage(event.target.value)}>
              <option value="en">English</option>
              <option value="bn">Bangla</option>
              <option value="both">English + Bangla</option>
            </select>
          </div>
          <button onClick={() => window.print()} className="btn btn-primary self-end">
            Print Invoice
          </button>
        </div>
      )}
      <div data-no-translate className={`invoice-print print-card ${printMode && isPos ? `invoice-pos invoice-${receiptWidth}` : "invoice-a4"}`}>
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Lite POS</h1>
          <p className="text-sm text-slate-500">{label("Sales Invoice", "বিক্রয় ইনভয়েস")}</p>
        </div>
        <div className="mb-5 grid grid-cols-2 gap-3 text-sm">
          <div>
            <b>{label("Invoice", "ইনভয়েস")}:</b> {invoiceValue(s.invoice_no)}
            <br />
            <b>{label("Customer", "গ্রাহক")}:</b> {s.customer_name || s.buyer_name || "—"}
          </div>
          <div className="text-right">
            <b>{label("Date", "তারিখ")}:</b> {invoiceValue(s.sale_date)}
            <br />
            <b>{label("Phone", "ফোন")}:</b> {invoiceValue(s.customer_phone || s.buyer_phone || "—")}
          </div>
        </div>
        {data.items.length > 0 ? (
        <table className="table">
          <thead>
            <tr>
              <th>{label("Product", "পণ্য")}</th>
              <th className="amount">{label("Qty", "পরিমাণ")}</th>
              <th className="amount">{label("Price", "দাম")}</th>
              <th className="amount">{label("Discount", "ছাড়")}</th>
              <th className="amount">{label("Total", "মোট")}</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((x: any) => (
              <tr key={x.id}>
                <td>{x.product_name}</td>
                <td className="amount">{invoiceValue(x.quantity)}</td>
                <td className="amount">{invoiceAmount(x.unit_price)}</td>
                <td className="amount">{invoiceAmount(x.discount)}</td>
                <td className="amount">{invoiceAmount(x.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {label("Due-only entry (no product)", "শুধু বকেয়া এন্ট্রি (কোনো পণ্য নেই)")}
          </div>
        )}
        <div className="ml-auto mt-5 w-64 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>{label("Grand total", "সর্বমোট")}</span>
            <b>{invoiceAmount(s.grand_total)}</b>
          </div>
          <div className="flex justify-between">
            <span>{label("Paid", "পরিশোধিত")}</span>
            <b>{invoiceAmount(s.paid_amount)}</b>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span>{label("Due", "বকেয়া")}</span>
            <b>{invoiceAmount(s.due_amount)}</b>
          </div>
        </div>
      </div>
      {!printMode && (
        <button onClick={() => window.print()} className="no-print btn btn-primary mt-6 w-full">
          Print invoice
        </button>
      )}
    </Modal>
  );
}
function EditSaleModal({
  saleId,
  banglaNumbers,
  onClose,
  done,
}: {
  saleId: number;
  banglaNumbers: boolean;
  onClose: () => void;
  done: () => void;
}) {
  const { data, loading } = useData("sale", `&id=${saleId}`);
  if (loading)
    return (
      <Modal title="Edit Sale" onClose={onClose}>
        <p>Loading…</p>
      </Modal>
    );
  return (
    <Modal title={`Edit ${data.sale.invoice_no}`} onClose={onClose} wide>
      <EditSaleForm data={data} done={done} banglaNumbers={banglaNumbers} />
    </Modal>
  );
}
function EditSaleForm({ data, done, banglaNumbers }: { data: any; done: () => void; banglaNumbers: boolean }) {
  const s = data.sale;
  const [customer, setCustomer] = useState<any>(s.customer_id);
  const [date, setDate] = useState(s.sale_date);
  const [buyer, setBuyer] = useState(s.buyer_name || "");
  const [phone, setPhone] = useState(s.buyer_phone || "");
  const [discount, setDiscount] = useState(Number(s.invoice_discount));
  const [paid, setPaid] = useState(Number(s.paid_amount));
  const [manualDue, setManualDue] = useState(Number(s.due_amount));
  const [notes, setNotes] = useState(s.notes || "");
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<any[]>(
    data.items.map((x: any) => ({
      product_id: x.product_id,
      name: x.product_name,
      quantity: Number(x.quantity),
      unit_price: Number(x.unit_price),
      discount: Number(x.discount),
    })),
  );
  const update = (i: number, v: any) =>
    setLines((x) => x.map((r, n) => (n === i ? v : r)));
  const subtotal = useMemo(
    () =>
      lines.reduce(
        (a, x) => a + Number(x.quantity || 0) * Number(x.unit_price || 0),
        0,
      ),
    [lines],
  );
  const lineDisc = useMemo(
    () => lines.reduce((a, x) => a + Number(x.discount || 0), 0),
    [lines],
  );
  const total = Math.max(0, subtotal - lineDisc - Number(discount || 0));
  const hasNamedProduct = lines.some((line) => String(line.name || "").trim());
  const displayedTotal = hasNamedProduct ? total : paid + manualDue;
  useEffect(() => {
    if (!customer) setPaid(total);
  }, [customer, total]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await post({
        action: "sale.update",
        id: s.id,
        sale_date: date,
        customer_id: customer,
        buyer_name: buyer,
        buyer_phone: phone,
        invoice_discount: discount,
        paid_amount: paid,
        manual_due_amount: hasNamedProduct ? undefined : manualDue,
        notes,
        items: lines,
      });
      done();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label">Customer</label>
          <CustomerSelect value={customer} onChange={setCustomer} />
        </div>
        <div>
          <label className="label">Sale date</label>
          <input
            className="field"
            type={banglaNumbers ? "text" : "date"}
            inputMode={banglaNumbers ? "numeric" : undefined}
            placeholder={banglaNumbers ? "বছর-মাস-দিন" : undefined}
            value={banglaNumbers ? toBanglaNumber(date) : date}
            onChange={(e) => setDate(banglaNumbers ? cleanDate(e.target.value) : e.target.value)}
            pattern={banglaNumbers ? "[০-৯]{4}-[০-৯]{2}-[০-৯]{2}" : undefined}
            required
          />
        </div>
        {!customer && (
          <>
            <div>
              <label className="label">Buyer name</label>
              <input
                className="field"
                value={buyer}
                onChange={(e) => setBuyer(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Buyer phone</label>
              <input
                className="field"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </>
        )}
      </div>
      <div className="mt-5 table-wrap overflow-visible">
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Discount</th>
              <th className="amount">Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((x, i) => (
              <tr key={i}>
                <td>
                  <ProductInput line={x} onChange={(v) => update(i, v)} />
                </td>
                <td>
                  <input
                    className="field w-24"
                    type="text"
                    inputMode="decimal"
                    value={decimalValue(x.quantity, banglaNumbers)}
                    onChange={(e) =>
                      update(i, { ...x, quantity: cleanDecimal(e.target.value) })
                    }
                  />
                </td>
                <td>
                  <input
                    className="field w-28"
                    type="text"
                    inputMode="decimal"
                    value={decimalValue(x.unit_price, banglaNumbers)}
                    onChange={(e) =>
                      update(i, { ...x, unit_price: cleanDecimal(e.target.value) })
                    }
                  />
                </td>
                <td>
                  <input
                    className="field w-28"
                    type="text"
                    inputMode="decimal"
                    value={decimalValue(x.discount, banglaNumbers)}
                    onChange={(e) =>
                      update(i, { ...x, discount: cleanDecimal(e.target.value) })
                    }
                  />
                </td>
                <td className="amount font-semibold">
                  {cash(
                    Number(x.quantity) * Number(x.unit_price) -
                      Number(x.discount),
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    disabled={lines.length === 1}
                    onClick={() => setLines((v) => v.filter((_, n) => n !== i))}
                    className="text-red-500"
                  >
                    <X size={17} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="btn btn-soft mt-3"
        onClick={() =>
          setLines((v) => [
            ...v,
            {
              name: "",
              product_id: null,
              quantity: 1,
              unit_price: 0,
              discount: 0,
            },
          ])
        }
      >
        <Plus size={16} />
        Add row
      </button>
      <div className="mt-5 grid gap-4 border-t pt-5 md:grid-cols-4">
        <div>
          <label className="label">Invoice discount</label>
          <input
            className="field"
            type="text"
            inputMode="decimal"
            value={decimalValue(discount, banglaNumbers)}
            onChange={(e) => setDiscount(Number(cleanDecimal(e.target.value) || 0))}
          />
        </div>
        <div>
          <label className="label">Paid amount</label>
          <input
            className="field"
            type="text"
            inputMode="decimal"
            value={decimalValue(paid, banglaNumbers)}
            onChange={(e) => setPaid(Number(cleanDecimal(e.target.value) || 0))}
          />
        </div>
        {!hasNamedProduct && (
          <div>
            <label className="label">Due amount (no product)</label>
            <input
              className="field"
              type="text"
              inputMode="decimal"
              value={decimalValue(manualDue, banglaNumbers)}
              onChange={(event) => setManualDue(Number(cleanDecimal(event.target.value) || 0))}
            />
          </div>
        )}
        <div>
          <label className="label">Grand total</label>
          <div className="field bg-slate-50 font-bold">{cash(displayedTotal)}</div>
        </div>
        <div>
          <label className="label">Due</label>
          <div className="field bg-slate-50 font-bold">
            {cash(Math.max(0, displayedTotal - paid))}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <label className="label">Notes</label>
        <textarea
          className="field"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <button disabled={busy} className="btn btn-primary mt-5 w-full">
        {busy ? "Saving changes…" : "Save changes"}
      </button>
    </form>
  );
}

function Areas({
  tick,
  notify,
  refresh,
}: {
  tick: number;
  notify: (message: string) => void;
  refresh: () => void;
}) {
  const { data = [], loading } = useData("areas", "", tick);
  const [form, setForm] = useState<any>(null);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await post({
        action: "area.save",
        id: form?.id || undefined,
        ...Object.fromEntries(new FormData(event.currentTarget)),
      });
      setForm(null);
      notify("Area saved");
      refresh();
    } catch (error: any) {
      alert(error.message);
    }
  }
  async function remove(area: any) {
    if (!confirm(`Delete area "${area.name}"?`)) return;
    try {
      await post({ action: "area.delete", id: area.id });
      notify("Area deleted");
      refresh();
    } catch (error: any) {
      alert(error.message);
    }
  }
  return (
    <>
      <Header
        title="Areas"
        subtitle="Create areas before adding villages and customers"
        action={
          <button className="btn btn-primary" onClick={() => setForm({})}>
            <Plus size={17} /> Add Area
          </button>
        }
      />
      <div className="card p-4">
        {loading ? (
          <p>Loading…</p>
        ) : data.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Area</th>
                  <th className="amount">Villages</th>
                  <th>Status</th>
                  <th className="amount">Customers</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((area: any) => (
                  <tr key={area.id}>
                    <td className="font-semibold">{area.name}</td>
                    <td className="amount">{area.village_count}</td>
                    <td>
                      <Status value={area.status} />
                    </td>
                    <td className="amount">{area.customer_count}</td>
                    <td>
                      <ProductActions
                        onEdit={() => setForm(area)}
                        onDelete={() => remove(area)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No areas yet. Add the first area to create villages." />
        )}
      </div>
      {form && (
        <Modal
          title={form.id ? "Edit Area" : "New Area"}
          onClose={() => setForm(null)}
        >
          <form onSubmit={save} className="space-y-4">
            <div>
              <label className="label">Area name</label>
              <input
                className="field"
                name="name"
                defaultValue={form.name || ""}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Status</label>
              <select
                className="field"
                name="status"
                defaultValue={form.status || "active"}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <button className="btn btn-primary w-full">Save Area</button>
          </form>
        </Modal>
      )}
    </>
  );
}

function Villages({ tick, notify, refresh }: { tick: number; notify: (message: string) => void; refresh: () => void }) {
  const { data = [], loading } = useData("villages", "", tick);
  const [form, setForm] = useState<any>(null);
  const [formArea, setFormArea] = useState(0);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await post({ action: "village.save", id: form?.id || undefined, ...Object.fromEntries(new FormData(event.currentTarget)) });
      setForm(null); notify("Village saved"); refresh();
    } catch (error: any) { alert(error.message); }
  }
  async function remove(village: any) {
    if (!confirm(`Delete village "${village.name}"?`)) return;
    try { await post({ action: "village.delete", id: village.id }); notify("Village deleted"); refresh(); }
    catch (error: any) { alert(error.message); }
  }
  return <>
    <Header title="Villages" subtitle="Each village belongs to one area" action={<button className="btn btn-primary" onClick={() => { setFormArea(0); setForm({}); }}><Plus size={17} /> Add Village</button>} />
    <div className="card p-4">{loading ? <p>Loading…</p> : data.length ? <div className="table-wrap"><table className="table"><thead><tr><th>Village</th><th>Area</th><th>Status</th><th className="amount">Customers</th><th>Actions</th></tr></thead><tbody>{data.map((village: any) => <tr key={village.id}><td className="font-semibold">{village.name}</td><td>{village.area_name}</td><td><Status value={village.status} /></td><td className="amount">{village.customer_count}</td><td><ProductActions onEdit={() => { setFormArea(Number(village.area_id)); setForm(village); }} onDelete={() => remove(village)} /></td></tr>)}</tbody></table></div> : <Empty text="No villages yet. Add an area first, then create its villages." />}</div>
    {form && <Modal title={form.id ? "Edit Village" : "New Village"} onClose={() => setForm(null)}><form onSubmit={save} className="space-y-4"><div><label className="label">Area</label><AreaSelect name="area_id" value={formArea} onChange={setFormArea} allLabel="Choose area" activeOnly required /></div><div><label className="label">Village name</label><input className="field" name="name" defaultValue={form.name || ""} required autoFocus /></div><div><label className="label">Status</label><select className="field" name="status" defaultValue={form.status || "active"}><option value="active">Active</option><option value="inactive">Inactive</option></select></div><button className="btn btn-primary w-full">Save Village</button></form></Modal>}
  </>;
}

function Customers({
  tick,
  notify,
  refresh,
}: {
  tick: number;
  notify: (s: string) => void;
  refresh: () => void;
}) {
  const [q, setQ] = useState("");
  const [area, setArea] = useState(0);
  const [village, setVillage] = useState(0);
  const { data = [], loading } = useData(
    "customers",
    `&q=${encodeURIComponent(q)}&area_id=${area}&village_id=${village}`,
    tick,
  );
  const [form, setForm] = useState<any>(null);
  const [view, setView] = useState<any>(null);
  const [formArea, setFormArea] = useState(0);
  const [formVillage, setFormVillage] = useState(0);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const o = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await post({ action: "customer.save", ...o, id: form?.id || undefined });
      setForm(null);
      notify("Customer saved");
      refresh();
    } catch (e: any) {
      alert(e.message);
    }
  }
  async function remove(customer: any) {
    if (!confirm(`Delete customer "${customer.name}"?`)) return;
    try {
      await post({ action: "customer.delete", id: customer.id });
      notify("Customer deleted");
      refresh();
    } catch (error: any) {
      alert(error.message);
    }
  }
  return (
    <>
      <Header
        title="Customers"
        subtitle="Customer setup, opening balance, and current account position"
        action={
          <div className="flex flex-wrap gap-2">
            <div className="min-w-44">
              <AreaSelect value={area} onChange={(value) => { setArea(value); setVillage(0); }} />
            </div>
            <div className="min-w-44">
              <VillageSelect value={village} areaId={area} onChange={(value, selected) => { setVillage(value); if (selected?.area_id) setArea(Number(selected.area_id)); }} />
            </div>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-3 text-slate-400"
              />
              <input
                className="field !pl-9"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search customers"
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={() => {
                setFormArea(0);
                setFormVillage(0);
                setForm({});
              }}
            >
              <Plus size={17} />
              Add
            </button>
          </div>
        }
      />
      <div className="card p-4">
        {loading ? (
          <p>Loading…</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Area / Village</th>
                  <th>Status</th>
                  <th className="amount">Balance</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.map((c: any) => (
                  <tr key={c.id}>
                    <td>{c.code}</td>
                    <td className="font-semibold">{c.name}</td>
                    <td>{c.phone || "—"}</td>
                    <td>
                      {[c.area_name, c.village_name].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td>
                      <Status value={c.status} />
                    </td>
                    <td
                      className={`amount font-bold ${c.balance > 0 ? "text-amber-700" : c.balance < 0 ? "text-emerald-700" : ""}`}
                    >
                      {c.balance > 0
                        ? `Due ${cash(c.balance)}`
                        : c.balance < 0
                          ? `Advance ${cash(-c.balance)}`
                          : cash(0)}
                    </td>
                    <td>
                      <ReturnActions
                        canEdit
                        onView={() => setView(c)}
                        onEdit={() => {
                          setFormArea(Number(c.area_id) || 0);
                          setFormVillage(Number(c.village_id) || 0);
                          setForm(c);
                        }}
                        onDelete={() => remove(c)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {view && (
        <Modal title="Customer Details" onClose={() => setView(null)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><span className="label">Code</span><b>{view.code}</b></div>
            <div><span className="label">Customer name</span><b>{view.name}</b></div>
            <div><span className="label">Phone</span><b>{view.phone || "—"}</b></div>
            <div><span className="label">Email</span><b>{view.email || "—"}</b></div>
            <div><span className="label">Area</span><b>{view.area_name || "—"}</b></div>
            <div><span className="label">Village</span><b>{view.village_name || "—"}</b></div>
            <div><span className="label">Status</span><Status value={view.status} /></div>
            <div><span className="label">Balance</span><b>{view.balance > 0 ? `Due ${cash(view.balance)}` : view.balance < 0 ? `Advance ${cash(-view.balance)}` : cash(0)}</b></div>
            <div className="sm:col-span-2"><span className="label">Address</span><b>{view.address || "—"}</b></div>
            <div className="sm:col-span-2"><span className="label">Notes</span><b>{view.notes || "—"}</b></div>
          </div>
        </Modal>
      )}
      {form && (
        <Modal
          title={form.id ? "Edit customer" : "New customer"}
          onClose={() => setForm(null)}
          wide
        >
          <form onSubmit={save}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["name", "Customer name", true],
                ["phone", "Phone"],
                ["email", "Email"],
                ["address", "Address"],
                ["plant", "Plant / company"],
                ["notes", "Notes"],
              ].map(([n, l, r]) => (
                <div key={String(n)}>
                  <label className="label">{l}</label>
                  <input
                    className="field"
                    name={String(n)}
                    defaultValue={form[n as string] || ""}
                    required={Boolean(r)}
                  />
                </div>
              ))}
              <div>
                <label className="label">Area</label>
                <AreaSelect
                  name="area_id"
                  value={formArea}
                  onChange={(value) => { setFormArea(value); setFormVillage(0); }}
                  allLabel="Choose area"
                  activeOnly
                  required
                />
              </div>
              <div>
                <label className="label">Village</label>
                <VillageSelect name="village_id" value={formVillage} areaId={formArea} onChange={setFormVillage} allLabel="Choose village" activeOnly required />
              </div>
              <div>
                <label className="label">Status</label>
                <select
                  className="field"
                  name="status"
                  defaultValue={form.status || "active"}
                >
                  <option>active</option>
                  <option>inactive</option>
                </select>
              </div>
              <div>
                <label className="label">Opening amount</label>
                <input
                  className="field"
                  name="opening_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={form.opening_amount || 0}
                />
              </div>
              <div>
                <label className="label">Opening type</label>
                <select
                  className="field"
                  name="opening_type"
                  defaultValue={form.opening_type || "due"}
                >
                  <option value="due">Due</option>
                  <option value="advance">Advance</option>
                </select>
              </div>
              <div>
                <label className="label">Opening date</label>
                <input
                  className="field"
                  name="opening_date"
                  type="date"
                  defaultValue={String(form.opening_date || TODAY).slice(0, 10)}
                />
              </div>
            </div>
            <button className="btn btn-primary mt-5 w-full">
              Save customer
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

function Products({
  tick,
  notify,
  refresh,
}: {
  tick: number;
  notify: (s: string) => void;
  refresh: () => void;
}) {
  const [q, setQ] = useState("");
  const { data = [], loading } = useData(
    "product-list",
    `&q=${encodeURIComponent(q)}`,
    tick,
  );
  const [edit, setEdit] = useState<any>(null);
  const [adding, setAdding] = useState(false);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") || "");
    const price = Number(form.get("price") || 0);
    try {
      await post({ action: "product.update", id: edit.id, name, price });
      setEdit(null);
      notify("Product updated");
      refresh();
    } catch (e: any) {
      alert(e.message);
    }
  }
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await post({ action: "product.create", name: form.get("name"), price: form.get("price") });
      setAdding(false); notify("Product saved"); refresh();
    } catch (e: any) { alert(e.message); }
  }
  async function remove(p: any) {
    if (!confirm(`Delete product "${p.name}"?`)) return;
    try {
      await post({ action: "product.delete", id: p.id });
      notify("Product deleted");
      refresh();
    } catch (e: any) {
      alert(e.message);
    }
  }
  return (
    <>
      <Header
        title="Products"
        subtitle="Products created automatically from sales and direct returns"
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button className="btn btn-primary w-full whitespace-nowrap sm:w-auto" onClick={() => setAdding(true)}>
              <Plus size={16} /> Add Product
            </button>
            <div className="relative w-full sm:w-64">
              <Search
                size={16}
                className="absolute left-3 top-3 text-slate-400"
              />
              <input
                className="field !pl-9"
                placeholder="Search products"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
        }
      />
      <div className="card p-4">
        {loading ? (
          <p>Loading…</p>
        ) : data.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th className="amount">Price</th>
                  <th>Created</th>
                  <th>Last Used</th>
                  <th className="amount">Sales</th>
                  <th className="amount">Returns</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p: any) => (
                  <tr key={p.id}>
                    <td className="font-semibold">{p.name}</td>
                    <td className="amount">{cash(p.price)}</td>
                    <td>{String(p.created_at).slice(0, 10)}</td>
                    <td>
                      {p.last_used_at
                        ? String(p.last_used_at).slice(0, 10)
                        : "—"}
                    </td>
                    <td className="amount">{p.sale_uses}</td>
                    <td className="amount">
                      {Number(p.sale_return_uses) +
                        Number(p.direct_return_uses)}
                    </td>
                    <td>
                      <ProductActions
                        onEdit={() => setEdit(p)}
                        onDelete={() => remove(p)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No products in the database." />
        )}
      </div>
      {edit && (
        <Modal title="Edit Product" onClose={() => setEdit(null)}>
          <form onSubmit={save}>
            <label className="label">Product name</label>
            <input
              className="field"
              name="name"
              defaultValue={edit.name}
              autoFocus
              required
            />
            <label className="label mt-4">Price</label>
            <input className="field" name="price" type="number" min="0" step="0.01" defaultValue={Number(edit.price || 0)} required />
            <p className="mt-2 text-xs text-slate-500">
              Renaming changes future suggestions. Existing invoice descriptions
              remain unchanged.
            </p>
            <button className="btn btn-primary mt-5 w-full">
              Save Changes
            </button>
          </form>
        </Modal>
      )}
      {adding && (
        <Modal title="Add Product" onClose={() => setAdding(false)}>
          <form onSubmit={create}>
            <label className="label">Product name</label>
            <input className="field" name="name" autoFocus required />
            <label className="label mt-4">Price</label>
            <input className="field" name="price" type="number" min="0" step="0.01" required />
            <button className="btn btn-primary mt-5 w-full">Save Product</button>
          </form>
        </Modal>
      )}
    </>
  );
}

function Payments({
  tick,
  notify,
  refresh,
}: {
  tick: number;
  notify: (s: string) => void;
  refresh: () => void;
}) {
  const { data = [], loading } = useData("payments", "", tick);
  const { data: customers = [] } = useData("customers", "", tick);
  const [area, setArea] = useState(0);
  const [village, setVillage] = useState(0);
  const [customer, setCustomer] = useState(0);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<any>(null);
  const [edit, setEdit] = useState<any>(null);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await post({
        action: "payment.save",
        ...Object.fromEntries(new FormData(e.currentTarget)),
      });
      setOpen(false);
      notify("Payment received");
      refresh();
    } catch (e: any) {
      alert(e.message);
    }
  }
  async function update(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await post({
        action: "payment.update",
        id: edit.id,
        ...Object.fromEntries(new FormData(e.currentTarget)),
      });
      setEdit(null);
      notify("Payment updated");
      refresh();
    } catch (e: any) {
      alert(e.message);
    }
  }
  async function remove(x: any) {
    if (!confirm(`Delete payment ${x.receipt_no} permanently?`)) return;
    try {
      await post({ action: "payment.delete", id: x.id });
      notify("Payment deleted");
      refresh();
    } catch (e: any) {
      alert(e.message);
    }
  }
  const filtered = data.filter(
    (payment: any) =>
      (!area || Number(payment.area_id) === area) &&
      (!village || Number(payment.village_id) === village) &&
      (!customer || Number(payment.customer_id) === customer),
  );
  function changeArea(value: number) {
    setArea(value); setVillage(0);
    const selected = customers.find(
      (item: any) => Number(item.id) === customer,
    );
    if (selected && Number(selected.area_id || 0) !== value) setCustomer(0);
  }
  function changeCustomer(value: number, selected?: any) {
    setCustomer(value || 0);
    if (selected?.area_id) setArea(Number(selected.area_id));
    if (selected?.village_id) setVillage(Number(selected.village_id));
  }
  function changeVillage(value: number, selected?: any) {
    setVillage(value);
    if (selected?.area_id) setArea(Number(selected.area_id));
    const chosen = customers.find((item: any) => Number(item.id) === customer);
    if (chosen && Number(chosen.village_id || 0) !== value) setCustomer(0);
  }
  return (
    <>
      <Header
        title="Customer Payments"
        subtitle="Payments reduce the customer's overall balance"
        action={
          <button onClick={() => setOpen(true)} className="btn btn-primary">
            <Plus size={17} />
            Receive payment
          </button>
        }
      />
      <div className="card mb-5 grid gap-3 p-4 sm:grid-cols-3">
        <div>
          <label className="label">Area</label>
          <AreaSelect value={area} onChange={changeArea} />
        </div>
        <div>
          <label className="label">Village</label>
          <VillageSelect value={village} areaId={area} onChange={changeVillage} />
        </div>
        <div>
          <label className="label">Customer</label>
          <CustomerSelect
            value={customer}
            onChange={changeCustomer}
            areaId={area}
            villageId={village}
            emptyLabel="All Customers"
          />
        </div>
      </div>
      <div className="card p-4">
        {loading ? (
          <p>Loading…</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Area / Village</th>
                  <th>Reference</th>
                  <th>Status</th>
                  <th className="amount">Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((x: any) => (
                  <tr key={x.id}>
                    <td className="font-semibold">{x.receipt_no}</td>
                    <td>{x.payment_date}</td>
                    <td>{x.customer_name}</td>
                    <td>{[x.area_name, x.village_name].filter(Boolean).join(" / ") || "—"}</td>
                    <td>{x.reference || "—"}</td>
                    <td>
                      <Status value={x.status} />
                    </td>
                    <td className="amount font-bold">{cash(x.amount)}</td>
                    <td>
                      <ReturnActions
                        canEdit
                        onView={() => setView(x)}
                        onEdit={() => setEdit(x)}
                        onDelete={() => remove(x)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {open && (
        <Modal title="Receive customer payment" onClose={() => setOpen(false)}>
          <form onSubmit={save} className="space-y-4">
            <div>
              <label className="label">Customer</label>
              <select className="field" name="customer_id" required>
                <option value="">Choose customer</option>
                <CustomerOptions />
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Date</label>
                <input
                  className="field"
                  name="payment_date"
                  type="date"
                  defaultValue={TODAY}
                />
              </div>
              <div>
                <label className="label">Cash amount</label>
                <input
                  className="field"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Reference</label>
              <input className="field" name="reference" />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="field" name="notes" />
            </div>
            <button className="btn btn-primary w-full">Save payment</button>
          </form>
        </Modal>
      )}
      {view && (
        <Modal title="Payment Receipt" onClose={() => setView(null)}>
          <div className="print-card text-sm">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold">Lite POS</h2>
              <p className="text-slate-500">Customer Payment Receipt</p>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Receipt</span>
                <b>{view.receipt_no}</b>
              </div>
              <div className="flex justify-between">
                <span>Date</span>
                <b>{view.payment_date}</b>
              </div>
              <div className="flex justify-between">
                <span>Customer</span>
                <b>{view.customer_name}</b>
              </div>
              <div className="flex justify-between">
                <span>Reference</span>
                <b>{view.reference || "—"}</b>
              </div>
              <div className="flex justify-between border-t pt-3 text-lg">
                <span>Amount received</span>
                <b>{cash(view.amount)}</b>
              </div>
              {view.notes && (
                <p className="rounded-lg bg-slate-50 p-3">{view.notes}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="no-print btn btn-primary mt-5 w-full"
          >
            Print Receipt
          </button>
        </Modal>
      )}
      {edit && (
        <Modal title={`Edit ${edit.receipt_no}`} onClose={() => setEdit(null)}>
          <form onSubmit={update} className="space-y-4">
            <div>
              <label className="label">Customer</label>
              <select
                className="field"
                name="customer_id"
                defaultValue={edit.customer_id}
                required
              >
                <CustomerOptions />
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Date</label>
                <input
                  className="field"
                  name="payment_date"
                  type="date"
                  defaultValue={edit.payment_date}
                  required
                />
              </div>
              <div>
                <label className="label">Cash amount</label>
                <input
                  className="field"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={edit.amount}
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Reference</label>
              <input
                className="field"
                name="reference"
                defaultValue={edit.reference || ""}
              />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea
                className="field"
                name="notes"
                defaultValue={edit.notes || ""}
              />
            </div>
            <button className="btn btn-primary w-full">Save Changes</button>
          </form>
        </Modal>
      )}
    </>
  );
}
function CustomerOptions() {
  const { data = [] } = useData("customers");
  return (
    <>
      {data.map((c: any) => (
        <option key={c.id} value={c.id}>
          {c.code} — {c.name}
        </option>
      ))}
    </>
  );
}

function Returns({
  tick,
  notify,
  refresh,
}: {
  tick: number;
  notify: (s: string) => void;
  refresh: () => void;
}) {
  const { data = [], loading } = useData("returns", "", tick);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<any>(null);
  const [edit, setEdit] = useState<number | null>(null);
  async function remove(x: any) {
    if (!confirm("Delete this return permanently?")) return;
    try {
      await post({
        action: "return.delete",
        id: x.id,
        return_type: x.return_type,
      });
      notify("Return deleted");
      refresh();
    } catch (e: any) {
      alert(e.message);
    }
  }
  return (
    <>
      <Header
        title="Sales Returns"
        subtitle="Invoice returns and standalone cash refunds"
        action={
          <button onClick={() => setOpen(true)} className="btn btn-primary">
            <Plus size={17} />
            Add Direct Return
          </button>
        }
      />
      <div className="card p-4">
        {loading ? (
          <p>Loading…</p>
        ) : data.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Return</th>
                  <th>Source</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Settlement</th>
                  <th>Status</th>
                  <th className="amount">Refund</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((x: any) => (
                  <tr key={`${x.return_type}-${x.id}`}>
                    <td className="font-semibold">{x.return_no}</td>
                    <td>{x.invoice_no}</td>
                    <td>{x.return_date}</td>
                    <td>{x.customer_name || "Walk-in"}</td>
                    <td>{x.settlement}</td>
                    <td>
                      <Status value={x.status} />
                    </td>
                    <td className="amount">{cash(x.total)}</td>
                    <td>
                      <ReturnActions
                        canEdit={x.return_type === "direct"}
                        onView={() => setView(x)}
                        onEdit={() => setEdit(x.id)}
                        onDelete={() => remove(x)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No returns have been recorded." />
        )}
      </div>
      {open && (
        <DirectReturnModal
          onClose={() => setOpen(false)}
          done={() => {
            setOpen(false);
            notify("Direct return and cash refund saved");
            refresh();
          }}
        />
      )}
      {view && (
        <Modal title="Return Details" onClose={() => setView(null)}>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Return number</p>
              <b>{view.return_no}</b>
            </div>
            <div>
              <p className="text-slate-500">Date</p>
              <b>{view.return_date}</b>
            </div>
            <div>
              <p className="text-slate-500">Customer</p>
              <b>{view.customer_name || "Walk-in"}</b>
            </div>
            <div>
              <p className="text-slate-500">Source</p>
              <b>{view.invoice_no}</b>
            </div>
            <div>
              <p className="text-slate-500">Reason</p>
              <b>{view.reason}</b>
            </div>
            <div>
              <p className="text-slate-500">Cash refund</p>
              <b className="text-red-700">{cash(view.total)}</b>
            </div>
          </div>
        </Modal>
      )}
      {edit && (
        <DirectReturnEditModal
          id={edit}
          onClose={() => setEdit(null)}
          done={() => {
            setEdit(null);
            notify("Direct return updated");
            refresh();
          }}
        />
      )}
    </>
  );
}
function DirectReturnModal({
  onClose,
  done,
}: {
  onClose: () => void;
  done: () => void;
}) {
  const [customer, setCustomer] = useState<any>(null);
  const [date, setDate] = useState(TODAY);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<any[]>([
    { name: "", product_id: null, quantity: 1, unit_price: 0 },
  ]);
  const update = (i: number, v: any) =>
    setLines((x) => x.map((r, n) => (n === i ? v : r)));
  const total = useMemo(
    () =>
      lines.reduce(
        (a, x) => a + Number(x.quantity || 0) * Number(x.unit_price || 0),
        0,
      ),
    [lines],
  );
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await post({
        action: "direct-return.save",
        return_date: date,
        customer_id: customer,
        reason,
        notes,
        items: lines,
      });
      done();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Add Direct Return" onClose={onClose} wide>
      <form onSubmit={save}>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="label">Customer (optional)</label>
            <CustomerSelect value={customer} onChange={setCustomer} />
          </div>
          <div>
            <label className="label">Return date</label>
            <input
              className="field"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Reason</label>
            <input
              className="field"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for return"
              required
            />
          </div>
        </div>
        <div className="mt-5 table-wrap overflow-visible">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Refund price</th>
                <th className="amount">Refund total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((x, i) => (
                <tr key={i}>
                  <td>
                    <ProductInput line={x} onChange={(v) => update(i, v)} />
                  </td>
                  <td>
                    <input
                      className="field w-28"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={x.quantity}
                      onChange={(e) =>
                        update(i, { ...x, quantity: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="field w-32"
                      type="number"
                      min="0"
                      step="0.01"
                      value={x.unit_price}
                      onChange={(e) =>
                        update(i, { ...x, unit_price: e.target.value })
                      }
                    />
                  </td>
                  <td className="amount font-semibold">
                    {cash(Number(x.quantity) * Number(x.unit_price))}
                  </td>
                  <td>
                    <button
                      type="button"
                      disabled={lines.length === 1}
                      onClick={() =>
                        setLines((v) => v.filter((_, n) => n !== i))
                      }
                      className="text-red-500"
                    >
                      <X size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <button
            type="button"
            onClick={() =>
              setLines((v) => [
                ...v,
                { name: "", product_id: null, quantity: 1, unit_price: 0 },
              ])
            }
            className="btn btn-soft"
          >
            <Plus size={16} />
            Add product
          </button>
          <div className="text-right">
            <p className="text-sm text-slate-500">Cash refund</p>
            <p className="text-2xl font-bold text-red-700">{cash(total)}</p>
          </div>
        </div>
        <div className="mt-4">
          <label className="label">Notes</label>
          <textarea
            className="field"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <button disabled={busy} className="btn btn-primary mt-5 w-full">
          {busy ? "Saving refund…" : `Save & Refund ${cash(total)}`}
        </button>
      </form>
    </Modal>
  );
}
function DirectReturnEditModal({
  id,
  onClose,
  done,
}: {
  id: number;
  onClose: () => void;
  done: () => void;
}) {
  const { data, loading } = useData("direct-return", `&id=${id}`);
  if (loading)
    return (
      <Modal title="Edit Direct Return" onClose={onClose}>
        <p>Loading…</p>
      </Modal>
    );
  return <DirectReturnEditForm data={data} onClose={onClose} done={done} />;
}
function DirectReturnEditForm({
  data,
  onClose,
  done,
}: {
  data: any;
  onClose: () => void;
  done: () => void;
}) {
  const r = data.return;
  const [customer, setCustomer] = useState<any>(r.customer_id);
  const [date, setDate] = useState(r.return_date);
  const [reason, setReason] = useState(r.reason || "");
  const [notes, setNotes] = useState(r.notes || "");
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<any[]>(
    data.items.map((x: any) => ({
      name: x.product_name,
      product_id: x.product_id,
      quantity: Number(x.quantity),
      unit_price: Number(x.unit_price),
    })),
  );
  const update = (i: number, v: any) =>
    setLines((x) => x.map((a, n) => (n === i ? v : a)));
  const total = useMemo(
    () =>
      lines.reduce(
        (a, x) => a + Number(x.quantity || 0) * Number(x.unit_price || 0),
        0,
      ),
    [lines],
  );
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await post({
        action: "direct-return.update",
        id: r.id,
        return_date: date,
        customer_id: customer,
        reason,
        notes,
        items: lines,
      });
      done();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`Edit ${r.return_no}`} onClose={onClose} wide>
      <form onSubmit={save}>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="label">Customer (optional)</label>
            <CustomerSelect value={customer} onChange={setCustomer} />
          </div>
          <div>
            <label className="label">Return date</label>
            <input
              className="field"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Reason</label>
            <input
              className="field"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="mt-5 table-wrap overflow-visible">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Refund price</th>
                <th className="amount">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((x, i) => (
                <tr key={i}>
                  <td>
                    <ProductInput line={x} onChange={(v) => update(i, v)} />
                  </td>
                  <td>
                    <input
                      className="field w-28"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={x.quantity}
                      onChange={(e) =>
                        update(i, { ...x, quantity: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="field w-32"
                      type="number"
                      min="0"
                      step="0.01"
                      value={x.unit_price}
                      onChange={(e) =>
                        update(i, { ...x, unit_price: e.target.value })
                      }
                    />
                  </td>
                  <td className="amount font-semibold">
                    {cash(Number(x.quantity) * Number(x.unit_price))}
                  </td>
                  <td>
                    <button
                      type="button"
                      disabled={lines.length === 1}
                      onClick={() =>
                        setLines((v) => v.filter((_, n) => n !== i))
                      }
                      className="text-red-500"
                    >
                      <X size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-between">
          <button
            type="button"
            className="btn btn-soft"
            onClick={() =>
              setLines((v) => [
                ...v,
                { name: "", product_id: null, quantity: 1, unit_price: 0 },
              ])
            }
          >
            <Plus size={16} />
            Add product
          </button>
          <div className="text-right">
            <p className="text-sm text-slate-500">Cash refund</p>
            <p className="text-2xl font-bold text-red-700">{cash(total)}</p>
          </div>
        </div>
        <div className="mt-4">
          <label className="label">Notes</label>
          <textarea
            className="field"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <button disabled={busy} className="btn btn-primary mt-5 w-full">
          {busy ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </Modal>
  );
}

// Kept only for compatibility with old bookmarked state; it is no longer routed or shown.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Ledger() {
  const { data: customers = [] } = useData("customers");
  const [id, setId] = useState(0);
  const extra = useMemo(
    () => (id ? `&customer_id=${id}` : "&customer_id=0"),
    [id],
  );
  const { data } = useData("ledger", extra);
  const selected = customers.find((c: any) => c.id === id);
  return (
    <>
      <Header
        title="Customer Ledger"
        subtitle="A complete running account history"
        action={
          <select
            className="field min-w-64"
            value={id}
            onChange={(e) => setId(Number(e.target.value))}
          >
            <option value="0">Select customer</option>
            {customers.map((c: any) => (
              <option value={c.id} key={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        }
      />
      {id && data ? (
        <section className="card print-card p-5">
          <div className="mb-5 flex justify-between">
            <div>
              <h2 className="font-bold">{selected?.name}</h2>
              <p className="text-sm text-slate-500">{selected?.phone}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Closing balance</p>
              <b className="text-xl">
                {data.balance >= 0
                  ? `Due ${cash(data.balance)}`
                  : `Advance ${cash(-data.balance)}`}
              </b>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th className="amount">Debit</th>
                  <th className="amount">Credit</th>
                  <th className="amount">Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((x: any) => (
                  <tr key={x.id}>
                    <td>{x.txn_date}</td>
                    <td>{x.reference_no}</td>
                    <td>{x.type.replaceAll("_", " ")}</td>
                    <td>{x.description}</td>
                    <td className="amount">{cash(x.debit)}</td>
                    <td className="amount">{cash(x.credit)}</td>
                    <td className="amount font-bold">
                      {cash(x.running_balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => window.print()}
            className="no-print btn btn-soft mt-4"
          >
            Print ledger
          </button>
        </section>
      ) : (
        <div className="card">
          <Empty text="Select a customer to view the ledger." />
        </div>
      )}
    </>
  );
}

function Reports() {
  const { data: customers = [] } = useData("customers");
  const [from, setFrom] = useState(TODAY.slice(0, 8) + "01");
  const [to, setTo] = useState(TODAY);
  const [area, setArea] = useState(0);
  const [village, setVillage] = useState(0);
  const [customer, setCustomer] = useState(0);
  const [product, setProduct] = useState(0);
  const [search, setSearch] = useState("");
  const extra = useMemo(
    () =>
      `&from=${from}&to=${to}&area_id=${area}&village_id=${village}&customer_id=${customer}&product_id=${product}&search=${encodeURIComponent(search)}`,
    [from, to, area, village, customer, product, search],
  );
  const { data, loading } = useData("report", extra);
  function changeArea(value: number) {
    setArea(value); setVillage(0);
    const selected = customers.find(
      (item: any) => Number(item.id) === customer,
    );
    if (selected && Number(selected.area_id || 0) !== value) setCustomer(0);
  }
  function changeCustomer(value: number, selected?: any) {
    setCustomer(value || 0);
    if (selected?.area_id) setArea(Number(selected.area_id));
    if (selected?.village_id) setVillage(Number(selected.village_id));
  }
  function changeVillage(value: number, selected?: any) {
    setVillage(value);
    if (selected?.area_id) setArea(Number(selected.area_id));
    const chosen = customers.find((item: any) => Number(item.id) === customer);
    if (chosen && Number(chosen.village_id || 0) !== value) setCustomer(0);
  }
  function csv() {
    if (!data) return;
    const lines = [
      ["Date", "Invoice", "Customer", "Area", "Village", "Product", "Quantity", "Unit Price", "Discount", "Total"],
      ...(data.sales || []).map((x: any) => [
        x.sale_date,
        x.invoice_no,
        x.customer_name,
        x.area_name || "",
        x.village_name || "",
        x.product_name,
        x.quantity ?? "",
        x.unit_price ?? "",
        x.discount,
        x.total,
      ]),
    ];
    const blob = new Blob(
      [
        lines
          .map((r: any[]) =>
            r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","),
          )
          .join("\n"),
      ],
      { type: "text/csv" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sales-report-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <>
      <Header
        title="Detailed Sales Report"
        subtitle="Filter sales by date, customer, product, or search term"
        action={
          <button onClick={csv} className="btn btn-soft">
            <FileText size={16} />
            Export CSV
          </button>
        }
      />
      <div className="card no-print mb-5 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-7">
        <div>
          <label className="label">Area</label>
          <AreaSelect value={area} onChange={changeArea} />
        </div>
        <div>
          <label className="label">Village</label>
          <VillageSelect value={village} areaId={area} onChange={changeVillage} />
        </div>
        <div>
          <label className="label">Customer</label>
          <CustomerSelect
            value={customer}
            onChange={changeCustomer}
            emptyLabel="All Customers"
            areaId={area}
            villageId={village}
          />
        </div>
        <div>
          <label className="label">From date</label>
          <input
            className="field"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="label">To date</label>
          <input
            className="field"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Product</label>
          <ReportProductSelect value={product} onChange={setProduct} />
        </div>
        <div>
          <label className="label">Search</label>
          <input
            className="field"
            placeholder="Invoice, customer, product"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      {loading ? (
        <p>Loading…</p>
      ) : (
        data && (
          <>
            <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Gross sales", data.summary.gross],
                ["Discount", data.summary.discount],
                ["Returns", data.returns],
                [
                  "Net sales",
                  Number(data.summary.sales) - Number(data.returns),
                ],
              ].map(([l, v]) => (
                <div className="card p-5" key={String(l)}>
                  <p className="text-sm text-slate-500">{l}</p>
                  <p className="mt-2 text-2xl font-bold">{cash(v)}</p>
                </div>
              ))}
            </div>
            <section className="card print-card mb-5 p-5">
              <div className="mb-4">
                <h2 className="font-bold">Sales details</h2>
                <p className="text-sm text-slate-500">
                  {from} to {to}
                </p>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Customer</th>
                      <th>Area</th>
                      <th>Village</th>
                      <th>Date</th>
                      <th>Product</th>
                      <th className="amount">Quantity</th>
                      <th className="amount">Unit Price</th>
                      <th className="amount">Discount</th>
                      <th className="amount">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.sales || []).map((sale: any) => (
                      <tr key={`${sale.sale_id}-${sale.item_id ?? "due"}`}>
                        <td className="font-semibold">{sale.invoice_no}</td>
                        <td>{sale.customer_name}</td>
                        <td>{sale.area_name || "—"}</td>
                        <td>{sale.village_name || "—"}</td>
                        <td>{sale.sale_date}</td>
                        <td>{sale.product_name || "—"}</td>
                        <td className="amount">{sale.quantity ?? "—"}</td>
                        <td className="amount">{sale.unit_price == null ? "—" : cash(sale.unit_price)}</td>
                        <td className="amount">{cash(sale.discount)}</td>
                        <td className="amount">{cash(sale.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <button
              onClick={() => window.print()}
              className="no-print btn btn-soft"
            >
              Print report
            </button>
          </>
        )
      )}
    </>
  );
}

function ProductReturnReport({ tick }: { tick: number }) {
  const { data = [], loading } = useData("returns", "", tick);
  const { data: customers = [] } = useData("customers", "", tick);
  const [from, setFrom] = useState(TODAY.slice(0, 8) + "01");
  const [to, setTo] = useState(TODAY);
  const [area, setArea] = useState(0);
  const [village, setVillage] = useState(0);
  const [customer, setCustomer] = useState(0);
  const [search, setSearch] = useState("");
  const filtered = data.filter(
    (x: any) =>
      x.return_date >= from &&
      x.return_date <= to &&
      (!area || Number(x.area_id) === area) &&
      (!village || Number(x.village_id) === village) &&
      (!customer || Number(x.customer_id) === customer) &&
      (!search ||
        `${x.return_no} ${x.invoice_no} ${x.customer_name || ""} ${x.reason || ""}`
          .toLowerCase()
          .includes(search.toLowerCase())),
  );
  const total = filtered
    .filter((x: any) => x.status === "active")
    .reduce((a: number, x: any) => a + Number(x.total), 0);
  function changeArea(value: number) {
    setArea(value); setVillage(0);
    const selected = customers.find(
      (item: any) => Number(item.id) === customer,
    );
    if (selected && Number(selected.area_id || 0) !== value) setCustomer(0);
  }
  function changeCustomer(value: number, selected?: any) {
    setCustomer(value || 0);
    if (selected?.area_id) setArea(Number(selected.area_id));
    if (selected?.village_id) setVillage(Number(selected.village_id));
  }
  function changeVillage(value: number, selected?: any) {
    setVillage(value);
    if (selected?.area_id) setArea(Number(selected.area_id));
    const chosen = customers.find((item: any) => Number(item.id) === customer);
    if (chosen && Number(chosen.village_id || 0) !== value) setCustomer(0);
  }
  return (
    <>
      <Header
        title="Product Return Report"
        subtitle="Invoice-linked and direct product refunds"
        action={
          <button onClick={() => window.print()} className="btn btn-soft">
            <FileText size={16} />
            Print
          </button>
        }
      />
      <div className="card no-print mb-5 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-6">
        <div>
          <label className="label">From date</label>
          <input
            className="field"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Area</label>
          <AreaSelect value={area} onChange={changeArea} />
        </div>
        <div>
          <label className="label">Village</label>
          <VillageSelect value={village} areaId={area} onChange={changeVillage} />
        </div>
        <div>
          <label className="label">To date</label>
          <input
            className="field"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Customer</label>
          <CustomerSelect
            value={customer}
            onChange={changeCustomer}
            emptyLabel="All Customers"
            areaId={area}
            villageId={village}
          />
        </div>
        <div>
          <label className="label">Search</label>
          <input
            className="field"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Return, invoice, reason"
          />
        </div>
      </div>
      <div className="mb-5 card p-5">
        <p className="text-sm text-slate-500">
          Filtered active returns and refunds
        </p>
        <p className="mt-2 text-2xl font-bold text-red-700">{cash(total)}</p>
      </div>
      <section className="card print-card p-4">
        {loading ? (
          <p>Loading…</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Return</th>
                  <th>Type / Source</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th className="amount">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((x: any) => (
                  <tr key={`${x.return_type}-${x.id}`}>
                    <td className="font-semibold">{x.return_no}</td>
                    <td>{x.invoice_no}</td>
                    <td>{x.return_date}</td>
                    <td>{x.customer_name || "Walk-in"}</td>
                    <td>{x.reason || "—"}</td>
                    <td>
                      <Status value={x.status} />
                    </td>
                    <td className="amount">{cash(x.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function CustomerDueReport({ tick }: { tick: number }) {
  const { data = [], loading } = useData("customers", "", tick);
  const [area, setArea] = useState(0);
  const [village, setVillage] = useState(0);
  const [customer, setCustomer] = useState(0);
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(0);
  const due = data.filter(
    (x: any) =>
      Number(x.balance) > 0 &&
      Number(x.balance) >= min &&
      (!max || Number(x.balance) <= max) &&
      (!area || Number(x.area_id) === area) &&
      (!village || Number(x.village_id) === village) &&
      (!customer || Number(x.id) === customer),
  );
  const total = due.reduce((a: number, x: any) => a + Number(x.balance), 0);
  function changeArea(value: number) {
    setArea(value);
    setVillage(0);
    const selected = data.find((item: any) => Number(item.id) === customer);
    if (selected && Number(selected.area_id || 0) !== value) setCustomer(0);
  }
  function changeVillage(value: number, selected?: any) {
    setVillage(value);
    if (selected?.area_id) setArea(Number(selected.area_id));
    const chosen = data.find((item: any) => Number(item.id) === customer);
    if (chosen && Number(chosen.village_id || 0) !== value) setCustomer(0);
  }
  function changeCustomer(value: number, selected?: any) {
    setCustomer(value || 0);
    if (selected?.area_id) setArea(Number(selected.area_id));
    if (selected?.village_id) setVillage(Number(selected.village_id));
  }
  return (
    <>
      <Header
        title="Customer Due Report"
        subtitle="Customers with an outstanding balance"
        action={
          <button onClick={() => window.print()} className="btn btn-soft">
            <FileText size={16} />
            Print
          </button>
        }
      />
      <div className="card no-print mb-5 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
        <div>
          <label className="label">Area</label>
          <AreaSelect value={area} onChange={changeArea} />
        </div>
        <div>
          <label className="label">Village</label>
          <VillageSelect value={village} areaId={area} onChange={changeVillage} />
        </div>
        <div>
          <label className="label">Customer</label>
          <CustomerSelect
            value={customer}
            onChange={changeCustomer}
            emptyLabel="All Customers"
            areaId={area}
            villageId={village}
          />
        </div>
        <div>
          <label className="label">Minimum due</label>
          <input
            className="field"
            type="number"
            min="0"
            value={min}
            onChange={(e) => setMin(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="label">Maximum due (0 = any)</label>
          <input
            className="field"
            type="number"
            min="0"
            value={max}
            onChange={(e) => setMax(Number(e.target.value))}
          />
        </div>
      </div>
      <div className="mb-5 card p-5">
        <p className="text-sm text-slate-500">Filtered customer due</p>
        <p className="mt-2 text-2xl font-bold text-amber-700">{cash(total)}</p>
      </div>
      <section className="card print-card p-4">
        {loading ? (
          <p>Loading…</p>
        ) : due.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Area / Village</th>
                  <th className="amount">Due</th>
                </tr>
              </thead>
              <tbody>
                {due.map((x: any) => (
                  <tr key={x.id}>
                    <td>{x.code}</td>
                    <td className="font-semibold">{x.name}</td>
                    <td>{x.phone || "—"}</td>
                    <td>
                      {[x.area_name, x.village_name].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="amount font-bold text-amber-700">
                      {cash(x.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No customer dues match these filters." />
        )}
      </section>
    </>
  );
}

function CustomerPaymentReport({ tick }: { tick: number }) {
  const { data = [], loading } = useData("payments", "", tick);
  const { data: customers = [] } = useData("customers", "", tick);
  const [from, setFrom] = useState(TODAY.slice(0, 8) + "01");
  const [to, setTo] = useState(TODAY);
  const [area, setArea] = useState(0);
  const [village, setVillage] = useState(0);
  const [customer, setCustomer] = useState(0);
  const [search, setSearch] = useState("");
  const filtered = data.filter(
    (x: any) =>
      x.payment_date >= from &&
      x.payment_date <= to &&
      (!area || Number(x.area_id) === area) &&
      (!village || Number(x.village_id) === village) &&
      (!customer || Number(x.customer_id) === customer) &&
      (!search ||
        `${x.receipt_no} ${x.customer_name} ${x.reference || ""} ${x.notes || ""}`
          .toLowerCase()
          .includes(search.toLowerCase())),
  );
  const total = filtered
    .filter((x: any) => x.status === "active")
    .reduce((a: number, x: any) => a + Number(x.amount), 0);
  function changeArea(value: number) {
    setArea(value);
    setVillage(0);
    const selected = customers.find((item: any) => Number(item.id) === customer);
    if (selected && Number(selected.area_id || 0) !== value) setCustomer(0);
  }
  function changeVillage(value: number, selected?: any) {
    setVillage(value);
    if (selected?.area_id) setArea(Number(selected.area_id));
    const chosen = customers.find((item: any) => Number(item.id) === customer);
    if (chosen && Number(chosen.village_id || 0) !== value) setCustomer(0);
  }
  function changeCustomer(value: number, selected?: any) {
    setCustomer(value || 0);
    if (selected?.area_id) setArea(Number(selected.area_id));
    if (selected?.village_id) setVillage(Number(selected.village_id));
  }
  return (
    <>
      <Header
        title="Customer Payment History"
        subtitle="Complete customer collection history"
        action={
          <button onClick={() => window.print()} className="btn btn-soft">
            <FileText size={16} />
            Print
          </button>
        }
      />
      <div className="card no-print mb-5 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-6">
        <div>
          <label className="label">From date</label>
          <input
            className="field"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="label">To date</label>
          <input
            className="field"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Area</label>
          <AreaSelect value={area} onChange={changeArea} />
        </div>
        <div>
          <label className="label">Village</label>
          <VillageSelect value={village} areaId={area} onChange={changeVillage} />
        </div>
        <div>
          <label className="label">Customer</label>
          <CustomerSelect
            value={customer}
            onChange={changeCustomer}
            emptyLabel="All Customers"
            areaId={area}
            villageId={village}
          />
        </div>
        <div>
          <label className="label">Search</label>
          <input
            className="field"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Receipt, customer, reference"
          />
        </div>
      </div>
      <div className="mb-5 card p-5">
        <p className="text-sm text-slate-500">Filtered active collections</p>
        <p className="mt-2 text-2xl font-bold text-emerald-700">
          {cash(total)}
        </p>
      </div>
      <section className="card print-card p-4">
        {loading ? (
          <p>Loading…</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Reference</th>
                  <th>Notes</th>
                  <th>Status</th>
                  <th className="amount">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((x: any) => (
                  <tr key={x.id}>
                    <td className="font-semibold">{x.receipt_no}</td>
                    <td>{x.payment_date}</td>
                    <td>{x.customer_name}</td>
                    <td>{x.reference || "—"}</td>
                    <td>{x.notes || "—"}</td>
                    <td>
                      <Status value={x.status} />
                    </td>
                    <td className="amount font-bold">{cash(x.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function SettingsView({
  notify,
  refresh,
}: {
  notify: (s: string) => void;
  refresh: () => void;
}) {
  const { data, loading } = useData("settings");
  const [busy, setBusy] = useState(false);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      await post({
        action: "settings.save",
        ...Object.fromEntries(new FormData(e.currentTarget)),
      });
      refresh();
      notify("Settings saved");
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <p>Loading…</p>;
  return (
    <>
      <Header
        title="Business Settings"
        subtitle="Invoice identity and print preferences"
      />
      <form onSubmit={save} className="card max-w-3xl p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["business_name", "Business name"],
            ["phone", "Phone"],
            ["email", "Email"],
            ["address", "Address"],
            ["currency", "Currency symbol"],
            ["invoice_footer", "Invoice footer"],
          ].map(([n, l]) => (
            <div key={n}>
              <label className="label">{l}</label>
              <input className="field" name={n} defaultValue={data[n] || ""} />
            </div>
          ))}
          <div>
            <label className="label">Default invoice format</label>
            <select
              className="field"
              name="invoice_format"
              defaultValue={data.invoice_format}
            >
              <option value="thermal">Thermal</option>
              <option value="a4">A4</option>
            </select>
          </div>
          <div>
            <label className="label">Thermal width</label>
            <select
              className="field"
              name="thermal_width"
              defaultValue={data.thermal_width}
            >
              <option>80mm</option>
              <option>58mm</option>
            </select>
          </div>
          <div>
            <label className="label">Language</label>
            <select
              className="field"
              name="language"
              defaultValue={data.language || "en"}
            >
              <option value="en">English</option>
              <option value="bn">Bangla</option>
            </select>
          </div>
          <div>
            <label className="label">Numbers and dates</label>
            <select className="field" name="numeral_system" defaultValue={data.numeral_system || "en"}>
              <option value="en">English digits</option>
              <option value="bn">Bangla digits</option>
            </select>
          </div>
          <div>
            <label className="label">Invoice language</label>
            <select className="field" name="invoice_language" defaultValue={data.invoice_language || "en"}>
              <option value="en">English</option>
              <option value="bn">Bangla</option>
              <option value="both">English + Bangla</option>
            </select>
          </div>
        </div>
        <button disabled={busy} className="btn btn-primary mt-5">
          {busy ? "Saving…" : "Save settings"}
        </button>
      </form>
    </>
  );
}
