"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Html5Qrcode } from "html5-qrcode";
import {
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle2,
  QrCode,
  Recycle,
  RotateCcw,
  Search,
  Weight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { Avatar } from "@/components/ui/Avatar";
import { formatKg, formatNumber } from "@/lib/format";
import type { WasteItemType } from "@/types/database";

interface LookedUpStudent {
  id: string;
  full_name: string;
  class_name: string | null;
  points_balance: number;
  total_recycled_kg: number;
}

interface DepositResult {
  full_name: string;
  class_name: string | null;
  item_label: string;
  points_earned: number;
  points_balance: number;
  total_recycled_kg: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function WasteOfficerPanel({ wasteTypes }: { wasteTypes: WasteItemType[] }) {
  const router = useRouter();

  const [cameraOn, setCameraOn] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [student, setStudent] = useState<LookedUpStudent | null>(null);
  const [token, setToken] = useState("");

  const [itemType, setItemType] = useState(wasteTypes[0]?.code ?? "");
  const [weightKg, setWeightKg] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<DepositResult | null>(null);

  const instanceRef = useRef<Html5Qrcode | null>(null);
  const onDecodeRef = useRef<(text: string) => void>(() => {});

  async function lookup(value: string) {
    const clean = value.trim();
    if (!clean) {
      setError("Token QR kosong.");
      return;
    }
    if (!UUID_RE.test(clean)) {
      setError("Token QR tidak valid. Pastikan memindai QR milik siswa.");
      return;
    }

    setLooking(true);
    setError(null);
    setResult(null);

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("lookup_student_by_token", {
      p_token: clean,
    });
    setLooking(false);

    if (rpcError) {
      setStudent(null);
      setError(rpcError.message);
      return;
    }

    setToken(clean);
    setStudent(data as LookedUpStudent);
    setCameraOn(false);
  }

  onDecodeRef.current = (text: string) => {
    void lookup(text);
  };

  useEffect(() => {
    if (!cameraOn || student) return;

    let disposed = false;
    let instance: Html5Qrcode | null = null;
    setCameraError(null);

    (async () => {
      try {
        const mod = await import("html5-qrcode");
        if (disposed) return;

        instance = new mod.Html5Qrcode("qr-reader", { verbose: false });
        instanceRef.current = instance;

        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText: string) => onDecodeRef.current(decodedText),
          () => {},
        );
      } catch (err) {
        if (!disposed) {
          setCameraError(
            err instanceof Error
              ? err.message
              : "Kamera tidak dapat diakses. Gunakan input token manual di bawah.",
          );
        }
      }
    })();

    return () => {
      disposed = true;
      const current = instance;
      if (current) {
        current
          .stop()
          .then(() => current.clear())
          .catch(() => {});
      }
      instanceRef.current = null;
    };
  }, [cameraOn, student]);

  async function submitDeposit() {
    if (!student) return;

    const weight = Number(weightKg.replace(",", "."));
    if (!Number.isFinite(weight) || weight <= 0) {
      setError("Berat sampah harus lebih dari 0 kg.");
      return;
    }
    const qty = Number(quantity) > 0 ? Number(quantity) : 1;

    setPending(true);
    setError(null);

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("process_waste_deposit", {
      p_qr_token: token,
      p_item_type: itemType,
      p_quantity: qty,
      p_weight_kg: weight,
    });
    setPending(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setResult(data as DepositResult);
    setStudent(null);
    setToken("");
    setWeightKg("");
    setQuantity("1");
    router.refresh();
  }

  function scanNext() {
    setResult(null);
    setStudent(null);
    setToken("");
    setError(null);
    setManualToken("");
    setCameraOn(true);
  }

  const activeType = wasteTypes.find((type) => type.code === itemType);
  const estimatedPoints =
    activeType && Number(weightKg.replace(",", ".")) > 0
      ? Math.floor(activeType.points_per_kg * Number(weightKg.replace(",", ".")))
      : 0;

  if (result) {
    return (
      <div className="rounded-card border border-line bg-white p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-eco-50 text-eco-700">
            <CheckCircle2 size={24} />
          </span>
          <div>
            <p className="text-base font-bold text-ink">Setoran berhasil diproses</p>
            <p className="text-sm text-muted">
              {result.full_name} &middot; {result.class_name ?? "Tanpa kelas"}
            </p>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-control border border-line p-3">
            <dt className="text-xs text-muted">Jenis sampah</dt>
            <dd className="mt-0.5 text-sm font-semibold text-ink">{result.item_label}</dd>
          </div>
          <div className="rounded-control border border-line p-3">
            <dt className="text-xs text-muted">Poin didapat</dt>
            <dd className="tnum mt-0.5 text-sm font-bold text-eco-700">
              +{formatNumber(result.points_earned)} P
            </dd>
          </div>
          <div className="rounded-control border border-line p-3">
            <dt className="text-xs text-muted">Saldo poin sekarang</dt>
            <dd className="tnum mt-0.5 text-sm font-semibold text-ink">
              {formatNumber(result.points_balance)} P
            </dd>
          </div>
          <div className="rounded-control border border-line p-3">
            <dt className="text-xs text-muted">Total daur ulang</dt>
            <dd className="tnum mt-0.5 text-sm font-semibold text-ink">
              {formatKg(result.total_recycled_kg)}
            </dd>
          </div>
        </dl>

        <Button type="button" onClick={scanNext} className="mt-5 w-full">
          <RotateCcw size={18} />
          Pindai setoran berikutnya
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Pemindai */}
      <section className="rounded-card border border-line bg-white p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-eco-700">
            <Camera size={18} />
            <h2 className="text-sm font-semibold">Pemindai QR siswa</h2>
          </div>
          <span className="text-xs text-muted">Kamera langsung</span>
        </div>

        <div className="mt-4 overflow-hidden rounded-control border border-line bg-ink/5">
          {cameraOn && !student ? (
            <div id="qr-reader" className="min-h-[240px] w-full [&_video]:w-full" />
          ) : (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 px-4 text-center">
              <CameraOff size={28} className="text-muted" />
              <p className="text-sm text-muted">
                {student ? "QR berhasil dipindai." : "Kamera dimatikan."}
              </p>
            </div>
          )}
        </div>

        {cameraError ? (
          <p className="mt-3 flex items-start gap-2 rounded-control border border-gold-100 bg-gold-50 px-3 py-2.5 text-sm text-gold-600">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            {cameraError}
          </p>
        ) : null}

        <div className="mt-4 border-t border-line pt-4">
          <Field
            label="Input token manual"
            htmlFor="manual-token"
            hint="Tempel UUID dari QR bila kamera tidak tersedia."
          >
            <Input
              id="manual-token"
              value={manualToken}
              onChange={(event) => setManualToken(event.target.value)}
              placeholder="cth. 3f2a1c9e-....-...."
              autoComplete="off"
            />
          </Field>
          <Button
            type="button"
            variant="secondary"
            className="mt-3 w-full"
            onClick={() => void lookup(manualToken)}
            disabled={looking}
          >
            {looking ? <Spinner /> : <Search size={18} />}
            Cari siswa dari token
          </Button>
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-control border border-danger-500/30 bg-danger-50 px-3 py-2.5 text-sm text-danger-600"
          >
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            {error}
          </p>
        ) : null}
      </section>

      {/* Form setoran */}
      <section className="rounded-card border border-line bg-white p-5">
        <div className="flex items-center gap-2 text-eco-700">
          <Recycle size={18} />
          <h2 className="text-sm font-semibold">Form setoran sampah</h2>
        </div>

        {student ? (
          <>
            <div className="mt-4 flex items-center gap-3 rounded-control border border-line bg-mint p-3">
              <Avatar name={student.full_name} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{student.full_name}</p>
                <p className="text-xs text-muted">
                  {student.class_name ?? "Tanpa kelas"} &middot; {formatNumber(student.points_balance)} P
                  &middot; {formatKg(student.total_recycled_kg)}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <Field label="Jenis sampah" htmlFor="item-type">
                <Select
                  id="item-type"
                  value={itemType}
                  onChange={(event) => setItemType(event.target.value)}
                >
                  {wasteTypes.map((type) => (
                    <option key={type.code} value={type.code}>
                      {type.label} ({formatNumber(type.points_per_kg)} P/kg)
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Berat (kg)" htmlFor="weight">
                  <Input
                    id="weight"
                    inputMode="decimal"
                    value={weightKg}
                    onChange={(event) => setWeightKg(event.target.value)}
                    placeholder="cth. 1.5"
                  />
                </Field>
                <Field
                  label="Jumlah"
                  htmlFor="quantity"
                  hint={activeType ? `Satuan: ${activeType.unit_label}` : undefined}
                >
                  <Input
                    id="quantity"
                    inputMode="numeric"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    placeholder="1"
                  />
                </Field>
              </div>

              <div className="flex items-center gap-2 rounded-control bg-gold-50 px-3 py-2.5">
                <Weight size={17} className="text-gold-600" />
                <p className="text-sm text-gold-600">
                  Estimasi poin:{" "}
                  <span className="tnum font-bold">{formatNumber(estimatedPoints)} P</span>
                </p>
              </div>

              <Button type="button" onClick={submitDeposit} disabled={pending} className="w-full">
                {pending ? <Spinner className="text-white" /> : <QrCode size={18} />}
                {pending ? "Memproses setoran..." : "Proses setoran"}
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-4 flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-control border border-dashed border-line px-4 text-center">
            <QrCode size={28} className="text-muted" />
            <p className="text-sm font-semibold text-ink">Belum ada siswa terpilih</p>
            <p className="max-w-xs text-sm text-muted">
              Pindai QR siswa dengan kamera atau masukkan token manual untuk membuka form setoran.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
