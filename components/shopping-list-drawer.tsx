"use client";

import { generateCurrentWeekShoppingList, toggleShoppingListItem } from "@/lib/actions/shopping-list";
import { Loader2, ShoppingBasket, X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

type ShoppingItem = {
  id: string;
  displayName: string;
  amount: number | null;
  unit: string | null;
  isChecked: boolean;
  unresolved: boolean;
};

type ShoppingListPayload = {
  id: string;
  items: ShoppingItem[];
} | null;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  initialList: ShoppingListPayload;
};

function formatAmount(value: number | null, unit: string | null) {
  if (value == null) {
    return "";
  }
  return `${value % 1 === 0 ? value.toFixed(0) : value} ${unit ?? ""}`.trim();
}

export function ShoppingListDrawer({ isOpen, onClose, isAuthenticated, initialList }: Props) {
  const [loading, setLoading] = useState(false);
  const [pendingItem, setPendingItem] = useState<string | null>(null);
  const router = useRouter();

  async function handleGenerate() {
    setLoading(true);
    try {
      const result = await generateCurrentWeekShoppingList();
      if (!result.error) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(item: ShoppingItem) {
    setPendingItem(item.id);
    try {
      const result = await toggleShoppingListItem(item.id, !item.isChecked);
      if (!result.error) {
        router.refresh();
      }
    } finally {
      setPendingItem(null);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[70] transition-all duration-300 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      <aside
        className={`absolute bottom-0 left-0 right-0 h-[80dvh] rounded-t-2xl border border-white/20 bg-black/75 p-4 text-white backdrop-blur-xl transition-transform duration-300 sm:bottom-0 sm:left-auto sm:right-0 sm:top-0 sm:h-full sm:w-[32vw] sm:max-w-md sm:rounded-none sm:rounded-l-2xl ${
          isOpen ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-x-full"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Inköpslista</h3>
            <p className="text-xs text-white/70">För veckans middagsplan</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-white/20 p-1.5">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!isAuthenticated ? (
          <p className="rounded-xl border border-white/20 bg-white/10 p-3 text-sm">Logga in för att skapa och spara inköpslista.</p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={loading}
              className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-black disabled:opacity-70"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBasket className="h-4 w-4" />}
              {initialList ? "Regenerera lista" : "Generera inköpslista"}
            </button>

            <ul className="space-y-2 overflow-y-auto pr-1">
              {!initialList || initialList.items.length === 0 ? (
                <li className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/70">Ingen lista ännu.</li>
              ) : (
                initialList.items.map((item) => (
                  <li key={item.id} className="rounded-lg border border-white/15 bg-white/10 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => void handleToggle(item)}
                      disabled={pendingItem === item.id}
                      className="flex w-full items-center justify-between gap-2 text-left"
                    >
                      <span className={`text-sm ${item.isChecked ? "line-through text-white/45" : "text-white"}`}>{item.displayName}</span>
                      <span className="text-xs text-white/70">{formatAmount(item.amount, item.unit)}</span>
                    </button>
                    {item.unresolved && <p className="mt-1 text-[11px] text-amber-300">Kontrollera mängd/enhet</p>}
                  </li>
                ))
              )}
            </ul>
          </>
        )}
      </aside>
    </div>
  );
}
