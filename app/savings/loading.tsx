import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-md space-y-5 px-4 pb-28 pt-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-24 w-full" />
      <div className="space-y-2 pt-2">
        <Skeleton className="h-[68px] w-full" />
        <Skeleton className="h-[68px] w-full" />
        <Skeleton className="h-[68px] w-full" />
      </div>
    </main>
  );
}
