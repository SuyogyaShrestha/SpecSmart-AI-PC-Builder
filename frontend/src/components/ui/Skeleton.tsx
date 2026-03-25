interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse rounded-md bg-[var(--surface-2)] ${className}`}
        />
    );
}

/** A row of skeleton cells for a table */
export function SkeletonRow({ cols = 4 }: { cols?: number }) {
    return (
        <tr className="animate-pulse border-b border-[var(--border)]">
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                </td>
            ))}
        </tr>
    );
}

/** Full-page skeleton for a card grid (e.g. MyBuilds) */
export function CardGridSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3 animate-pulse">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                    <div className="flex gap-2 pt-1">
                        <Skeleton className="h-8 flex-1 rounded-lg" />
                        <Skeleton className="h-8 w-8 rounded-lg" />
                    </div>
                </div>
            ))}
        </div>
    );
}

/** Skeleton for the PartPicker table */
export function PartTableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
    return (
        <tbody>
            {Array.from({ length: rows }).map((_, i) => (
                <SkeletonRow key={i} cols={cols} />
            ))}
        </tbody>
    );
}
