import { Recycle } from "lucide-react";
import { formatDateTime, formatKg, formatNumber } from "@/lib/format";

export interface DepositListItem {
  id: string;
  item_type: string;
  quantity: number;
  weight_kg: number;
  points_earned: number;
  created_at: string;
  waste_item_types: { label: string } | null;
}

export function DepositList({ items }: { items: DepositListItem[] }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-white">
      {items.map((deposit) => (
        <li key={deposit.id} className="flex items-center gap-3 px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-eco-50 text-eco-700">
            <Recycle size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">
              {deposit.waste_item_types?.label ?? deposit.item_type}
            </p>
            <p className="text-xs text-muted">
              {formatKg(deposit.weight_kg)} &middot; {formatDateTime(deposit.created_at)}
            </p>
          </div>
          <span className="tnum shrink-0 text-sm font-bold text-eco-700">
            +{formatNumber(deposit.points_earned)} P
          </span>
        </li>
      ))}
    </ul>
  );
}
