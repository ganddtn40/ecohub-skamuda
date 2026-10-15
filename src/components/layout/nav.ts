import {
  ClipboardList,
  History,
  Home,
  QrCode,
  Receipt,
  ScanLine,
  ShoppingBag,
  Trophy,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { ROUTE } from "@/lib/constants";
import type { UserRole } from "@/types/database";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  student: [
    { href: ROUTE.student, label: "Beranda", icon: Home },
    { href: ROUTE.studentQr, label: "QR Saya", icon: QrCode },
    { href: ROUTE.studentCanteen, label: "Kantin", icon: ShoppingBag },
    { href: ROUTE.studentOrders, label: "Pesanan", icon: Receipt },
    { href: ROUTE.studentHistory, label: "Riwayat", icon: History },
  ],
  waste_officer: [
    { href: ROUTE.officer, label: "Pindai Setoran", icon: ScanLine },
    { href: ROUTE.officerHistory, label: "Riwayat", icon: ClipboardList },
  ],
  canteen_vendor: [
    { href: ROUTE.vendor, label: "Pesanan", icon: ClipboardList },
    { href: ROUTE.vendorScan, label: "Pindai Tiket", icon: QrCode },
    { href: ROUTE.vendorMenu, label: "Menu", icon: UtensilsCrossed },
  ],
};

export const LEADERBOARD_NAV: NavItem = {
  href: ROUTE.leaderboard,
  label: "Papan Skor",
  icon: Trophy,
};
