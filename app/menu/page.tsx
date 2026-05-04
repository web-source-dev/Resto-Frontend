"use client";

import { PageHeader, Card, StatusBadge } from "@/components/ui";
import {
  Plus,
  Search,
  Upload,
  Tag,
  Utensils,
  Trash2,
  ChevronDown,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import clsx from "clsx";
import { useApi } from "@/lib/useApi";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Modal, Field, Input, Select } from "@/components/Modal";
import { useToast } from "@/components/Toaster";
import { useAuth } from "@/lib/AuthProvider";
import { canPerform } from "@/lib/roles";
import { downloadText, parseCSV, toCSV } from "@/lib/export";
import { RecipeEditor, RecipeLine } from "@/components/RecipeEditor";

function tagColor(tag: string) {
  const map: Record<string, string> = {
    Bestseller: "bg-amber-100 text-amber-800",
    Spicy: "bg-rose-100 text-rose-700",
    Veg: "bg-emerald-100 text-emerald-700",
    Healthy: "bg-sky-100 text-sky-700",
    New: "bg-violet-100 text-violet-700",
  };
  return map[tag] ?? "bg-ink-100 text-ink-700";
}

export default function MenuPage() {
  const { data: catsData, refresh: refreshCats } = useApi<{ categories: any[] }>(
    "/api/menu/categories"
  );
  const { data: itemsData, refresh: refreshItems } = useApi<{ items: any[] }>(
    "/api/menu/items"
  );
  const { data: ingData } = useApi<{ items: any[] }>("/api/inventory");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const toast = useToast();
  const { user } = useAuth();
  const canWrite = canPerform(user?.role, "menu.write");
  const canDelete = canPerform(user?.role, "menu.delete");
  const fileRef = useRef<HTMLInputElement>(null);

  const cats = catsData?.categories ?? [];
  const items = itemsData?.items ?? [];
  const ingredients = ingData?.items ?? [];
  const ingMap = useMemo(
    () => new Map(ingredients.map((i: any) => [i.id, i])),
    [ingredients]
  );

  const filtered = useMemo(() => {
    return items.filter(
      (it: any) =>
        (activeCat === "all" || it.categoryId === activeCat) &&
        it.name.toLowerCase().includes(q.toLowerCase())
    );
  }, [items, activeCat, q]);

  const activeCategoryName =
    activeCat === "all" ? "All items" : cats.find((c) => c.id === activeCat)?.name;

  async function toggle(it: any) {
    try {
      await api.post(`/api/menu/items/${it.id}/toggle`);
      toast(`${it.name} ${it.active ? "deactivated" : "activated"}`, "success");
      refreshItems();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function del(it: any) {
    if (!confirm(`Delete "${it.name}"? This cannot be undone.`)) return;
    try {
      await api.del(`/api/menu/items/${it.id}`);
      toast(`${it.name} deleted`, "success");
      refreshItems();
      refreshCats();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  function exportCSV() {
    const csv = toCSV(items, [
      { key: "name", header: "Name" },
      {
        key: "categoryId",
        header: "Category",
        map: (v: string) => cats.find((c: any) => c.id === v)?.name ?? "",
      },
      { key: "price", header: "Price" },
      { key: "plateCost", header: "Plate cost" },
      { key: "margin", header: "Margin %" },
      { key: "station", header: "Station" },
      { key: "active", header: "Active" },
      { key: "stockStatus", header: "Stock" },
      { key: "sold7d", header: "Sold 7d" },
      { key: "tags", header: "Tags", map: (v: string[]) => v?.join("|") ?? "" },
      {
        key: "recipe",
        header: "Recipe",
        map: (v: any[]) =>
          (v ?? [])
            .map((r) => {
              const ing: any = ingMap.get(r.ingredientId);
              return `${ing?.name ?? r.ingredientId}:${r.qty}${ing?.unit ?? ""}`;
            })
            .join("|"),
      },
    ]);
    downloadText(`menu-${Date.now()}.csv`, csv);
    toast(`Exported ${items.length} items`, "success");
  }

  async function handleCSVImport(file: File) {
    try {
      const rows = await parseCSV(file);
      if (rows.length === 0) {
        toast("CSV is empty", "error");
        return;
      }
      const catByName = new Map(cats.map((c: any) => [c.name.toLowerCase(), c.id]));
      const payload = rows
        .map((r: any) => ({
          name: r.Name ?? r.name,
          price: Number(r.Price ?? r.price ?? 0),
          plateCost: Number(r["Plate cost"] ?? r.plateCost ?? 0),
          station: r.Station ?? r.station ?? "Grill",
          categoryId:
            catByName.get(String(r.Category ?? r.category ?? "").toLowerCase()) ??
            cats[0]?.id,
          active: String(r.Active ?? "true").toLowerCase() !== "false",
          tags: String(r.Tags ?? "")
            .split("|")
            .map((s) => s.trim())
            .filter(Boolean),
        }))
        .filter((r) => r.name && r.categoryId);
      if (payload.length === 0) {
        toast("Need Name + Category in CSV", "error");
        return;
      }
      const res = await api.post<{ created: number }>("/api/menu/items/bulk", {
        items: payload,
      });
      toast(`Imported ${res.created} items`, "success");
      refreshItems();
      refreshCats();
    } catch (e: any) {
      toast(e.message ?? "Import failed", "error");
    }
  }

  return (
    <>
      <PageHeader
        title="Menu & Recipes"
        subtitle="Categories → items → variants · recipe BOM drives inventory & wastage"
        right={
          <>
            <button className="btn-outline" onClick={exportCSV}>
              <Upload className="w-4 h-4 rotate-180" /> Export CSV
            </button>
            {canWrite && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleCSVImport(f);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                />
                <button
                  className="btn-outline"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="w-4 h-4" /> CSV import
                </button>
                <button className="btn-primary" onClick={() => setCreating(true)}>
                  <Plus className="w-4 h-4" /> New item
                </button>
              </>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <Card title="Categories" subtitle="Tap to filter">
          <div className="space-y-1">
            <button
              onClick={() => setActiveCat("all")}
              className={clsx(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium",
                activeCat === "all"
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-700 hover:bg-ink-100"
              )}
            >
              <span className="flex items-center gap-2">
                <Utensils className="w-3.5 h-3.5" /> All items
              </span>
              <span
                className={clsx(
                  "text-xs",
                  activeCat === "all" ? "text-brand-600" : "text-ink-500"
                )}
              >
                {items.length}
              </span>
            </button>
            {cats.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className={clsx(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium",
                  activeCat === c.id
                    ? "bg-brand-50 text-brand-700"
                    : "text-ink-700 hover:bg-ink-100"
                )}
              >
                <span className="flex items-center gap-2">
                  <Utensils className="w-3.5 h-3.5" /> {c.name}
                </span>
                <span
                  className={clsx(
                    "text-xs",
                    activeCat === c.id ? "text-brand-600" : "text-ink-500"
                  )}
                >
                  {c.count ?? 0}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-5 pt-5 border-t border-ink-100 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">Total items</span>
              <span className="font-semibold">{items.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">With recipe</span>
              <span className="font-semibold">
                {items.filter((i: any) => (i.recipe ?? []).length > 0).length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">Active</span>
              <span className="font-semibold">
                {items.filter((i: any) => i.active).length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">Categories</span>
              <span className="font-semibold">{cats.length}</span>
            </div>
          </div>
        </Card>

        <div className="xl:col-span-3">
          <Card
            title={activeCategoryName ?? "Menu"}
            subtitle={`${filtered.length} items · tap a row to view recipe`}
            right={
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <div className="relative w-full sm:w-auto">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    placeholder="Search items"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="h-9 w-full rounded-lg border border-ink-200/60 bg-ink-50 pl-9 pr-3 text-sm focus:bg-white focus:outline-none sm:w-56"
                  />
                </div>
              </div>
            }
            pad={false}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th w-8"></th>
                    <th className="table-th">Item</th>
                    <th className="table-th">Price</th>
                    <th className="table-th">Plate cost</th>
                    <th className="table-th">Margin</th>
                    <th className="table-th">Recipe</th>
                    <th className="table-th">Stock</th>
                    <th className="table-th">Sold (7d)</th>
                    <th className="table-th">Status</th>
                    <th className="table-th"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((it: any) => {
                    const isOpen = expanded === it.id;
                    const recipeCount = (it.recipe ?? []).length;
                    const computed = (it.recipe ?? []).reduce(
                      (s: number, r: any) => {
                        const ing: any = ingMap.get(r.ingredientId);
                        return s + (ing?.costPerUnit ?? 0) * (r.qty ?? 0);
                      },
                      0
                    );
                    return (
                      <Row
                        key={it.id}
                        it={it}
                        isOpen={isOpen}
                        onToggle={() =>
                          setExpanded(isOpen ? null : it.id)
                        }
                        ingMap={ingMap}
                        recipeCount={recipeCount}
                        computed={computed}
                        canWrite={canWrite}
                        canDelete={canDelete}
                        onActivate={() => toggle(it)}
                        onEdit={() => setEditing(it)}
                        onDelete={() => del(it)}
                      />
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        className="table-td text-center text-ink-500 py-10"
                      >
                        No items match.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <ItemModal
        open={creating || !!editing}
        item={editing}
        cats={cats}
        ingredients={ingredients}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
        onSaved={() => {
          refreshItems();
          refreshCats();
        }}
      />
    </>
  );
}

function Row({
  it,
  isOpen,
  onToggle,
  ingMap,
  recipeCount,
  computed,
  canWrite,
  canDelete,
  onActivate,
  onEdit,
  onDelete,
}: {
  it: any;
  isOpen: boolean;
  onToggle: () => void;
  ingMap: Map<string, any>;
  recipeCount: number;
  computed: number;
  canWrite: boolean;
  canDelete: boolean;
  onActivate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const variance =
    recipeCount > 0 && it.plateCost > 0
      ? Math.round(((computed - it.plateCost) / it.plateCost) * 100)
      : 0;
  return (
    <>
      <tr className="hover:bg-ink-50/60 cursor-pointer" onClick={onToggle}>
        <td className="table-td text-ink-400">
          {isOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </td>
        <td className="table-td">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-100 to-brand-200 text-brand-800 flex items-center justify-center text-sm font-bold">
              {it.name[0]}
            </div>
            <div>
              <p className="font-medium text-ink-900">{it.name}</p>
              {it.tags?.length > 0 && (
                <div className="flex gap-1 mt-0.5">
                  {it.tags.map((t: string) => (
                    <span
                      key={t}
                      className={clsx(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                        tagColor(t)
                      )}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="table-td font-medium">Rs {it.price?.toLocaleString?.() ?? it.price}</td>
        <td className="table-td text-ink-600">
          Rs {it.plateCost?.toLocaleString?.() ?? it.plateCost}
        </td>
        <td className="table-td">
          <span
            className={clsx(
              "font-semibold",
              it.margin >= 60
                ? "text-emerald-600"
                : it.margin >= 50
                ? "text-sky-700"
                : "text-amber-700"
            )}
          >
            {it.margin}%
          </span>
        </td>
        <td className="table-td">
          {recipeCount === 0 ? (
            <span className="chip bg-ink-100 text-ink-500">No recipe</span>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="chip bg-emerald-50 text-emerald-700">
                <BookOpen className="w-3 h-3" /> {recipeCount} items
              </span>
              {Math.abs(variance) >= 10 && (
                <span
                  className={clsx(
                    "chip",
                    variance > 0
                      ? "bg-rose-50 text-rose-700"
                      : "bg-amber-50 text-amber-700"
                  )}
                  title="Computed BOM cost differs from plate cost"
                >
                  {variance > 0 ? "+" : ""}
                  {variance}%
                </span>
              )}
            </div>
          )}
        </td>
        <td className="table-td">
          <StatusBadge status={it.stockStatus ?? "OK"} />
        </td>
        <td className="table-td tabular-nums">{it.sold7d ?? 0}</td>
        <td className="table-td">
          <StatusBadge status={it.active ? "Active" : "Inactive"} />
        </td>
        <td
          className="table-td text-right"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-2 justify-end">
            {canWrite && (
              <button
                onClick={onActivate}
                className="text-xs font-medium text-ink-500 hover:text-ink-800"
              >
                {it.active ? "Disable" : "Enable"}
              </button>
            )}
            {canWrite && (
              <button
                onClick={onEdit}
                className="text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                Edit
              </button>
            )}
            {canDelete && (
              <button
                onClick={onDelete}
                className="text-xs font-medium text-rose-500 hover:text-rose-700"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </td>
      </tr>
      {isOpen && (
        <tr>
          <td colSpan={10} className="px-5 pb-4 pt-0">
            <RecipeInline it={it} ingMap={ingMap} computed={computed} />
          </td>
        </tr>
      )}
    </>
  );
}

function RecipeInline({
  it,
  ingMap,
  computed,
}: {
  it: any;
  ingMap: Map<string, any>;
  computed: number;
}) {
  const recipe = it.recipe ?? [];
  if (recipe.length === 0) {
    return (
      <div className="bg-ink-50/60 border border-ink-100 rounded-lg p-4 text-center text-sm text-ink-500">
        No recipe yet. Click <strong>Edit</strong> to define the ingredient BOM — the
        system will auto-deduct inventory on each sale.
      </div>
    );
  }
  return (
    <div className="bg-ink-50/60 border border-ink-100 rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-white/60 flex items-center justify-between text-xs border-b border-ink-100">
        <div className="flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-ink-500" />
          <span className="font-semibold text-ink-700">Recipe · BOM</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-ink-600">
          <span>
            Computed cost:{" "}
            <span className="font-bold text-ink-900">
              Rs {Math.round(computed).toLocaleString()}
            </span>
          </span>
          <span>
            Set plate cost:{" "}
            <span className="font-bold text-ink-900">
              Rs {it.plateCost?.toLocaleString() ?? 0}
            </span>
          </span>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider text-ink-500 font-semibold">
              Ingredient
            </th>
            <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider text-ink-500 font-semibold">
              Qty
            </th>
            <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider text-ink-500 font-semibold w-12">
              Unit
            </th>
            <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider text-ink-500 font-semibold">
              Rs/unit
            </th>
            <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider text-ink-500 font-semibold">
              Line cost
            </th>
          </tr>
        </thead>
        <tbody>
          {recipe.map((r: any, i: number) => {
            const ing: any = ingMap.get(r.ingredientId);
            return (
              <tr key={i} className="border-t border-ink-100">
                <td className="px-4 py-1.5 text-ink-800">
                  {ing?.name ?? "Unknown"}
                  {ing && (
                    <span className="text-[11px] text-ink-500 ml-2">
                      · {ing.category}
                    </span>
                  )}
                </td>
                <td className="px-4 py-1.5 text-right tabular-nums font-medium">
                  {r.qty}
                </td>
                <td className="px-4 py-1.5 text-ink-500 text-xs">
                  {ing?.unit ?? "—"}
                </td>
                <td className="px-4 py-1.5 text-right tabular-nums text-ink-600">
                  {ing ? `Rs ${ing.costPerUnit}` : "—"}
                </td>
                <td className="px-4 py-1.5 text-right tabular-nums font-semibold">
                  Rs{" "}
                  {Math.round(
                    (ing?.costPerUnit ?? 0) * (r.qty ?? 0)
                  ).toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ItemModal({
  open,
  item,
  cats,
  ingredients,
  onClose,
  onSaved,
}: {
  open: boolean;
  item: any | null;
  cats: any[];
  ingredients: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [localCats, setLocalCats] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});
  const [recipe, setRecipe] = useState<RecipeLine[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLocalCats(cats);
    setForm(
      item
        ? { ...item }
        : {
            name: "",
            price: 0,
            plateCost: 0,
            station: "Grill",
            categoryId: cats[0]?.id ?? "",
            active: true,
            tags: [],
          }
    );
    setRecipe(
      item?.recipe?.map((r: any) => ({
        ingredientId:
          typeof r.ingredientId === "object"
            ? r.ingredientId.toString()
            : r.ingredientId,
        qty: r.qty,
      })) ?? []
    );
    setNewCategoryName("");
  }, [item, cats, open]);

  async function createCategory() {
    const name = newCategoryName.trim();
    if (!name) {
      toast("Enter a category name", "error");
      return;
    }
    setCreatingCategory(true);
    try {
      const res = await api.post<{ category: any }>("/api/menu/categories", {
        name,
      });
      const created = res.category;
      setLocalCats((prev) =>
        [...prev, created].sort((a, b) => String(a.name).localeCompare(String(b.name)))
      );
      setForm((prev: any) => ({ ...prev, categoryId: created.id }));
      setNewCategoryName("");
      toast(`Category "${created.name}" created`, "success");
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setCreatingCategory(false);
    }
  }

  async function save() {
    if (!form.name) {
      toast("Name is required", "error");
      return;
    }
    if (!form.categoryId) {
      toast("Select or create a category", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, recipe };
      if (item) {
        await api.patch(`/api/menu/items/${item.id}`, payload);
        toast("Saved", "success");
      } else {
        await api.post("/api/menu/items", payload);
        toast("Item created", "success");
      }
      onSaved();
      onClose();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? `Edit — ${item.name}` : "New menu item"}
      subtitle="Price, recipe (BOM) and plate cost"
      width="max-w-3xl"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <Field label="Name">
            <Input
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price (Rs)">
              <Input
                type="number"
                value={form.price ?? 0}
                onChange={(e) =>
                  setForm({ ...form, price: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Plate cost (Rs)">
              <Input
                type="number"
                value={form.plateCost ?? 0}
                onChange={(e) =>
                  setForm({ ...form, plateCost: Number(e.target.value) })
                }
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select
                value={form.categoryId ?? ""}
                onChange={(e) =>
                  setForm({ ...form, categoryId: e.target.value })
                }
              >
                <option value="">Select category</option>
                {localCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Station">
              <Select
                value={form.station ?? "Grill"}
                onChange={(e) =>
                  setForm({ ...form, station: e.target.value })
                }
              >
                {["Grill", "Fryer", "Cold", "Drinks", "Oven"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Add category">
            <div className="flex gap-2">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Burgers"
              />
              <button
                type="button"
                onClick={createCategory}
                disabled={creatingCategory}
                className="btn-outline shrink-0"
              >
                {creatingCategory ? "Adding..." : "Add"}
              </button>
            </div>
          </Field>
          <Field label="Tags (comma-separated)">
            <Input
              value={(form.tags ?? []).join(", ")}
              onChange={(e) =>
                setForm({
                  ...form,
                  tags: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="Bestseller, Spicy, Veg"
            />
          </Field>
        </div>

        <div>
          <RecipeEditor
            ingredients={ingredients}
            recipe={recipe}
            onChange={setRecipe}
            onApplyPlateCost={(cost) => setForm({ ...form, plateCost: cost })}
            price={form.price}
          />
          <p className="text-[11px] text-ink-500 mt-3 leading-snug">
            Every quantity here is deducted from inventory on each sale, and
            dropped into the wastage ledger when marked as waste. Keep it
            accurate — it&apos;s the single source of truth for food-cost
            analytics.
          </p>
        </div>
      </div>
    </Modal>
  );
}
