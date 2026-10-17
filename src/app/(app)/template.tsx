import { PageFade } from "@/components/motion/PageFade";

export default function Template({ children }: { children: React.ReactNode }) {
  return <PageFade>{children}</PageFade>;
}
