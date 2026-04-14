'use client'

interface SkeletonProps {
  rows?: number
  cols?: number
}

export function TableSkeleton({ rows = 5, cols = 8 }: SkeletonProps) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-bg-border">
            {Array(cols).fill(0).map((_, i) => (
              <th key={i} className="table-head whitespace-nowrap">
                <div className="h-3 bg-bg-border rounded animate-pulse w-full"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array(rows).fill(0).map((_, rowIdx) => (
            <tr key={rowIdx} className="table-row border-b border-bg-border">
              {Array(cols).fill(0).map((_, colIdx) => (
                <td key={colIdx} className="table-cell">
                  <div className="h-4 bg-bg-border rounded animate-pulse w-full"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="h-4 bg-bg-border rounded animate-pulse w-3/4"></div>
      <div className="h-4 bg-bg-border rounded animate-pulse w-full"></div>
      <div className="h-4 bg-bg-border rounded animate-pulse w-2/3"></div>
    </div>
  )
}
