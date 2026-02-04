import { useState } from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { MoreVertical, Package, FileText, ExternalLink, Trash2, User } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export interface Asset {
  id: number
  name: string
  type: string
  description: string | null
  value: number
  documentUrl: string | null
  createdAt: string
  owner?: {
    id: string
    name: string
  }
  relationship?: string
}

interface AssetsTableProps {
  data: Asset[]
  isLoading?: boolean
  onDelete?: (id: number) => void | Promise<void>
  currentUserId?: string
  showOwner?: boolean
}

// Helper function to format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
  }).format(value)
}

// Helper function to format asset type for display
const formatAssetType = (type: string) => {
  return type.charAt(0) + type.slice(1).toLowerCase()
}

// Get color for asset type badge
const getAssetTypeColor = (type: string) => {
  switch (type) {
    case 'PROPERTY':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    case 'VEHICLE':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case 'INVESTMENT':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
  }
}

// Helper function to format relationship for display
const formatRelationship = (relation: string): string => {
  return relation.charAt(0) + relation.slice(1).toLowerCase()
}

const createColumns = (
  onEdit: (asset: Asset) => void,
  onDelete: (id: number) => void,
  router: ReturnType<typeof useRouter>,
  currentUserId: string,
  showOwner: boolean
): ColumnDef<Asset>[] => {
  const columns: ColumnDef<Asset>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const asset = row.original
        return (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="h-4 w-4" />
            </div>
            <button
              onClick={() => router.navigate({ to: `/app/assets/view/${asset.id}` as any })}
              className="font-medium hover:underline hover:text-primary transition-colors text-left"
            >
              {asset.name}
            </button>
          </div>
        )
      },
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.original.type
        return (
          <Badge className={getAssetTypeColor(type)}>
            {formatAssetType(type)}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'value',
      header: 'Value',
      cell: ({ row }) => {
        const value = row.original.value
        return <span className="font-medium">{formatCurrency(value)}</span>
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => {
        const description = row.original.description
        return (
          <span className="text-sm text-muted-foreground">
            {description || '-'}
          </span>
        )
      },
    },
  ]

  // Conditionally add owner column
  if (showOwner) {
    columns.push({
      id: 'owner',
      header: 'Owner',
      cell: ({ row }) => {
        const asset = row.original
        if (!asset.owner) {
          return <span className="text-sm text-muted-foreground">You</span>
        }
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{asset.owner.name}</span>
            </div>
            {asset.relationship && (
              <span className="text-xs text-muted-foreground ml-6">
                {formatRelationship(asset.relationship)}
              </span>
            )}
          </div>
        )
      },
    })
  }

  columns.push(
    {
      id: 'document',
      header: 'Document',
      cell: ({ row }) => {
        const asset = row.original
        if (!asset.documentUrl) {
          return <span className="text-sm text-muted-foreground">-</span>
        }
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(asset.documentUrl!, '_blank')}
          >
            <FileText className="mr-2 h-4 w-4" />
            View
            <ExternalLink className="ml-1 h-3 w-3" />
          </Button>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const asset = row.original
        const isOwner = !asset.owner || asset.owner.id === currentUserId

        if (!isOwner) {
          return null
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(asset)}>
                <Package className="mr-2 h-4 w-4" />
                <span>Edit</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(asset.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    }
  )

  return columns
}

export function AssetsTable({
  data,
  isLoading = false,
  onDelete,
  currentUserId = '',
  showOwner = false,
}: AssetsTableProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  const handleEdit = (asset: Asset) => {
    router.navigate({
      to: `/app/assets/edit/${asset.id}`,
    })
  }

  const handleDelete = async (id: number) => {
    if (isDeleting) return

    setIsDeleting(id)
    try {
      await onDelete?.(id)
    } finally {
      setIsDeleting(null)
    }
  }

  const columns = createColumns(handleEdit, handleDelete, router, currentUserId, showOwner)

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading assets...</div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">No assets yet</h3>
        <p className="text-muted-foreground">
          Get started by adding your first asset.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No assets found. Add your first asset.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
