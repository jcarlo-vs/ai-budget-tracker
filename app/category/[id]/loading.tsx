import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 pb-28 pt-6">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-11 w-full" />
      <div className="space-y-2 pt-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </main>
  );
}
