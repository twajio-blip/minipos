import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import {
  customerBalance,
  db,
  nextNumber,
  normalizeProductName,
} from "@/lib/db";
import { money, today } from "@/lib/money";

const fail = (message: string, status = 422) =>
  NextResponse.json({ message }, { status });
const rows = <T = Record<string, unknown>>(sql: string, ...params: unknown[]) =>
  db.prepare(sql).all(...params) as T[];

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") || "dashboard";
  if (type === "public-settings")
    return NextResponse.json(db.prepare("SELECT business_name,language FROM settings WHERE id=1").get());
  if (!(await currentUser())) return fail("Unauthenticated", 401);
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const from = req.nextUrl.searchParams.get("from") || today();
  const to = req.nextUrl.searchParams.get("to") || today();
  const customerId = Number(req.nextUrl.searchParams.get("customer_id") || 0);
  const areaId = Number(req.nextUrl.searchParams.get("area_id") || req.nextUrl.searchParams.get("zone_id") || 0);
  const villageId = Number(req.nextUrl.searchParams.get("village_id") || 0);
  if (type === "settings")
    return NextResponse.json(
      db.prepare("SELECT * FROM settings WHERE id=1").get(),
    );
  if (type === "customers") {
    const areaCondition = areaId ? "AND c.zone_id=?" : "";
    const villageCondition = villageId ? "AND c.village_id=?" : "";
    const params: unknown[] = [...Array(3).fill(`%${q}%`)];
    if (areaId) params.push(areaId);
    if (villageId) params.push(villageId);
    const data = rows(
      `SELECT c.*,c.zone_id area_id,z.name area_name,v.name village_name,ROUND(COALESCE(SUM(l.debit-l.credit),0),2) balance
      FROM customers c LEFT JOIN zones z ON z.id=c.zone_id LEFT JOIN villages v ON v.id=c.village_id LEFT JOIN ledger_entries l ON l.customer_id=c.id
      WHERE (c.name LIKE ? OR c.code LIKE ? OR COALESCE(c.phone,'') LIKE ?) ${areaCondition} ${villageCondition}
      GROUP BY c.id ORDER BY c.id DESC`,
      ...params,
    );
    return NextResponse.json(data);
  }
  if (type === "areas" || type === "zones")
    return NextResponse.json(
      rows(
        `SELECT z.*,(SELECT COUNT(*) FROM customers c WHERE c.zone_id=z.id) customer_count,
         (SELECT COUNT(*) FROM villages v WHERE v.area_id=z.id) village_count
         FROM zones z ORDER BY z.name`,
      ),
    );
  if (type === "villages") {
    const condition = areaId ? "WHERE v.area_id=?" : "";
    return NextResponse.json(rows(
      `SELECT v.*,z.name area_name,(SELECT COUNT(*) FROM customers c WHERE c.village_id=v.id) customer_count
       FROM villages v JOIN zones z ON z.id=v.area_id ${condition} ORDER BY z.name,v.name`,
      ...(areaId ? [areaId] : []),
    ));
  }
  if (type === "products")
    return NextResponse.json(
      rows(
        "SELECT * FROM products WHERE normalized_name LIKE ? ORDER BY use_count DESC,last_used_at DESC,name LIMIT 12",
        `%${normalizeProductName(q)}%`,
      ),
    );
  if (type === "product-list")
    return NextResponse.json(
      rows(
        `SELECT p.*,
    (SELECT COUNT(*) FROM sale_items si WHERE si.product_id=p.id) sale_uses,
    (SELECT COUNT(*) FROM sales_return_items sri WHERE sri.product_id=p.id) sale_return_uses,
    (SELECT COUNT(*) FROM direct_return_items dri WHERE dri.product_id=p.id) direct_return_uses
    FROM products p WHERE p.name LIKE ? ORDER BY p.name`,
        `%${q}%`,
      ),
    );
  if (type === "sales")
    return NextResponse.json(
      rows(
        `SELECT s.*,c.name customer_name,COALESCE((SELECT SUM(total) FROM sales_returns r WHERE r.sale_id=s.id AND r.status='active'),0) returned
    FROM sales s LEFT JOIN customers c ON c.id=s.customer_id WHERE (s.invoice_no LIKE ? OR COALESCE(c.name,s.buyer_name,'Walk-in') LIKE ?) ORDER BY s.id DESC LIMIT 300`,
        `%${q}%`,
        `%${q}%`,
      ),
    );
  if (type === "sale") {
    const id = Number(req.nextUrl.searchParams.get("id"));
    return NextResponse.json({
      sale: db
        .prepare(
          "SELECT s.*,c.name customer_name,c.phone customer_phone,c.address customer_address FROM sales s LEFT JOIN customers c ON c.id=s.customer_id WHERE s.id=?",
        )
        .get(id),
      items: rows(
        "SELECT si.*,COALESCE((SELECT SUM(sri.quantity) FROM sales_return_items sri JOIN sales_returns sr ON sr.id=sri.return_id WHERE sri.sale_item_id=si.id AND sr.status='active'),0) returned_qty FROM sale_items si WHERE sale_id=?",
        id,
      ),
    });
  }
  if (type === "payments")
    return NextResponse.json(
      rows(
        "SELECT p.*,c.name customer_name,c.zone_id area_id,c.village_id,z.name area_name,v.name village_name FROM payments p JOIN customers c ON c.id=p.customer_id LEFT JOIN zones z ON z.id=c.zone_id LEFT JOIN villages v ON v.id=c.village_id ORDER BY p.id DESC LIMIT 300",
      ),
    );
  if (type === "returns")
    return NextResponse.json(
      rows(`SELECT r.id,r.return_no,r.return_date,r.total,r.settlement,r.reason,r.status,s.invoice_no,c.name customer_name,r.customer_id,c.zone_id area_id,c.village_id,z.name area_name,v.name village_name,'sale' return_type,r.created_at FROM sales_returns r JOIN sales s ON s.id=r.sale_id LEFT JOIN customers c ON c.id=r.customer_id LEFT JOIN zones z ON z.id=c.zone_id LEFT JOIN villages v ON v.id=c.village_id
    UNION ALL SELECT d.id,d.return_no,d.return_date,d.total,'cash' settlement,d.reason,d.status,'Direct return' invoice_no,c.name customer_name,d.customer_id,c.zone_id area_id,c.village_id,z.name area_name,v.name village_name,'direct' return_type,d.created_at FROM direct_returns d LEFT JOIN customers c ON c.id=d.customer_id LEFT JOIN zones z ON z.id=c.zone_id LEFT JOIN villages v ON v.id=c.village_id ORDER BY 16 DESC LIMIT 300`),
    );
  if (type === "direct-return") {
    const id = Number(req.nextUrl.searchParams.get("id"));
    return NextResponse.json({
      return: db
        .prepare(
          "SELECT d.*,c.name customer_name FROM direct_returns d LEFT JOIN customers c ON c.id=d.customer_id WHERE d.id=?",
        )
        .get(id),
      items: rows(
        "SELECT * FROM direct_return_items WHERE direct_return_id=?",
        id,
      ),
    });
  }
  if (type === "ledger") {
    if (!customerId) return fail("Select a customer");
    let balance = 0;
    const data = rows<{
      id: number;
      txn_date: string;
      reference_no: string;
      type: string;
      description: string;
      debit: number;
      credit: number;
    }>(
      "SELECT * FROM ledger_entries WHERE customer_id=? ORDER BY txn_date,id",
      customerId,
    ).map((x) => ({
      ...x,
      running_balance: (balance = money(
        balance + Number(x.debit) - Number(x.credit),
      )),
    }));
    return NextResponse.json({
      entries: data,
      balance: customerBalance(customerId),
    });
  }
  if (type === "report") {
    const reportCustomer = Number(
      req.nextUrl.searchParams.get("customer_id") || 0,
    );
    const reportProduct = Number(
      req.nextUrl.searchParams.get("product_id") || 0,
    );
    const reportSearch = req.nextUrl.searchParams.get("search")?.trim() || "";
    const conditions = ["s.status='active'", "s.sale_date BETWEEN ? AND ?"];
    const params: unknown[] = [from, to];
    if (reportCustomer) {
      conditions.push("s.customer_id=?");
      params.push(reportCustomer);
    }
    if (areaId) {
      conditions.push("c.zone_id=?");
      params.push(areaId);
    }
    if (villageId) { conditions.push("c.village_id=?"); params.push(villageId); }
    if (reportProduct) {
      conditions.push(
        "EXISTS (SELECT 1 FROM sale_items sx WHERE sx.sale_id=s.id AND sx.product_id=?)",
      );
      params.push(reportProduct);
    }
    if (reportSearch) {
      conditions.push(
        "(s.invoice_no LIKE ? OR COALESCE(c.name,s.buyer_name,'Walk-in') LIKE ? OR EXISTS (SELECT 1 FROM sale_items sq WHERE sq.sale_id=s.id AND sq.product_name LIKE ?))",
      );
      params.push(
        `%${reportSearch}%`,
        `%${reportSearch}%`,
        `%${reportSearch}%`,
      );
    }
    const where = conditions.join(" AND ");
    const summary = db
      .prepare(
        `SELECT COUNT(*) invoices,COALESCE(SUM(s.subtotal),0) gross,COALESCE(SUM(s.line_discount+s.invoice_discount),0) discount,COALESCE(SUM(s.grand_total),0) sales,COALESCE(SUM(s.paid_amount),0) paid,COALESCE(SUM(s.due_amount),0) due FROM sales s LEFT JOIN customers c ON c.id=s.customer_id WHERE ${where}`,
      )
      .get(...params);
    const invoiceReturns = (
      db
        .prepare(
          "SELECT COALESCE(SUM(total),0) total FROM sales_returns WHERE status='active' AND return_date BETWEEN ? AND ?",
        )
        .get(from, to) as { total: number }
    ).total;
    const directReturns = (
      db
        .prepare(
          "SELECT COALESCE(SUM(total),0) total FROM direct_returns WHERE status='active' AND return_date BETWEEN ? AND ?",
        )
        .get(from, to) as { total: number }
    ).total;
    const itemConditions = ["s.status='active'", "s.sale_date BETWEEN ? AND ?"];
    const itemParams: unknown[] = [from, to];
    if (reportCustomer) {
      itemConditions.push("s.customer_id=?");
      itemParams.push(reportCustomer);
    }
    if (areaId) {
      itemConditions.push("c.zone_id=?");
      itemParams.push(areaId);
    }
    if (villageId) { itemConditions.push("c.village_id=?"); itemParams.push(villageId); }
    if (reportProduct) {
      itemConditions.push("si.product_id=?");
      itemParams.push(reportProduct);
    }
    if (reportSearch) {
      itemConditions.push(
        "(s.invoice_no LIKE ? OR COALESCE(c.name,s.buyer_name,'Walk-in') LIKE ? OR si.product_name LIKE ?)",
      );
      itemParams.push(
        `%${reportSearch}%`,
        `%${reportSearch}%`,
        `%${reportSearch}%`,
      );
    }
    const products = rows(
      `SELECT si.product_name,SUM(si.quantity) quantity,SUM(si.total) gross,COALESCE(SUM((SELECT SUM(sri.total) FROM sales_return_items sri JOIN sales_returns sr ON sr.id=sri.return_id WHERE sri.sale_item_id=si.id AND sr.status='active' AND sr.return_date BETWEEN ? AND ?)),0) returned FROM sale_items si JOIN sales s ON s.id=si.sale_id LEFT JOIN customers c ON c.id=s.customer_id WHERE ${itemConditions.join(" AND ")} GROUP BY si.product_id,si.product_name ORDER BY gross DESC`,
      from,
      to,
      ...itemParams,
    );
    return NextResponse.json({
      summary,
      returns: money(invoiceReturns + directReturns),
      products,
    });
  }
  const metrics = db
    .prepare(
      `SELECT COALESCE(SUM(CASE WHEN sale_date=? AND status='active' THEN grand_total ELSE 0 END),0) today_sales,COALESCE(SUM(CASE WHEN sale_date=? AND status='active' THEN paid_amount ELSE 0 END),0) today_sale_cash,COUNT(CASE WHEN sale_date=? AND status='active' THEN 1 END) today_invoices FROM sales`,
    )
    .get(today(), today(), today()) as Record<string, number>;
  const saleRet = (
    db
      .prepare(
        "SELECT COALESCE(SUM(total),0) total FROM sales_returns WHERE return_date=? AND status='active'",
      )
      .get(today()) as { total: number }
  ).total;
  const directRet = (
    db
      .prepare(
        "SELECT COALESCE(SUM(total),0) total FROM direct_returns WHERE return_date=? AND status='active'",
      )
      .get(today()) as { total: number }
  ).total;
  const ret = money(saleRet + directRet);
  const collections = (
    db
      .prepare(
        "SELECT COALESCE(SUM(amount),0) total FROM payments WHERE payment_date=? AND status='active'",
      )
      .get(today()) as { total: number }
  ).total;
  const balances = rows<{ balance: number }>(
    "SELECT SUM(debit-credit) balance FROM ledger_entries GROUP BY customer_id",
  );
  return NextResponse.json({
    metrics: {
      ...metrics,
      today_returns: ret,
      today_net: money(metrics.today_sales - ret),
      today_collections: collections,
      total_due: money(
        balances
          .filter((x) => x.balance > 0)
          .reduce((a, x) => a + x.balance, 0),
      ),
      total_advance: money(
        -balances
          .filter((x) => x.balance < 0)
          .reduce((a, x) => a + x.balance, 0),
      ),
    },
    recent: rows(
      "SELECT s.id,s.invoice_no,s.sale_date,s.grand_total,s.status,COALESCE(c.name,s.buyer_name,'Walk-in') customer_name FROM sales s LEFT JOIN customers c ON c.id=s.customer_id ORDER BY s.id DESC LIMIT 8",
    ),
    top: rows(
      "SELECT product_name,SUM(quantity) quantity,SUM(total) amount FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE s.status='active' GROUP BY product_id,product_name ORDER BY amount DESC LIMIT 5",
    ),
  });
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return fail("Unauthenticated", 401);
  const body = await req.json();
  const action = String(body.action || "");
  try {
    if (action === "area.save" || action === "zone.save") {
      const p = z
        .object({
          id: z.coerce.number().int().positive().optional(),
          name: z.string().trim().min(1, "Area name is required"),
          status: z.enum(["active", "inactive"]).default("active"),
        })
        .parse(body);
      if (p.id) {
        db.prepare(
          "UPDATE zones SET name=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
        ).run(p.name, p.status, p.id);
        db.prepare("UPDATE customers SET zone=? WHERE zone_id=?").run(
          p.name,
          p.id,
        );
        return NextResponse.json({ id: p.id });
      }
      const result = db
        .prepare("INSERT INTO zones(name,status) VALUES(?,?)")
        .run(p.name, p.status);
      return NextResponse.json({ id: Number(result.lastInsertRowid) });
    }
    if (action === "area.delete" || action === "zone.delete") {
      const id = z.coerce.number().int().positive().parse(body.id);
      const used = db
        .prepare("SELECT COUNT(*) count FROM customers WHERE zone_id=?")
        .get(id) as { count: number };
      if (used.count)
        return fail(
          "This area is already assigned to customers and cannot be deleted.",
        );
      const villageCount = db.prepare("SELECT COUNT(*) count FROM villages WHERE area_id=?").get(id) as { count: number };
      if (villageCount.count) return fail("Delete this area's villages first.");
      db.prepare("DELETE FROM zones WHERE id=?").run(id);
      return NextResponse.json({ ok: true });
    }
    if (action === "village.save") {
      const p = z.object({
        id: z.coerce.number().int().positive().optional(),
        area_id: z.coerce.number().int().positive("Select an area"),
        name: z.string().trim().min(1, "Village name is required"),
        status: z.enum(["active", "inactive"]).default("active"),
      }).parse(body);
      const area = db.prepare("SELECT id FROM zones WHERE id=? AND status='active'").get(p.area_id);
      if (!area) throw new Error("Select an active area");
      if (p.id) {
        db.prepare("UPDATE villages SET area_id=?,name=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(p.area_id,p.name,p.status,p.id);
        db.prepare("UPDATE customers SET area=? WHERE village_id=?").run(p.name,p.id);
        return NextResponse.json({ id: p.id });
      }
      const result = db.prepare("INSERT INTO villages(area_id,name,status) VALUES(?,?,?)").run(p.area_id,p.name,p.status);
      return NextResponse.json({ id: Number(result.lastInsertRowid) });
    }
    if (action === "village.delete") {
      const id = z.coerce.number().int().positive().parse(body.id);
      const used = db.prepare("SELECT COUNT(*) count FROM customers WHERE village_id=?").get(id) as { count: number };
      if (used.count) return fail("This village is already assigned to customers and cannot be deleted.");
      db.prepare("DELETE FROM villages WHERE id=?").run(id);
      return NextResponse.json({ ok: true });
    }
    if (action === "customer.save") {
      const p = z
        .object({
          id: z.coerce.number().optional(),
          name: z.string().trim().min(1),
          phone: z.string().optional().nullable(),
          email: z.string().optional().nullable(),
          address: z.string().optional().nullable(),
          proprietor: z.string().optional().nullable(),
          nid: z.string().optional().nullable(),
          bin: z.string().optional().nullable(),
          plant: z.string().optional().nullable(),
          industry: z.string().optional().nullable(),
          area_id: z.coerce.number().int().positive("Select an area"),
          village_id: z.coerce.number().int().positive("Select a village"),
          notes: z.string().optional().nullable(),
          status: z.enum(["active", "inactive"]).default("active"),
          opening_amount: z.coerce.number().min(0).default(0),
          opening_type: z.enum(["due", "advance"]).default("due"),
          opening_date: z.string().default(today()),
        })
        .parse(body);
      const result = db.transaction(() => {
        const area = db
          .prepare("SELECT name FROM zones WHERE id=? AND status='active'")
          .get(p.area_id) as { name: string } | undefined;
        if (!area) throw new Error("Select an active area");
        const village = db.prepare("SELECT name FROM villages WHERE id=? AND area_id=? AND status='active'").get(p.village_id,p.area_id) as { name: string } | undefined;
        if (!village) throw new Error("Select an active village in the selected area");
        if (p.id) {
          db.prepare(
            `UPDATE customers SET name=?,phone=?,email=?,address=?,proprietor=?,nid=?,bin=?,plant=?,industry=?,zone_id=?,village_id=?,zone=?,area=?,notes=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
          ).run(
            p.name,
            p.phone,
            p.email,
            p.address,
            p.proprietor,
            p.nid,
            p.bin,
            p.plant,
            p.industry,
            p.area_id,
            p.village_id,
            area.name,
            village.name,
            p.notes,
            p.status,
            p.id,
          );
          return p.id;
        }
        const code = nextNumber("customers", "CUST-");
        const info = db
          .prepare(
            `INSERT INTO customers(code,name,phone,email,address,proprietor,nid,bin,plant,industry,zone_id,village_id,zone,area,notes,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          )
          .run(
            code,
            p.name,
            p.phone,
            p.email,
            p.address,
            p.proprietor,
            p.nid,
            p.bin,
            p.plant,
            p.industry,
            p.area_id,
            p.village_id,
            area.name,
            village.name,
            p.notes,
            p.status,
          );
        const id = Number(info.lastInsertRowid);
        if (p.opening_amount > 0)
          db.prepare(
            `INSERT INTO ledger_entries(customer_id,txn_date,type,reference_type,reference_id,reference_no,description,debit,credit) VALUES(?,?,?,?,?,?,?,?,?)`,
          ).run(
            id,
            p.opening_date,
            p.opening_type === "due" ? "opening_due" : "opening_advance",
            "customer",
            id,
            code,
            "Opening balance",
            p.opening_type === "due" ? money(p.opening_amount) : 0,
            p.opening_type === "advance" ? money(p.opening_amount) : 0,
          );
        return id;
      })();
      return NextResponse.json({ id: result });
    }
    if (action === "customer.opening.set") {
      const p = z.object({
        customer_id: z.coerce.number().int().positive(),
        amount: z.coerce.number().positive(),
        type: z.enum(["due", "advance"]),
        date: z.string().default(today()),
      }).parse(body);
      const customer = db.prepare("SELECT id,code FROM customers WHERE id=?").get(p.customer_id) as { id: number; code: string } | undefined;
      if (!customer) return fail("Customer not found", 404);
      db.transaction(() => {
        db.prepare("DELETE FROM ledger_entries WHERE customer_id=? AND reference_type='customer' AND type IN ('opening_due','opening_advance')").run(p.customer_id);
        db.prepare(`INSERT INTO ledger_entries(customer_id,txn_date,type,reference_type,reference_id,reference_no,description,debit,credit) VALUES(?,?,?,?,?,?,?,?,?)`).run(
          p.customer_id,
          p.date,
          p.type === "due" ? "opening_due" : "opening_advance",
          "customer",
          p.customer_id,
          customer.code,
          "Opening balance",
          p.type === "due" ? money(p.amount) : 0,
          p.type === "advance" ? money(p.amount) : 0,
        );
      })();
      return NextResponse.json({ ok: true });
    }
    if (action === "customer.delete") {
      const id = z.coerce.number().int().positive().parse(body.id);
      const customer = db.prepare("SELECT name FROM customers WHERE id=?").get(id) as { name: string } | undefined;
      if (!customer) return fail("Customer not found", 404);
      const sales = db.prepare("SELECT COUNT(*) count FROM sales WHERE customer_id=?").get(id) as { count: number };
      if (sales.count) return fail("This customer has sales and cannot be deleted.");
      const payments = db.prepare("SELECT COUNT(*) count FROM payments WHERE customer_id=?").get(id) as { count: number };
      if (payments.count) return fail("This customer has payments and cannot be deleted.");
      const returns = db.prepare("SELECT COUNT(*) count FROM direct_returns WHERE customer_id=?").get(id) as { count: number };
      if (returns.count) return fail("This customer has returns and cannot be deleted.");
      db.transaction(() => {
        db.prepare("DELETE FROM ledger_entries WHERE customer_id=?").run(id);
        db.prepare("DELETE FROM customers WHERE id=?").run(id);
      })();
      return NextResponse.json({ ok: true });
    }
    if (action === "product.update") {
      const p = z
        .object({
          id: z.coerce.number().int().positive(),
          name: z.string().trim().min(1),
          price: z.coerce.number().min(0),
        })
        .parse(body);
      const old = db.prepare("SELECT * FROM products WHERE id=?").get(p.id);
      if (!old) return fail("Product not found.", 404);
      db.transaction(() => {
        db.prepare(
          "UPDATE products SET name=?,normalized_name=?,price=? WHERE id=?",
        ).run(p.name.replace(/\s+/g, " "), normalizeProductName(p.name), p.price, p.id);
        db.prepare(
          "INSERT INTO audit_logs(user_id,action,entity_type,entity_id,old_values,new_values,reason) VALUES(?,?,?,?,?,?,?)",
        ).run(
          user.id,
          "update",
          "product",
          p.id,
          JSON.stringify(old),
          JSON.stringify({ name: p.name, price: p.price }),
          "Product updated",
        );
      })();
      return NextResponse.json({ ok: true });
    }
    if (action === "product.create") {
      const p = z.object({ name: z.string().trim().min(1), price: z.coerce.number().min(0) }).parse(body);
      const name = p.name.replace(/\s+/g, " ");
      const existing = db.prepare("SELECT id FROM products WHERE normalized_name=? LIMIT 1").get(normalizeProductName(name));
      if (existing) return fail("A product with this name already exists.", 409);
      const result = db.prepare("INSERT INTO products(name,normalized_name,price,use_count) VALUES(?,?,?,0)").run(name, normalizeProductName(name), p.price);
      return NextResponse.json({ id: Number(result.lastInsertRowid) });
    }
    if (action === "product.delete") {
      const p = z
        .object({ id: z.coerce.number().int().positive() })
        .parse(body);
      const usage = (
        db
          .prepare(
            `SELECT
        (SELECT COUNT(*) FROM sale_items WHERE product_id=?) +
        (SELECT COUNT(*) FROM sales_return_items WHERE product_id=?) +
        (SELECT COUNT(*) FROM direct_return_items WHERE product_id=?) total`,
          )
          .get(p.id, p.id, p.id) as { total: number }
      ).total;
      if (usage > 0)
        return fail(
          "This product is already in use and cannot be deleted.",
          409,
        );
      const old = db.prepare("SELECT * FROM products WHERE id=?").get(p.id);
      if (!old) return fail("Product not found.", 404);
      db.transaction(() => {
        db.prepare("DELETE FROM products WHERE id=?").run(p.id);
        db.prepare(
          "INSERT INTO audit_logs(user_id,action,entity_type,entity_id,old_values,reason) VALUES(?,?,?,?,?,?)",
        ).run(
          user.id,
          "delete",
          "product",
          p.id,
          JSON.stringify(old),
          "Unused product deleted",
        );
      })();
      return NextResponse.json({ ok: true });
    }
    if (action === "sale.save") {
      const p = z
        .object({
          sale_date: z.string(),
          customer_id: z.coerce.number().nullable().optional(),
          buyer_name: z.string().optional(),
          buyer_phone: z.string().optional(),
          invoice_discount: z.coerce.number().min(0).default(0),
          paid_amount: z.coerce.number().min(0),
          notes: z.string().optional(),
          items: z
            .array(
              z.object({
                product_id: z.coerce.number().nullable().optional(),
                name: z.string().trim().min(1),
                quantity: z.coerce.number().positive(),
                unit_price: z.coerce.number().min(0),
                discount: z.coerce.number().min(0).default(0),
              }),
            )
            .min(1),
        })
        .parse(body);
      const id = db.transaction(() => {
        let subtotal = 0,
          lineDiscount = 0;
        const prepared = p.items.map((item) => {
          const gross = money(item.quantity * item.unit_price);
          const total = money(gross - item.discount);
          subtotal = money(subtotal + gross);
          lineDiscount = money(lineDiscount + item.discount);
          return { ...item, total };
        });
        const grand = money(subtotal - lineDiscount - p.invoice_discount);
        if (grand < 0)
          throw new Error("Discount cannot exceed the invoice total.");
        if (!p.customer_id && money(p.paid_amount) !== grand)
          throw new Error("Walk-in sales must be fully paid.");
        if (p.paid_amount > grand)
          throw new Error("Paid amount cannot exceed invoice total.");
        const invoice = nextNumber("sales", "INV-");
        const due = money(grand - p.paid_amount);
        const s = db
          .prepare(
            `INSERT INTO sales(invoice_no,sale_date,customer_id,buyer_name,buyer_phone,subtotal,line_discount,invoice_discount,grand_total,paid_amount,due_amount,notes,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          )
          .run(
            invoice,
            p.sale_date,
            p.customer_id || null,
            p.buyer_name,
            p.buyer_phone,
            subtotal,
            lineDiscount,
            p.invoice_discount,
            grand,
            p.paid_amount,
            due,
            p.notes,
            user.id,
          );
        const saleId = Number(s.lastInsertRowid);
        for (const item of prepared) {
          let productId = item.product_id || null;
          if (!productId) {
            const product = db
              .prepare(
                "INSERT INTO products(name,normalized_name,price,use_count,last_used_at) VALUES(?,?,?,1,CURRENT_TIMESTAMP)",
              )
              .run(
                item.name.trim().replace(/\s+/g, " "),
                normalizeProductName(item.name),
                item.unit_price,
              );
            productId = Number(product.lastInsertRowid);
          } else
            db.prepare(
              "UPDATE products SET use_count=use_count+1,last_used_at=CURRENT_TIMESTAMP WHERE id=?",
            ).run(productId);
          db.prepare(
            "INSERT INTO sale_items(sale_id,product_id,product_name,quantity,unit_price,discount,total) VALUES(?,?,?,?,?,?,?)",
          ).run(
            saleId,
            productId,
            item.name,
            item.quantity,
            item.unit_price,
            item.discount,
            item.total,
          );
        }
        if (p.customer_id) {
          db.prepare(
            `INSERT INTO ledger_entries(customer_id,txn_date,type,reference_type,reference_id,reference_no,description,debit,credit) VALUES(?,?,?,?,?,?,?,?,?)`,
          ).run(
            p.customer_id,
            p.sale_date,
            "sale",
            "sale",
            saleId,
            invoice,
            "Sale invoice",
            grand,
            0,
          );
          if (p.paid_amount > 0)
            db.prepare(
              `INSERT INTO ledger_entries(customer_id,txn_date,type,reference_type,reference_id,reference_no,description,debit,credit) VALUES(?,?,?,?,?,?,?,?,?)`,
            ).run(
              p.customer_id,
              p.sale_date,
              "sale_payment",
              "sale",
              saleId,
              invoice,
              "Cash received with sale",
              0,
              money(p.paid_amount),
            );
        }
        return saleId;
      })();
      return NextResponse.json({ id });
    }
    if (action === "sale.update") {
      const p = z
        .object({
          id: z.coerce.number().int().positive(),
          sale_date: z.string(),
          customer_id: z.coerce.number().nullable().optional(),
          buyer_name: z.string().optional(),
          buyer_phone: z.string().optional(),
          invoice_discount: z.coerce.number().min(0).default(0),
          paid_amount: z.coerce.number().min(0),
          notes: z.string().optional(),
          items: z
            .array(
              z.object({
                product_id: z.coerce.number().nullable().optional(),
                name: z.string().trim().min(1),
                quantity: z.coerce.number().positive(),
                unit_price: z.coerce.number().min(0),
                discount: z.coerce.number().min(0).default(0),
              }),
            )
            .min(1),
        })
        .parse(body);
      db.transaction(() => {
        const old = db.prepare("SELECT * FROM sales WHERE id=?").get(p.id) as
          Record<string, unknown> | undefined;
        if (!old) throw new Error("Sale not found.");
        const activeReturns = (
          db
            .prepare(
              "SELECT COUNT(*) count FROM sales_returns WHERE sale_id=? AND status='active'",
            )
            .get(p.id) as { count: number }
        ).count;
        if (activeReturns)
          throw new Error(
            "Delete or cancel this sale's active returns before editing it.",
          );
        let subtotal = 0,
          lineDiscount = 0;
        const prepared = p.items.map((item) => {
          const gross = money(item.quantity * item.unit_price);
          const total = money(gross - item.discount);
          if (total < 0)
            throw new Error("A line discount cannot exceed its line value.");
          subtotal = money(subtotal + gross);
          lineDiscount = money(lineDiscount + item.discount);
          return { ...item, total };
        });
        const grand = money(subtotal - lineDiscount - p.invoice_discount);
        if (grand < 0)
          throw new Error("Discount cannot exceed the invoice total.");
        if (!p.customer_id && money(p.paid_amount) !== grand)
          throw new Error("Walk-in sales must be fully paid.");
        if (p.paid_amount > grand)
          throw new Error("Paid amount cannot exceed invoice total.");
        const invoice = String(old.invoice_no);
        const due = money(grand - p.paid_amount);
        db.prepare(
          "DELETE FROM ledger_entries WHERE reference_type='sale' AND reference_id=?",
        ).run(p.id);
        db.prepare("DELETE FROM sale_items WHERE sale_id=?").run(p.id);
        db.prepare(
          `UPDATE sales SET sale_date=?,customer_id=?,buyer_name=?,buyer_phone=?,subtotal=?,line_discount=?,invoice_discount=?,grand_total=?,paid_amount=?,due_amount=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        ).run(
          p.sale_date,
          p.customer_id || null,
          p.buyer_name || null,
          p.buyer_phone || null,
          subtotal,
          lineDiscount,
          p.invoice_discount,
          grand,
          p.paid_amount,
          due,
          p.notes || null,
          p.id,
        );
        for (const item of prepared) {
          let productId = item.product_id || null;
          if (!productId) {
            const product = db
              .prepare(
                "INSERT INTO products(name,normalized_name,price,use_count,last_used_at) VALUES(?,?,?,1,CURRENT_TIMESTAMP)",
              )
              .run(
                item.name.trim().replace(/\s+/g, " "),
                normalizeProductName(item.name),
                item.unit_price,
              );
            productId = Number(product.lastInsertRowid);
          } else
            db.prepare(
              "UPDATE products SET use_count=use_count+1,last_used_at=CURRENT_TIMESTAMP WHERE id=?",
            ).run(productId);
          db.prepare(
            "INSERT INTO sale_items(sale_id,product_id,product_name,quantity,unit_price,discount,total) VALUES(?,?,?,?,?,?,?)",
          ).run(
            p.id,
            productId,
            item.name,
            item.quantity,
            item.unit_price,
            item.discount,
            item.total,
          );
        }
        if (p.customer_id) {
          db.prepare(
            `INSERT INTO ledger_entries(customer_id,txn_date,type,reference_type,reference_id,reference_no,description,debit,credit) VALUES(?,?,?,?,?,?,?,?,?)`,
          ).run(
            p.customer_id,
            p.sale_date,
            "sale",
            "sale",
            p.id,
            invoice,
            "Sale invoice",
            grand,
            0,
          );
          if (p.paid_amount > 0)
            db.prepare(
              `INSERT INTO ledger_entries(customer_id,txn_date,type,reference_type,reference_id,reference_no,description,debit,credit) VALUES(?,?,?,?,?,?,?,?,?)`,
            ).run(
              p.customer_id,
              p.sale_date,
              "sale_payment",
              "sale",
              p.id,
              invoice,
              "Cash received with sale",
              0,
              money(p.paid_amount),
            );
        }
        db.prepare(
          "INSERT INTO audit_logs(user_id,action,entity_type,entity_id,old_values,new_values,reason) VALUES(?,?,?,?,?,?,?)",
        ).run(
          user.id,
          "update",
          "sale",
          p.id,
          JSON.stringify(old),
          JSON.stringify({
            ...p,
            subtotal,
            line_discount: lineDiscount,
            grand_total: grand,
            due_amount: due,
          }),
          "Sale edited by user",
        );
      })();
      return NextResponse.json({ id: p.id });
    }
    if (action === "payment.save") {
      const p = z
        .object({
          customer_id: z.coerce.number().int().positive(),
          payment_date: z.string(),
          amount: z.coerce.number().positive(),
          reference: z.string().optional(),
          notes: z.string().optional(),
        })
        .parse(body);
      const id = db.transaction(() => {
        const receipt = nextNumber("payments", "PAY-");
        const x = db
          .prepare(
            "INSERT INTO payments(receipt_no,customer_id,payment_date,amount,reference,notes,created_by) VALUES(?,?,?,?,?,?,?)",
          )
          .run(
            receipt,
            p.customer_id,
            p.payment_date,
            money(p.amount),
            p.reference,
            p.notes,
            user.id,
          );
        const id = Number(x.lastInsertRowid);
        db.prepare(
          `INSERT INTO ledger_entries(customer_id,txn_date,type,reference_type,reference_id,reference_no,description,debit,credit) VALUES(?,?,?,?,?,?,?,?,?)`,
        ).run(
          p.customer_id,
          p.payment_date,
          "payment",
          "payment",
          id,
          receipt,
          "Customer payment",
          0,
          money(p.amount),
        );
        return id;
      })();
      return NextResponse.json({ id });
    }
    if (action === "payment.update") {
      const p = z
        .object({
          id: z.coerce.number().int().positive(),
          customer_id: z.coerce.number().int().positive(),
          payment_date: z.string(),
          amount: z.coerce.number().positive(),
          reference: z.string().optional(),
          notes: z.string().optional(),
        })
        .parse(body);
      db.transaction(() => {
        const old = db
          .prepare("SELECT * FROM payments WHERE id=?")
          .get(p.id) as Record<string, unknown> | undefined;
        if (!old) throw new Error("Payment not found.");
        const receipt = String(old.receipt_no);
        db.prepare(
          "DELETE FROM ledger_entries WHERE reference_type='payment' AND reference_id=?",
        ).run(p.id);
        db.prepare(
          "UPDATE payments SET customer_id=?,payment_date=?,amount=?,reference=?,notes=?,status='active',cancellation_reason=NULL WHERE id=?",
        ).run(
          p.customer_id,
          p.payment_date,
          money(p.amount),
          p.reference || null,
          p.notes || null,
          p.id,
        );
        db.prepare(
          `INSERT INTO ledger_entries(customer_id,txn_date,type,reference_type,reference_id,reference_no,description,debit,credit) VALUES(?,?,?,?,?,?,?,?,?)`,
        ).run(
          p.customer_id,
          p.payment_date,
          "payment",
          "payment",
          p.id,
          receipt,
          "Customer payment",
          0,
          money(p.amount),
        );
        db.prepare(
          "INSERT INTO audit_logs(user_id,action,entity_type,entity_id,old_values,new_values,reason) VALUES(?,?,?,?,?,?,?)",
        ).run(
          user.id,
          "update",
          "payment",
          p.id,
          JSON.stringify(old),
          JSON.stringify(p),
          "Payment edited",
        );
      })();
      return NextResponse.json({ id: p.id });
    }
    if (action === "payment.delete") {
      const p = z
        .object({ id: z.coerce.number().int().positive() })
        .parse(body);
      db.transaction(() => {
        const old = db.prepare("SELECT * FROM payments WHERE id=?").get(p.id);
        if (!old) throw new Error("Payment not found.");
        db.prepare(
          "DELETE FROM ledger_entries WHERE reference_type='payment' AND reference_id=?",
        ).run(p.id);
        db.prepare("DELETE FROM payments WHERE id=?").run(p.id);
        db.prepare(
          "INSERT INTO audit_logs(user_id,action,entity_type,entity_id,old_values,reason) VALUES(?,?,?,?,?,?)",
        ).run(
          user.id,
          "delete",
          "payment",
          p.id,
          JSON.stringify(old),
          "Payment deleted by user",
        );
      })();
      return NextResponse.json({ ok: true });
    }
    if (action === "return.save") {
      const p = z
        .object({
          sale_id: z.coerce.number().int().positive(),
          return_date: z.string(),
          settlement: z.enum(["balance", "cash"]),
          reason: z.string().min(1),
          notes: z.string().optional(),
          items: z
            .array(
              z.object({
                sale_item_id: z.coerce.number(),
                quantity: z.coerce.number().positive(),
              }),
            )
            .min(1),
        })
        .parse(body);
      const id = db.transaction(() => {
        const sale = db
          .prepare("SELECT * FROM sales WHERE id=? AND status='active'")
          .get(p.sale_id) as Record<string, number | string | null> | undefined;
        if (!sale) throw new Error("Active sale not found.");
        let total = 0;
        const detail = p.items.map((i) => {
          const line = db
            .prepare(
              `SELECT si.*,COALESCE((SELECT SUM(sri.quantity) FROM sales_return_items sri JOIN sales_returns sr ON sr.id=sri.return_id WHERE sri.sale_item_id=si.id AND sr.status='active'),0) returned FROM sale_items si WHERE si.id=? AND si.sale_id=?`,
            )
            .get(i.sale_item_id, p.sale_id) as
            Record<string, number> | undefined;
          if (!line || i.quantity > line.quantity - line.returned)
            throw new Error("Return quantity exceeds remaining sold quantity.");
          const lineTotal = money(i.quantity * (line.total / line.quantity));
          total = money(total + lineTotal);
          return { ...i, line, total: lineTotal };
        });
        const no = nextNumber("sales_returns", "RET-");
        const x = db
          .prepare(
            "INSERT INTO sales_returns(return_no,sale_id,customer_id,return_date,total,settlement,reason,notes,created_by) VALUES(?,?,?,?,?,?,?,?,?)",
          )
          .run(
            no,
            p.sale_id,
            sale.customer_id,
            p.return_date,
            total,
            p.settlement,
            p.reason,
            p.notes,
            user.id,
          );
        const id = Number(x.lastInsertRowid);
        for (const i of detail)
          db.prepare(
            "INSERT INTO sales_return_items(return_id,sale_item_id,product_id,quantity,unit_price,total) VALUES(?,?,?,?,?,?)",
          ).run(
            id,
            i.sale_item_id,
            i.line.product_id,
            i.quantity,
            i.line.unit_price,
            i.total,
          );
        if (sale.customer_id && p.settlement === "balance")
          db.prepare(
            `INSERT INTO ledger_entries(customer_id,txn_date,type,reference_type,reference_id,reference_no,description,debit,credit) VALUES(?,?,?,?,?,?,?,?,?)`,
          ).run(
            sale.customer_id,
            p.return_date,
            "return",
            "return",
            id,
            no,
            "Sales return",
            0,
            total,
          );
        return id;
      })();
      return NextResponse.json({ id });
    }
    if (action === "direct-return.save") {
      const p = z
        .object({
          return_date: z.string(),
          customer_id: z.coerce.number().nullable().optional(),
          reason: z.string().trim().min(1),
          notes: z.string().optional(),
          items: z
            .array(
              z.object({
                product_id: z.coerce.number().nullable().optional(),
                name: z.string().trim().min(1),
                quantity: z.coerce.number().positive(),
                unit_price: z.coerce.number().min(0),
              }),
            )
            .min(1),
        })
        .parse(body);
      const id = db.transaction(() => {
        let total = 0;
        const items = p.items.map((item) => {
          const lineTotal = money(item.quantity * item.unit_price);
          total = money(total + lineTotal);
          return { ...item, total: lineTotal };
        });
        if (total <= 0)
          throw new Error("Return amount must be greater than zero.");
        const no = nextNumber("direct_returns", "DRET-");
        const x = db
          .prepare(
            "INSERT INTO direct_returns(return_no,customer_id,return_date,total,reason,notes,created_by) VALUES(?,?,?,?,?,?,?)",
          )
          .run(
            no,
            p.customer_id || null,
            p.return_date,
            total,
            p.reason,
            p.notes,
            user.id,
          );
        const id = Number(x.lastInsertRowid);
        for (const item of items) {
          let productId = item.product_id || null;
          if (!productId) {
            const product = db
              .prepare(
                "INSERT INTO products(name,normalized_name,price,use_count,last_used_at) VALUES(?,?,?,1,CURRENT_TIMESTAMP)",
              )
              .run(
                item.name.trim().replace(/\s+/g, " "),
                normalizeProductName(item.name),
                item.unit_price,
              );
            productId = Number(product.lastInsertRowid);
          } else
            db.prepare(
              "UPDATE products SET use_count=use_count+1,last_used_at=CURRENT_TIMESTAMP WHERE id=?",
            ).run(productId);
          db.prepare(
            "INSERT INTO direct_return_items(direct_return_id,product_id,product_name,quantity,unit_price,total) VALUES(?,?,?,?,?,?)",
          ).run(
            id,
            productId,
            item.name,
            item.quantity,
            item.unit_price,
            item.total,
          );
        }
        db.prepare(
          "INSERT INTO audit_logs(user_id,action,entity_type,entity_id,new_values,reason) VALUES(?,?,?,?,?,?)",
        ).run(
          user.id,
          "create",
          "direct_return",
          id,
          JSON.stringify({ ...p, total }),
          "Direct cash refund",
        );
        return id;
      })();
      return NextResponse.json({ id });
    }
    if (action === "direct-return.update") {
      const p = z
        .object({
          id: z.coerce.number().int().positive(),
          return_date: z.string(),
          customer_id: z.coerce.number().nullable().optional(),
          reason: z.string().trim().min(1),
          notes: z.string().optional(),
          items: z
            .array(
              z.object({
                product_id: z.coerce.number().nullable().optional(),
                name: z.string().trim().min(1),
                quantity: z.coerce.number().positive(),
                unit_price: z.coerce.number().min(0),
              }),
            )
            .min(1),
        })
        .parse(body);
      db.transaction(() => {
        const old = db
          .prepare("SELECT * FROM direct_returns WHERE id=?")
          .get(p.id);
        if (!old) throw new Error("Direct return not found.");
        let total = 0;
        const items = p.items.map((item) => {
          const lineTotal = money(item.quantity * item.unit_price);
          total = money(total + lineTotal);
          return { ...item, total: lineTotal };
        });
        if (total <= 0)
          throw new Error("Return amount must be greater than zero.");
        db.prepare(
          "DELETE FROM direct_return_items WHERE direct_return_id=?",
        ).run(p.id);
        db.prepare(
          "UPDATE direct_returns SET customer_id=?,return_date=?,total=?,reason=?,notes=? WHERE id=?",
        ).run(
          p.customer_id || null,
          p.return_date,
          total,
          p.reason,
          p.notes,
          p.id,
        );
        for (const item of items) {
          let productId = item.product_id || null;
          if (!productId) {
            const product = db
              .prepare(
                "INSERT INTO products(name,normalized_name,price,use_count,last_used_at) VALUES(?,?,?,1,CURRENT_TIMESTAMP)",
              )
              .run(
                item.name.trim().replace(/\s+/g, " "),
                normalizeProductName(item.name),
                item.unit_price,
              );
            productId = Number(product.lastInsertRowid);
          }
          db.prepare(
            "INSERT INTO direct_return_items(direct_return_id,product_id,product_name,quantity,unit_price,total) VALUES(?,?,?,?,?,?)",
          ).run(
            p.id,
            productId,
            item.name,
            item.quantity,
            item.unit_price,
            item.total,
          );
        }
        db.prepare(
          "INSERT INTO audit_logs(user_id,action,entity_type,entity_id,old_values,new_values,reason) VALUES(?,?,?,?,?,?,?)",
        ).run(
          user.id,
          "update",
          "direct_return",
          p.id,
          JSON.stringify(old),
          JSON.stringify({ ...p, total }),
          "Direct return edited",
        );
      })();
      return NextResponse.json({ id: p.id });
    }
    if (action === "return.delete") {
      const p = z
        .object({
          id: z.coerce.number().int().positive(),
          return_type: z.enum(["direct", "sale"]),
        })
        .parse(body);
      db.transaction(() => {
        if (p.return_type === "direct") {
          const old = db
            .prepare("SELECT * FROM direct_returns WHERE id=?")
            .get(p.id);
          if (!old) throw new Error("Direct return not found.");
          db.prepare(
            "DELETE FROM direct_return_items WHERE direct_return_id=?",
          ).run(p.id);
          db.prepare("DELETE FROM direct_returns WHERE id=?").run(p.id);
          db.prepare(
            "INSERT INTO audit_logs(user_id,action,entity_type,entity_id,old_values,reason) VALUES(?,?,?,?,?,?)",
          ).run(
            user.id,
            "delete",
            "direct_return",
            p.id,
            JSON.stringify(old),
            "Deleted by user",
          );
        } else {
          const old = db
            .prepare("SELECT * FROM sales_returns WHERE id=?")
            .get(p.id);
          if (!old) throw new Error("Sales return not found.");
          db.prepare(
            "DELETE FROM ledger_entries WHERE reference_type='return' AND reference_id=?",
          ).run(p.id);
          db.prepare("DELETE FROM sales_return_items WHERE return_id=?").run(
            p.id,
          );
          db.prepare("DELETE FROM sales_returns WHERE id=?").run(p.id);
          db.prepare(
            "INSERT INTO audit_logs(user_id,action,entity_type,entity_id,old_values,reason) VALUES(?,?,?,?,?,?)",
          ).run(
            user.id,
            "delete",
            "sales_return",
            p.id,
            JSON.stringify(old),
            "Deleted by user",
          );
        }
      })();
      return NextResponse.json({ ok: true });
    }
    if (action === "sale.delete") {
      const p = z
        .object({ id: z.coerce.number().int().positive() })
        .parse(body);
      db.transaction(() => {
        const sale = db.prepare("SELECT * FROM sales WHERE id=?").get(p.id) as
          Record<string, unknown> | undefined;
        if (!sale) throw new Error("Sale not found.");
        const returnIds = rows<{ id: number }>(
          "SELECT id FROM sales_returns WHERE sale_id=?",
          p.id,
        ).map((x) => x.id);
        for (const returnId of returnIds) {
          db.prepare(
            "DELETE FROM ledger_entries WHERE reference_type='return' AND reference_id=?",
          ).run(returnId);
          db.prepare("DELETE FROM sales_return_items WHERE return_id=?").run(
            returnId,
          );
        }
        db.prepare("DELETE FROM sales_returns WHERE sale_id=?").run(p.id);
        db.prepare(
          "DELETE FROM ledger_entries WHERE reference_type='sale' AND reference_id=?",
        ).run(p.id);
        db.prepare("DELETE FROM sale_items WHERE sale_id=?").run(p.id);
        db.prepare("DELETE FROM sales WHERE id=?").run(p.id);
        db.prepare(
          "INSERT INTO audit_logs(user_id,action,entity_type,entity_id,old_values,reason) VALUES(?,?,?,?,?,?)",
        ).run(
          user.id,
          "delete",
          "sale",
          p.id,
          JSON.stringify(sale),
          "Deleted by user",
        );
      })();
      return NextResponse.json({ ok: true });
    }
    if (action.endsWith(".cancel")) {
      const p = z
        .object({
          id: z.coerce.number().int().positive(),
          reason: z.string().trim().min(2),
        })
        .parse(body);
      const kind = action.split(".")[0];
      db.transaction(() => {
        if (kind === "sale") {
          const s = db
            .prepare("SELECT id FROM sales WHERE id=? AND status='active'")
            .get(p.id);
          if (!s) throw new Error("Active sale not found.");
          const returned = (
            db
              .prepare(
                "SELECT COUNT(*) n FROM sales_returns WHERE sale_id=? AND status='active'",
              )
              .get(p.id) as { n: number }
          ).n;
          if (returned)
            throw new Error(
              "Cancel active returns before cancelling this sale.",
            );
          db.prepare(
            "UPDATE sales SET status='cancelled',cancellation_reason=? WHERE id=?",
          ).run(p.reason, p.id);
          db.prepare(
            "DELETE FROM ledger_entries WHERE reference_type='sale' AND reference_id=?",
          ).run(p.id);
        } else if (kind === "payment") {
          if (
            !db
              .prepare("SELECT id FROM payments WHERE id=? AND status='active'")
              .get(p.id)
          )
            throw new Error("Active payment not found.");
          db.prepare(
            "UPDATE payments SET status='cancelled',cancellation_reason=? WHERE id=?",
          ).run(p.reason, p.id);
          db.prepare(
            "DELETE FROM ledger_entries WHERE reference_type='payment' AND reference_id=?",
          ).run(p.id);
        } else if (kind === "directreturn") {
          if (
            !db
              .prepare(
                "SELECT id FROM direct_returns WHERE id=? AND status='active'",
              )
              .get(p.id)
          )
            throw new Error("Active direct return not found.");
          db.prepare(
            "UPDATE direct_returns SET status='cancelled',cancellation_reason=? WHERE id=?",
          ).run(p.reason, p.id);
        } else {
          if (
            !db
              .prepare(
                "SELECT id FROM sales_returns WHERE id=? AND status='active'",
              )
              .get(p.id)
          )
            throw new Error("Active return not found.");
          db.prepare(
            "UPDATE sales_returns SET status='cancelled',cancellation_reason=? WHERE id=?",
          ).run(p.reason, p.id);
          db.prepare(
            "DELETE FROM ledger_entries WHERE reference_type='return' AND reference_id=?",
          ).run(p.id);
        }
        db.prepare(
          "INSERT INTO audit_logs(user_id,action,entity_type,entity_id,reason) VALUES(?,?,?,?,?)",
        ).run(user.id, "cancel", kind, p.id, p.reason);
      })();
      return NextResponse.json({ ok: true });
    }
    if (action === "settings.save") {
      db.prepare(
        `UPDATE settings SET business_name=?,address=?,phone=?,email=?,invoice_footer=?,currency=?,invoice_format=?,thermal_width=?,language=?,numeral_system=?,invoice_language=? WHERE id=1`,
      ).run(
        body.business_name,
        body.address,
        body.phone,
        body.email,
        body.invoice_footer,
        body.currency || "৳",
        body.invoice_format || "thermal",
        body.thermal_width || "80mm",
        body.language === "bn" ? "bn" : "en",
        body.numeral_system === "bn" ? "bn" : "en",
        ["en", "bn", "both"].includes(body.invoice_language) ? body.invoice_language : "en",
      );
      return NextResponse.json({ ok: true });
    }
    if (action === "settings.language") {
      const language = body.language === "bn" ? "bn" : "en";
      db.prepare("UPDATE settings SET language=? WHERE id=1").run(language);
      return NextResponse.json({ language });
    }
    return fail("Unknown action", 404);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Operation failed");
  }
}
