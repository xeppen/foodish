"use client";

import { deleteMeal, updateMeal, voteMeal } from "@/lib/actions/meals";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Meal = {
  id: string;
  name: string;
  complexity: "SIMPLE" | "MEDIUM" | "COMPLEX";
  thumbsUpCount: number;
  thumbsDownCount: number;
  imageUrl: string | null;
  createdAt: Date | string;
};

const DOT_COLOR: Record<Meal["complexity"], string> = {
  SIMPLE: "bg-emerald-500",
  MEDIUM: "bg-amber-500",
  COMPLEX: "bg-red-500",
};

export function MealList({ meals }: { meals: Meal[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editComplexity, setEditComplexity] = useState<Meal["complexity"]>("MEDIUM");
  const [editImageMode, setEditImageMode] = useState<"upload" | "url">("upload");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImageUrl, setEditImageUrl] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [votes, setVotes] = useState<Record<string, { up: number; down: number }>>(
    Object.fromEntries(meals.map((meal) => [meal.id, { up: meal.thumbsUpCount, down: meal.thumbsDownCount }]))
  );
  const [pendingVoteId, setPendingVoteId] = useState<string | null>(null);
  const router = useRouter();

  function startEdit(meal: Meal) {
    setEditingId(meal.id);
    setEditName(meal.name);
    setEditComplexity(meal.complexity);
    setEditImageFile(null);
    setEditImageMode(meal.imageUrl ? "url" : "upload");
    setEditImageUrl(meal.imageUrl ?? "");
    setOpenMenuId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditComplexity("MEDIUM");
    setEditImageMode("upload");
    setEditImageFile(null);
    setEditImageUrl("");
  }

  async function handleVote(id: string, direction: "up" | "down") {
    const current = votes[id] ?? { up: 0, down: 0 };
    const optimistic = direction === "up" ? { up: current.up + 1, down: current.down } : { up: current.up, down: current.down + 1 };

    setVotes((state) => ({ ...state, [id]: optimistic }));
    setPendingVoteId(id);

    const result = await voteMeal(id, direction);
    if (result.error) {
      setVotes((state) => ({ ...state, [id]: current }));
    } else {
      setVotes((state) => ({
        ...state,
        [id]: {
          up: result.meal?.thumbsUpCount ?? optimistic.up,
          down: result.meal?.thumbsDownCount ?? optimistic.down,
        },
      }));
    }

    setPendingVoteId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Är du säker på att du vill ta bort den här måltiden?")) {
      return;
    }

    const result = await deleteMeal(id);
    if (!result.error) {
      router.refresh();
    }
  }

  async function handleEditSave(id: string) {
    const formData = new FormData();
    formData.append("name", editName.trim());
    formData.append("complexity", editComplexity);
    if (editImageMode === "upload" && editImageFile) {
      formData.append("image", editImageFile);
    }
    if (editImageMode === "url" && editImageUrl.trim()) {
      formData.append("imageUrl", editImageUrl.trim());
    }
    const result = await updateMeal(id, formData);
    if (!result.error) {
      cancelEdit();
      router.refresh();
    }
  }

  return (
    <ul className="divide-y divide-[var(--cream-dark)] rounded-xl border border-[var(--cream-dark)] bg-white">
      {meals.map((meal) => {
        const mealVotes = votes[meal.id] ?? { up: meal.thumbsUpCount, down: meal.thumbsDownCount };
        const imageSrc = meal.imageUrl || `/api/meal-image?meal=${encodeURIComponent(meal.name)}&style=warm-home-cooked-top-down`;

        return (
          <li key={meal.id} className="relative px-2 py-2">
            {editingId === meal.id ? (
              <div className="space-y-2 rounded-md border border-[var(--cream-dark)] bg-[var(--cream)]/50 p-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <select
                    value={editComplexity}
                    onChange={(e) => setEditComplexity(e.target.value as Meal["complexity"])}
                    className="w-full text-sm"
                  >
                    <option value="SIMPLE">Enkel</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="COMPLEX">Avancerad</option>
                  </select>
                </div>

                <div className="rounded-md border border-[var(--cream-dark)] bg-white/70 p-2">
                  <div className="mb-2 grid grid-cols-2 gap-1 rounded-md bg-[var(--cream)] p-1 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        setEditImageMode("upload");
                        setEditImageUrl("");
                      }}
                      className={`rounded-md px-2 py-1 transition ${editImageMode === "upload" ? "bg-white text-[var(--charcoal)] shadow-sm" : "text-[var(--warm-gray)]"}`}
                    >
                      Ladda upp
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditImageMode("url");
                        setEditImageFile(null);
                      }}
                      className={`rounded-md px-2 py-1 transition ${editImageMode === "url" ? "bg-white text-[var(--charcoal)] shadow-sm" : "text-[var(--warm-gray)]"}`}
                    >
                      Bild-URL
                    </button>
                  </div>

                  {editImageMode === "upload" ? (
                    <>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setEditImageFile(e.target.files?.[0] ?? null)}
                        className="w-full text-xs"
                      />
                      {editImageFile && (
                        <p className="mt-1 text-xs text-[var(--warm-gray)]">Vald bild: {editImageFile.name}</p>
                      )}
                    </>
                  ) : (
                    <input
                      type="url"
                      value={editImageUrl}
                      onChange={(e) => setEditImageUrl(e.target.value)}
                      placeholder="https://example.com/meal.jpg"
                    />
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-md border border-[var(--cream-dark)] px-2 py-1 text-xs font-semibold text-[var(--warm-gray)]"
                  >
                    Avbryt
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleEditSave(meal.id)}
                    className="rounded-md bg-[var(--terracotta)] px-2 py-1 text-xs font-semibold text-white"
                  >
                    Spara
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2">
              <div className="relative h-10 w-10 overflow-hidden rounded-md">
                <img
                  src={imageSrc}
                  alt={meal.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(event) => {
                    const fallback = `/api/meal-image?meal=${encodeURIComponent(meal.name)}&style=warm-home-cooked-top-down`;
                    if (event.currentTarget.src !== new URL(fallback, window.location.origin).toString()) {
                      event.currentTarget.src = fallback;
                    }
                  }}
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${DOT_COLOR[meal.complexity]}`} />
                  <p className="truncate text-sm font-medium text-[var(--charcoal)]">{meal.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleVote(meal.id, "up")}
                  disabled={pendingVoteId === meal.id}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
                >
                  👍 {mealVotes.up}
                </button>
                <button
                  type="button"
                  onClick={() => handleVote(meal.id, "down")}
                  disabled={pendingVoteId === meal.id}
                  className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"
                >
                  👎 {mealVotes.down}
                </button>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenuId((current) => (current === meal.id ? null : meal.id))}
                  className="rounded-md p-1 text-[var(--warm-gray)] hover:bg-[var(--cream)]"
                  aria-label="Meny"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {openMenuId === meal.id && (
                  <div className="absolute right-0 top-7 z-20 w-28 rounded-md border border-[var(--cream-dark)] bg-white shadow-md">
                    <button
                      type="button"
                      onClick={() => {
                        startEdit(meal);
                      }}
                      className="block w-full px-3 py-2 text-left text-xs font-semibold text-[var(--charcoal)] hover:bg-[var(--cream)]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuId(null);
                        void handleDelete(meal.id);
                      }}
                      className="block w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
