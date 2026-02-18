import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Filter, Loader2, Plus, RefreshCcw, Search, Sparkles, UserCheck, UserX, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { FamilyRelationType } from '@/lib/family-types'
import type { FamilyMember } from '@/types/family'

import { FamilyMembersTable } from '@/components/family/family-members-table'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { authClient } from '@/lib/auth-client'
import { isRegisteredFamilyMember } from '@/types/family'

interface FamilyResponse {
  registered?: Array<FamilyMember>
  nonRegistered?: Array<FamilyMember>
}

export const Route = createFileRoute('/app/family/view')({
  component: RouteComponent,
})

function formatRelationLabel(relation: string) {
  return relation
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function RouteComponent() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [memberTypeFilter, setMemberTypeFilter] = useState<'all' | 'non-registered' | 'registered'>('all')
  const [query, setQuery] = useState('')
  const [relationFilter, setRelationFilter] = useState<'all' | FamilyRelationType>('all')

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const data = await authClient.getSession()
      return data.data
    },
  })

  const userId = session?.user.id

  const { data: familyData, isLoading: familyLoading } = useQuery({
    enabled: !!userId,
    queryKey: ['familyMembers', userId],
    queryFn: async () => {
      if (!userId) return null
      const response = await fetch(`/api/family?userId=${userId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch family members')
      }
      return response.json() as Promise<FamilyResponse>
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string | number; type: string }) => {
      const response = await fetch(`/api/family?type=${type}&id=${id}`, { method: 'DELETE' })
      if (!response.ok) {
        throw new Error('Failed to delete family member')
      }
      return response.json()
    },
    onError: (error) => {
      console.error('Error deleting family member:', error)
      toast.error('Failed to delete family member')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyMembers', userId] })
      toast.success('Family member deleted successfully')
    },
  })

  const familyMembers = useMemo(() => {
    const members: Array<FamilyMember> = []
    if (familyData?.registered) {
      members.push(...familyData.registered)
    }
    if (familyData?.nonRegistered) {
      members.push(...familyData.nonRegistered)
    }
    return members
  }, [familyData])

  const relationOptions = useMemo(() => {
    const options = new Set<FamilyRelationType>()
    for (const member of familyMembers) {
      options.add(member.relation)
    }
    return Array.from(options).sort((a, b) => a.localeCompare(b))
  }, [familyMembers])

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return familyMembers.filter((member) => {
      if (memberTypeFilter !== 'all' && member.type !== memberTypeFilter) {
        return false
      }

      if (relationFilter !== 'all' && member.relation !== relationFilter) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      const contactValue = isRegisteredFamilyMember(member)
        ? member.email || ''
        : `${member.phoneNumber || ''} ${member.address || ''} ${member.icNumber || ''}`

      return `${member.name} ${contactValue} ${member.relation}`
        .toLowerCase()
        .includes(normalizedQuery)
    })
  }, [familyMembers, memberTypeFilter, query, relationFilter])

  const stats = useMemo(() => {
    const registeredCount = familyMembers.filter((member) => member.type === 'registered').length
    const nonRegisteredCount = familyMembers.length - registeredCount
    const uniqueRelations = new Set(familyMembers.map((member) => member.relation)).size
    return {
      nonRegisteredCount,
      registeredCount,
      total: familyMembers.length,
      uniqueRelations,
    }
  }, [familyMembers])

  const hasActiveFilters = query.trim().length > 0 || memberTypeFilter !== 'all' || relationFilter !== 'all'

  const handleDelete = async (type: string, id: string | number) => {
    if (!confirm('Are you sure you want to delete this family member?')) {
      return
    }
    await deleteMutation.mutateAsync({ id, type })
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['familyMembers', userId] })
  }

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-gradient-to-r from-sky-50/60 via-background to-emerald-50/30">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                Family Overview
              </div>
              <CardTitle className="text-xl">Family Members</CardTitle>
              <CardDescription className="mt-1">
                Keep your relationships organized for agreement and inheritance workflows.
              </CardDescription>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Button className="w-full sm:w-auto" variant="outline" onClick={handleRefresh}>
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
              <Button className="w-full sm:w-auto" onClick={() => router.navigate({ to: '/app/family/add' })}>
                <Plus className="h-4 w-4" />
                Add Family Member
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-border/70 bg-card/70 p-3 shadow-sm">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-4 w-4" />
              </div>
              <p className="text-2xl font-semibold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total members</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/70 p-3 shadow-sm">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700">
                <UserCheck className="h-4 w-4" />
              </div>
              <p className="text-2xl font-semibold">{stats.registeredCount}</p>
              <p className="text-xs text-muted-foreground">Registered users</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/70 p-3 shadow-sm">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-500/15 text-slate-700">
                <UserX className="h-4 w-4" />
              </div>
              <p className="text-2xl font-semibold">{stats.nonRegisteredCount}</p>
              <p className="text-xs text-muted-foreground">Non-registered users</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/70 p-3 shadow-sm">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700">
                <Filter className="h-4 w-4" />
              </div>
              <p className="text-2xl font-semibold">{stats.uniqueRelations}</p>
              <p className="text-xs text-muted-foreground">Relation types</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Directory</CardTitle>
              <CardDescription>Search, filter, and manage member records.</CardDescription>
            </div>
            {hasActiveFilters ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setMemberTypeFilter('all')
                  setQuery('')
                  setRelationFilter('all')
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_200px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, relation, email, phone, IC..."
                className="pl-9"
              />
            </div>
            <Select
              value={memberTypeFilter}
              onValueChange={(value: 'all' | 'non-registered' | 'registered') => setMemberTypeFilter(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Member type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="registered">Registered</SelectItem>
                <SelectItem value="non-registered">Non-registered</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={relationFilter}
              onValueChange={(value: 'all' | FamilyRelationType) => setRelationFilter(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Relation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All relations</SelectItem>
                {relationOptions.map((relation) => (
                  <SelectItem key={relation} value={relation}>
                    {formatRelationLabel(relation)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <FamilyMembersTable
            data={filteredMembers}
            isLoading={familyLoading}
            onDelete={handleDelete}
            emptyDescription={
              hasActiveFilters
                ? 'Try adjusting your filters or search query.'
                : 'Start by adding your first family member.'
            }
            emptyTitle={
              hasActiveFilters ? 'No members match your current filters' : 'No family members yet'
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}
