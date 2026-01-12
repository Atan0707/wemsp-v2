import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { MoreVertical, Pencil, Trash2, User, UserPlus } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  FamilyMember,
  isNonRegisteredFamilyMember,
  isRegisteredFamilyMember,
} from '@/types/family'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface FamilyMembersTableProps {
  data: FamilyMember[]
  isLoading?: boolean
  onDelete?: (type: string, id: string | number) => void | Promise<void>
}

const createColumns = (
  onEdit: (member: FamilyMember) => void,
  onDelete: (type: string, id: string | number) => void
): ColumnDef<FamilyMember>[] => [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const member = row.original
      return (
        <div className="flex items-center gap-2">
          {isRegisteredFamilyMember(member) && member.image ? (
            <img
              src={member.image}
              alt={member.name}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium',
                isNonRegisteredFamilyMember(member)
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-primary text-primary-foreground'
              )}
            >
              {isNonRegisteredFamilyMember(member) ? (
                <UserPlus className="h-4 w-4" />
              ) : (
                <User className="h-4 w-4" />
              )}
            </div>
          )}
          <span className="font-medium">{member.name}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'relation',
    header: 'Relationship',
    cell: ({ row }) => {
      const relation = row.original.relation
      return (
        <span className="capitalize">{relation.toLowerCase()}</span>
      )
    },
  },
  {
    id: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.original.type
      return (
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
            type === 'registered'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
          )}
        >
          {type === 'registered' ? 'Registered' : 'Non-Registered'}
        </span>
      )
    },
  },
  {
    id: 'contact',
    header: 'Contact',
    cell: ({ row }) => {
      const member = row.original
      if (isNonRegisteredFamilyMember(member)) {
        return (
          <div className="text-sm text-muted-foreground">
            {member.phoneNumber || member.address || '-'}
          </div>
        )
      }
      return (
        <div className="text-sm text-muted-foreground">{member.email}</div>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const member = row.original
      const id =
        member.type === 'registered'
          ? (member as any).familyMemberUserId
          : member.id

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(member)}>
              <Pencil className="mr-2 h-4 w-4" />
              <span>Edit</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(member.type, id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

export function FamilyMembersTable({
  data,
  isLoading = false,
  onDelete,
}: FamilyMembersTableProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState<string | number | null>(null)

  const handleEdit = (member: FamilyMember) => {
    router.navigate({
      to: '/app/family/edit',
      // @ts-expect-error - TanStack Router state extension
      state: { member },
    })
  }

  const handleDelete = async (type: string, id: string | number) => {
    if (isDeleting) return

    setIsDeleting(id)
    try {
      await onDelete?.(type, id)
    } finally {
      setIsDeleting(null)
    }
  }

  const columns = createColumns(handleEdit, handleDelete)

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading family members...</div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <UserPlus className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">No family members yet</h3>
        <p className="text-muted-foreground">
          Get started by adding your first family member.
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
                No family members found. Add your first family member.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
