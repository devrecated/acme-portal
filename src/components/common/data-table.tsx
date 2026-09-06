"use client"

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import { useMemo, useState, type ReactNode } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

export interface Column<T> {
  key: string
  header: string
  cell: (row: T) => ReactNode
  /** Supply to make the column sortable. */
  sortValue?: (row: T) => string | number
  className?: string
  headerClassName?: string
}

type SortDirection = "asc" | "desc"

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  getRowId: (row: T) => string
  onRowClick?: (row: T) => void
  isLoading?: boolean
  emptyState?: ReactNode
  initialSort?: { key: string; direction: SortDirection }
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  onRowClick,
  isLoading,
  emptyState,
  initialSort,
}: DataTableProps<T>) {
  const [sort, setSort] = useState(initialSort)

  const sortedRows = useMemo(() => {
    if (!sort) return rows
    const column = columns.find((c) => c.key === sort.key)
    if (!column?.sortValue) return rows

    const read = column.sortValue
    const direction = sort.direction === "asc" ? 1 : -1

    return rows.toSorted((a, b) => {
      const left = read(a)
      const right = read(b)
      if (typeof left === "number" && typeof right === "number") {
        return (left - right) * direction
      }
      return String(left).localeCompare(String(right)) * direction
    })
  }, [rows, sort, columns])

  const toggleSort = (key: string) => {
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
        <Table className="min-w-[40rem]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn("whitespace-nowrap", column.headerClassName)}
                >
                  {column.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className="-mx-2 inline-flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors hover:text-foreground"
                    >
                      {column.header}
                      <SortIcon
                        active={sort?.key === column.key}
                        direction={sort?.direction}
                      />
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <LoadingRows columns={columns.length} />
            ) : sortedRows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="h-40 p-0">
                  {emptyState ?? (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                      Nothing to show yet.
                    </p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              sortedRows.map((row) => (
                <TableRow
                  key={getRowId(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn("whitespace-nowrap", column.className)}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean
  direction?: SortDirection
}) {
  if (!active) {
    return <ChevronsUpDown className="size-3.5 text-muted-foreground/60" />
  }
  return direction === "asc" ? (
    <ArrowUp className="size-3.5" />
  ) : (
    <ArrowDown className="size-3.5" />
  )
}

function LoadingRows({ columns }: { columns: number }) {
  return (
    <>
      {Array.from({ length: 6 }, (_, rowIndex) => (
        <TableRow key={rowIndex} className="hover:bg-transparent">
          {Array.from({ length: columns }, (_, cellIndex) => (
            <TableCell key={cellIndex}>
              <Skeleton className="h-4 w-full max-w-32" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}
