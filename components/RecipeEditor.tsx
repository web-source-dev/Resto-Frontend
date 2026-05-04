"use client";

import { Plus, Trash2, Calculator, BookOpen } from "lucide-react";
import { useMemo, useState } from "react";
import { Select } from "./Modal";

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  category?: string;
};

export type RecipeLine = {
  ingredientId: string;
  qty: number;
};

export function RecipeEditor({
  ingredients,
  recipe,
  onChange,
  onApplyPlateCost,
  price,
}: {
  ingredients: Ingredient[];
  recipe: RecipeLine[];
  onChange: (recipe: RecipeLine[]) => void;
  onApplyPlateCost?: (cost: number) => void;
  price?: number;
}) {
  const [adding, setAdding] = useState<string>("");

  const ingMap = useMemo(
    () => new Map(ingredients.map((i) => [i.id, i])),
    [ingredients]
  );

  const computed = useMemo(() => {
    return recipe.reduce((s, r) => {
      const ing = ingMap.get(r.ingredientId);
      return s + (ing?.costPerUnit ?? 0) * (r.qty ?? 0);
    }, 0);
  }, [recipe, ingMap]);

  const marginPct = price
    ? Math.round(((price - computed) / price) * 100)
    : 0;

  function add() {
    if (!adding) return;
    if (recipe.some((r) => r.ingredientId === adding)) {
      setAdding("");
      return;
    }
    onChange([...recipe, { ingredientId: adding, qty: 0 }]);
    setAdding("");
  }

  function update(idx: number, qty: number) {
    onChange(recipe.map((r, i) => (i === idx ? { ...r, qty } : r)));
  }

  function remove(idx: number) {
    onChange(recipe.filter((_, i) => i !== idx));
  }

  const available = ingredients.filter(
    (i) => !recipe.some((r) => r.ingredientId === i.id)
  );

  // Group by category for nicer dropdown UX
  const grouped = new Map<string, Ingredient[]>();
  for (const i of available) {
    const k = i.category ?? "Other";
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(i);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-ink-500" />
          <span className="text-xs font-semibold text-ink-700">
            Recipe · Bill of Materials
          </span>
        </div>
        <span className="text-[11px] text-ink-400">
          Drives auto-deduction on every sale
        </span>
      </div>

      <div className="border border-ink-200 rounded-lg overflow-hidden">
        {recipe.length === 0 ? (
          <div className="py-6 text-center text-sm text-ink-400">
            No ingredients yet. Add below to link BOM.
          </div>
        ) : (
          <div className="divide-y divide-ink-100">
            <div className="grid grid-cols-[1fr_72px_40px_82px_28px] gap-2 bg-ink-50 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-500 sm:grid-cols-[1fr_80px_44px_92px_32px] sm:px-3">
              <span>Ingredient</span>
              <span className="text-right">Qty</span>
              <span>Unit</span>
              <span className="text-right">Line cost</span>
              <span />
            </div>
            {recipe.map((r, i) => {
              const ing = ingMap.get(r.ingredientId);
              const lineCost = (ing?.costPerUnit ?? 0) * (r.qty ?? 0);
              return (
                <div
                  key={r.ingredientId}
                  className="grid grid-cols-[1fr_72px_40px_82px_28px] items-center gap-2 px-2 py-2 sm:grid-cols-[1fr_80px_44px_92px_32px] sm:px-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {ing?.name ?? "Unknown"}
                    </p>
                    <p className="text-[10px] text-ink-500">
                      Rs {ing?.costPerUnit ?? 0}/{ing?.unit ?? ""}
                    </p>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={r.qty}
                    onChange={(e) => update(i, Number(e.target.value))}
                    className="h-8 px-2 rounded border border-ink-200 text-sm text-right w-full focus:border-brand-400 focus:outline-none"
                  />
                  <span className="text-xs text-ink-500">
                    {ing?.unit ?? "—"}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-right">
                    Rs {Math.round(lineCost).toLocaleString()}
                  </span>
                  <button
                    onClick={() => remove(i)}
                    className="text-rose-500 hover:text-rose-700 p-1 justify-self-end"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-2">
        <Select
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          className="flex-1"
        >
          <option value="">Add ingredient…</option>
          {[...grouped.entries()].map(([cat, ings]) => (
            <optgroup key={cat} label={cat}>
              {ings.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} · Rs {i.costPerUnit}/{i.unit}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
        <button
          type="button"
          onClick={add}
          disabled={!adding}
          className="btn-outline disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {recipe.length > 0 && (
        <div className="mt-3 p-3 rounded-lg bg-ink-50/60 border border-ink-100">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-brand-600" />
              <span className="font-semibold text-ink-700">
                Computed plate cost
              </span>
            </div>
            <span className="text-lg font-bold tabular-nums">
              Rs {Math.round(computed).toLocaleString()}
            </span>
          </div>
          {price ? (
            <div className="flex items-center justify-between text-xs text-ink-500 mt-1">
              <span>
                Margin at Rs {price.toLocaleString()}:{" "}
                <span
                  className={
                    marginPct >= 60
                      ? "text-emerald-600 font-semibold"
                      : marginPct >= 40
                      ? "text-sky-700 font-semibold"
                      : "text-rose-600 font-semibold"
                  }
                >
                  {marginPct}%
                </span>
              </span>
              {onApplyPlateCost && (
                <button
                  type="button"
                  onClick={() => onApplyPlateCost(Math.round(computed))}
                  className="text-brand-600 hover:text-brand-700 font-medium text-xs"
                >
                  Apply to plate cost
                </button>
              )}
            </div>
          ) : (
            onApplyPlateCost && (
              <div className="flex justify-end text-xs mt-1">
                <button
                  type="button"
                  onClick={() => onApplyPlateCost(Math.round(computed))}
                  className="text-brand-600 hover:text-brand-700 font-medium"
                >
                  Apply to plate cost
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
