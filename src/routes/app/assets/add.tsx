import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { Package, DollarSign, FileText, Link, Loader2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AssetType, type AssetType as AssetTypeEnum } from '@/generated/prisma/enums'

export const Route = createFileRoute('/app/assets/add')({
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    type: '' as AssetTypeEnum | '',
    description: '',
    value: '',
    documentUrl: '',
  })

  // Create asset mutation
  const createAssetMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/asset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          description: formData.description || undefined,
          value: formData.value,
          documentUrl: formData.documentUrl || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create asset')
      }

      return data
    },
    onSuccess: () => {
      toast.success('Asset created successfully')
      router.navigate({ to: '/app/assets' })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create asset')
    },
  })

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }

    if (!formData.type) {
      toast.error('Asset type is required')
      return
    }

    if (!formData.value.trim()) {
      toast.error('Value is required')
      return
    }

    const numValue = parseFloat(formData.value)
    if (isNaN(numValue) || numValue < 0) {
      toast.error('Value must be a positive number')
      return
    }

    createAssetMutation.mutate()
  }

  const handleCancel = () => {
    router.navigate({ to: '/app/assets' })
  }

  // Helper function to format asset type for display
  const formatAssetType = (type: string) => {
    return type.charAt(0) + type.slice(1).toLowerCase()
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Add Asset</CardTitle>
              <CardDescription>Add a new asset to your portfolio</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={createAssetMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FieldGroup className="gap-6">
              {/* Name Field */}
              <Field className="group">
                <FieldLabel htmlFor="name" className="text-sm font-medium">
                  Asset Name <span className="text-destructive">*</span>
                </FieldLabel>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter asset name"
                    className="h-10 pl-10"
                  />
                </div>
              </Field>

              {/* Asset Type Field */}
              <Field className="group">
                <FieldLabel htmlFor="type" className="text-sm font-medium">
                  Asset Type <span className="text-destructive">*</span>
                </FieldLabel>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleInputChange('type', value as AssetTypeEnum)}
                >
                  <SelectTrigger id="type" className="h-10">
                    <SelectValue placeholder="Select asset type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(AssetType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {formatAssetType(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {/* Value Field */}
              <Field className="group">
                <FieldLabel htmlFor="value" className="text-sm font-medium">
                  Value <span className="text-destructive">*</span>
                </FieldLabel>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.value}
                    onChange={(e) => handleInputChange('value', e.target.value)}
                    placeholder="0.00"
                    className="h-10 pl-10"
                  />
                </div>
              </Field>

              {/* Description Field */}
              <Field className="group">
                <FieldLabel htmlFor="description" className="text-sm font-medium">
                  Description
                </FieldLabel>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="description"
                    type="text"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Enter asset description (optional)"
                    className="h-10 pl-10"
                  />
                </div>
              </Field>

              {/* Document URL Field */}
              <Field className="group">
                <FieldLabel htmlFor="documentUrl" className="text-sm font-medium">
                  Document URL
                </FieldLabel>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="documentUrl"
                    type="url"
                    value={formData.documentUrl}
                    onChange={(e) => handleInputChange('documentUrl', e.target.value)}
                    placeholder="https://example.com/document.pdf"
                    className="h-10 pl-10"
                  />
                </div>
              </Field>
            </FieldGroup>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={createAssetMutation.isPending}
            >
              {createAssetMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Asset'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
