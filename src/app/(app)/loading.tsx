import { SkeletonList, SkeletonStats } from "@/components/ui/Skeleton";

export default function AppLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Memuat halaman">
      <div className="space-y-2">
        <div className="h-7 w-52 animate-pulse rounded-control bg-mint-deep" />
        <div className="h-4 w-72 animate-pulse rounded-control bg-mint-deep" />
      </div>
      <SkeletonStats />
      <SkeletonList rows={4} />
    </div>
  );
}
