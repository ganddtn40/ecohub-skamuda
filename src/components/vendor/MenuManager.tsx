"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Pencil, Plus, Store, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Sheet } from "@/components/ui/Sheet";
import { Spinner } from "@/components/ui/Spinner";
import { formatNumber, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { MenuItem } from "@/types/database";

const CATEGORIES = ["Makanan", "Minuman", "Snack", "Sehat", "Lainnya"];

interface StandOption {
  id: string;
  stand_name: string;
}

interface FormState {
  name: string;
  category: string;
  price: string;
  points: string;
  available: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  category: "Makanan",
  price: "",
  points: "",
  available: true,
};

export function MenuManager({
  stands,
  items,
}: {
  stands: StandOption[];
  items: MenuItem[];
}) {
  const router = useRouter();

  const [standId, setStandId] = useState(stands[0]?.id ?? "");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const visible = useMemo(
    () => items.filter((item) => item.stand_id === standId),
    [items, standId],
  );

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setSheetOpen(true);
  }

  function openEdit(item: MenuItem) {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category,
      price: String(item.price_idr),
      points: item.points_price ? String(item.points_price) : "",
      available: item.is_available,
    });
    setError(null);
    setSheetOpen(true);
  }

  async function save() {
    if (!standId) {
      setError("Pilih stand terlebih dahulu.");
      return;
    }
    if (form.name.trim().length < 2) {
      setError("Nama menu minimal 2 karakter.");
      return;
    }
    const price = Math.round(Number(form.price));
    if (!Number.isFinite(price) || price < 0) {
      setError("Harga harus berupa angka.");
      return;
    }

    setPending(true);
    setError(null);

    const payload = {
      stand_id: standId,
      name: form.name.trim(),
      category: form.category,
      price_idr: price,
      points_price: form.points.trim() ? Math.round(Number(form.points)) : null,
      is_available: form.available,
    };

    const supabase = createClient();
    const { error: dbError } = editing
      ? await supabase.from("menu_items").update(payload).eq("id", editing.id)
      : await supabase.from("menu_items").insert(payload);

    setPending(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    setSheetOpen(false);
    router.refresh();
  }

  async function toggleAvailable(item: MenuItem) {
    const supabase = createClient();
    await supabase
      .from("menu_items")
      .update({ is_available: !item.is_available })
      .eq("id", item.id);
    router.refresh();
  }

  async function remove(item: MenuItem) {
    const supabase = createClient();
    await supabase.from("menu_items").delete().eq("id", item.id);
    setConfirmId(null);
    router.refresh();
  }

  if (stands.length === 0) {
    return (
      <EmptyState
        icon={<Store size={22} />}
        title="Belum ada stand untuk akun ini"
        description="Hubungi admin sekolah untuk mendaftarkan stand kantin pada akun kamu."
      />
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {stands.length > 1 ? (
          <Field label="Stand" htmlFor="menu-stand" className="sm:max-w-xs">
            <Select
              id="menu-stand"
              value={standId}
              onChange={(event) => setStandId(event.target.value)}
            >
              {stands.map((stand) => (
                <option key={stand.id} value={stand.id}>
                  {stand.stand_name}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <p className="text-sm text-muted">
            Stand: <span className="font-semibold text-ink">{stands[0].stand_name}</span>
          </p>
        )}

        <Button type="button" onClick={openCreate}>
          <Plus size={18} />
          Tambah menu
        </Button>
      </div>

      <div className="mt-4">
        {visible.length === 0 ? (
          <EmptyState
            icon={<Store size={22} />}
            title="Belum ada menu"
            description="Tambahkan menu agar siswa bisa memesan dari stand ini."
          />
        ) : (
          <ul className="space-y-3">
            {visible.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-white p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                    <span className="tnum font-semibold text-eco-700">
                      {formatRupiah(item.price_idr)}
                    </span>
                    {item.points_price ? (
                      <span className="tnum">{formatNumber(item.points_price)} P</span>
                    ) : null}
                    <span>{item.category}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleAvailable(item)}
                  aria-pressed={item.is_available}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-control border px-3 text-xs font-semibold transition-colors",
                    item.is_available
                      ? "border-eco-200 bg-eco-50 text-eco-700"
                      : "border-line bg-mint text-muted",
                  )}
                >
                  {item.is_available ? <Check size={14} /> : <X size={14} />}
                  {item.is_available ? "Tersedia" : "Habis"}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    aria-label={`Ubah ${item.name}`}
                    className="grid h-9 w-9 place-items-center rounded-control border border-line text-ink-soft transition-colors hover:bg-mint"
                  >
                    <Pencil size={15} />
                  </button>

                  {confirmId === item.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => remove(item)}
                        className="inline-flex h-9 items-center rounded-control bg-danger-500 px-2.5 text-xs font-semibold text-white hover:bg-danger-600"
                      >
                        Hapus
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="grid h-9 w-9 place-items-center rounded-control border border-line text-muted hover:bg-mint"
                        aria-label="Batal menghapus"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(item.id)}
                      aria-label={`Hapus ${item.name}`}
                      className="grid h-9 w-9 place-items-center rounded-control border border-line text-muted transition-colors hover:bg-danger-50 hover:text-danger-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? "Ubah menu" : "Tambah menu"}
        description={stands.find((stand) => stand.id === standId)?.stand_name}
        footer={
          <div className="space-y-3">
            {error ? (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-control border border-danger-500/30 bg-danger-50 px-3 py-2.5 text-sm text-danger-600"
              >
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                {error}
              </p>
            ) : null}
            <Button type="button" className="w-full" disabled={pending} onClick={save}>
              {pending ? <Spinner className="text-white" /> : <Check size={18} />}
              {editing ? "Simpan perubahan" : "Tambahkan menu"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Nama menu" htmlFor="menu-name">
            <Input
              id="menu-name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="cth. Nasi Ayam Bakar"
            />
          </Field>

          <Field label="Kategori" htmlFor="menu-category">
            <Select
              id="menu-category"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Harga (Rp)" htmlFor="menu-price">
              <Input
                id="menu-price"
                inputMode="numeric"
                value={form.price}
                onChange={(event) => setForm({ ...form, price: event.target.value })}
                placeholder="cth. 15000"
              />
            </Field>
            <Field label="Harga poin (opsional)" htmlFor="menu-points">
              <Input
                id="menu-points"
                inputMode="numeric"
                value={form.points}
                onChange={(event) => setForm({ ...form, points: event.target.value })}
                placeholder="cth. 1500"
              />
            </Field>
          </div>

          <button
            type="button"
            aria-pressed={form.available}
            onClick={() => setForm({ ...form, available: !form.available })}
            className={cn(
              "flex w-full items-center justify-between rounded-control border px-3 py-3 text-sm font-semibold transition-colors",
              form.available
                ? "border-eco-200 bg-eco-50 text-eco-700"
                : "border-line bg-mint text-muted",
            )}
          >
            Status ketersediaan
            <span>{form.available ? "Tersedia" : "Habis"}</span>
          </button>
        </div>
      </Sheet>
    </div>
  );
}
