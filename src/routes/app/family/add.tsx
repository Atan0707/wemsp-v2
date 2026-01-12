import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FamilyRelation, FamilyRelationType } from '@/lib/family-types'
import { Loader2, Search, User, UserPlus, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

// Malaysian IC validation regex - 12 digits, no dashes
// Format: YYMMDDPB###G
// YY = Year, MM = Month, DD = Day, PB = Place of birth, ### = Sequential, G = Gender
const MALAYSIAN_IC_REGEX = /^\d{12}$/

function validateMalaysianIC(ic: string): boolean {
  if (!ic) return false
  return MALAYSIAN_IC_REGEX.test(ic)
}

// Types for search results
interface UserSearchResult {
  id: string
  name: string
  email: string
  image?: string | null
  existingRelation?: string
}

interface NonRegisteredSearchResult {
  id: number
  name: string
  icNumber: string
  phoneNumber?: string | null
  address?: string | null
}

type SearchResult =
  | { type: 'registered'; data: UserSearchResult }
  | { type: 'non-registered'; data: NonRegisteredSearchResult }
  | { type: 'not-found' }
  | { type: 'exists'; data: UserSearchResult }

export const Route = createFileRoute('/app/family/add')({
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()
  const [icNumber, setIcNumber] = useState('')
  const [icError, setIcError] = useState('')
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [relation, setRelation] = useState<FamilyRelationType | ''>('')
  const [hasSearched, setHasSearched] = useState(false)

  // Search for IC number
  const searchMutation = useMutation({
    mutationFn: async (ic: string): Promise<SearchResult> => {
      const response = await fetch(`/api/family/search?icNumber=${encodeURIComponent(ic)}`)
      if (!response.ok) {
        throw new Error('Search failed')
      }
      return response.json() as Promise<SearchResult>
    },
    onSuccess: (result) => {
      setSearchResult(result)
      setHasSearched(true)
      setIcError('')
    },
    onError: () => {
      toast.error('Failed to search for IC number')
    },
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      type: string
      memberData: any
    }) => {
      const response = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Failed to add family member')
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success('Family member added successfully')
      router.navigate({ to: '/app/family' })
    },
    onError: (error: Error) => {
      console.error('Error adding family member:', error)
      toast.error(error.message || 'Failed to add family member')
    },
  })

  const handleIcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 12) // Only digits, max 12
    setIcNumber(value)

    // Validate IC format
    if (value.length === 12 && !validateMalaysianIC(value)) {
      setIcError('Invalid Malaysian IC format. Must be 12 digits.')
    } else {
      setIcError('')
    }
  }

  const handleSearch = () => {
    if (!icNumber.trim()) {
      toast.error('Please enter an IC number')
      return
    }

    if (!validateMalaysianIC(icNumber)) {
      setIcError('Invalid Malaysian IC format. Must be exactly 12 digits.')
      toast.error('Please enter a valid Malaysian IC number')
      return
    }

    setSearchResult(null)
    setHasSearched(false)
    searchMutation.mutate(icNumber)
  }

  const handleIcKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!relation) {
      toast.error('Please select a relationship')
      return
    }

    if (searchResult?.type === 'registered') {
      await createMutation.mutateAsync({
        type: 'registered',
        memberData: { familyMemberUserId: searchResult.data.id, relation },
      })
    } else if (searchResult?.type === 'non-registered') {
      await createMutation.mutateAsync({
        type: 'non-registered',
        memberData: {
          name: searchResult.data.name,
          icNumber: searchResult.data.icNumber,
          relation,
          address: searchResult.data.address,
          phoneNumber: searchResult.data.phoneNumber,
        },
      })
    } else {
      const formData = new FormData(e.currentTarget)
      const name = formData.get('name') as string
      const address = formData.get('address') as string
      const phoneNumber = formData.get('phoneNumber') as string

      if (!name) {
        toast.error('Please fill in the name field')
        return
      }

      await createMutation.mutateAsync({
        type: 'non-registered',
        memberData: { name, icNumber, relation, address, phoneNumber },
      })
    }
  }

  const showEditableFields = searchResult?.type === 'not-found'

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Add Family Member</CardTitle>
          <CardDescription>Add a new family member to your profile</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* IC Number Search Section */}
            <div className="flex flex-col gap-4 p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    Enter the IC number first to search for existing users. 
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Example: 950815105567 (Aug 15, 1995)
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Input
                  value={icNumber}
                  onChange={handleIcChange}
                  onKeyDown={handleIcKeyDown}
                  placeholder="Enter IC number"
                  className={icError ? 'border-destructive' : ''}
                  maxLength={12}
                />
                {icError && (
                  <p className="text-xs text-destructive">{icError}</p>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSearch}
                  disabled={searchMutation.isPending || icNumber.length !== 12 || !!icError}
                  className="w-full"
                >
                  {searchMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  Search IC Number
                </Button>
              </div>
            </div>

            {/* Search Result Display */}
            {hasSearched && searchResult && (
              <div className="flex flex-col gap-3">
                {searchResult.type === 'exists' && (
                  <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    {searchResult.data.image ? (
                      <img
                        src={searchResult.data.image}
                        alt={searchResult.data.name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white">
                        <User className="h-6 w-6" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{searchResult.data.name}</p>
                      <p className="text-sm text-muted-foreground">{searchResult.data.email}</p>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        Already added as {searchResult.data.existingRelation?.toLowerCase()}
                      </p>
                    </div>
                  </div>
                )}

                {searchResult.type === 'registered' && (
                  <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    {searchResult.data.image ? (
                      <img
                        src={searchResult.data.image}
                        alt={searchResult.data.name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <User className="h-6 w-6" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{searchResult.data.name}</p>
                      <p className="text-sm text-muted-foreground">{searchResult.data.email}</p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        ✓ Registered user found
                      </p>
                    </div>
                  </div>
                )}

                {searchResult.type === 'non-registered' && (
                  <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white">
                      <UserPlus className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{searchResult.data.name}</p>
                      <p className="text-sm text-muted-foreground">IC: {searchResult.data.icNumber}</p>
                      {searchResult.data.phoneNumber && (
                        <p className="text-sm text-muted-foreground">{searchResult.data.phoneNumber}</p>
                      )}
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Found in existing records
                      </p>
                    </div>
                  </div>
                )}

                {searchResult.type === 'not-found' && (
                  <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-white">
                      <UserPlus className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">No existing record found</p>
                      <p className="text-sm text-muted-foreground">
                        Please fill in the details below to add this family member
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Only show form fields after search and not exists */}
            {hasSearched && searchResult?.type !== 'exists' && (
              <>
                {/* Name */}
                {searchResult?.type === 'not-found' ? (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Enter full name"
                      required
                      autoFocus
                    />
                  </div>
                ) : searchResult?.type === 'non-registered' ? (
                  <div className="flex flex-col gap-2">
                    <Label>Name</Label>
                    <Input
                      value={searchResult.data.name}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Label>Name</Label>
                    <Input
                      value={searchResult?.data.name}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                )}

                {/* Phone Number */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    defaultValue={searchResult?.type === 'non-registered' ? searchResult.data.phoneNumber || '' : ''}
                    placeholder="e.g., 012-3456789"
                    disabled={!showEditableFields && searchResult?.type === 'registered'}
                    className={showEditableFields || searchResult?.type !== 'registered' ? '' : 'bg-muted'}
                  />
                </div>

                {/* Address */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    defaultValue={searchResult?.type === 'non-registered' ? searchResult.data.address || '' : ''}
                    placeholder="Enter full address"
                    disabled={!showEditableFields && searchResult?.type === 'registered'}
                    className={showEditableFields || searchResult?.type !== 'registered' ? '' : 'bg-muted'}
                  />
                </div>

                {/* Relationship */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="relation">Relationship *</Label>
                  <Select
                    name="relation"
                    value={relation}
                    onValueChange={(value) => setRelation(value as FamilyRelationType)}
                    required
                  >
                    <SelectTrigger id="relation">
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(FamilyRelation).map((rel) => (
                        <SelectItem key={rel} value={rel}>
                          {rel.toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.navigate({ to: '/app/family' })}
                    disabled={createMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Add Family Member
                  </Button>
                </div>
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
