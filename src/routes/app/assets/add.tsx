import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { Package, DollarSign, FileText, Loader2, X } from 'lucide-react'
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
  })
  const [documentFile, setDocumentFile] = useState<File | null>(null)

  // Create asset mutation
  const createAssetMutation = useMutation({
    mutationFn: async () => {
      // Create FormData to handle file upload
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      formDataToSend.append('type', formData.type)
      if (formData.description) {
        formDataToSend.append('description', formData.description)
      }
      formDataToSend.append('value', formData.value)
      if (documentFile) {
        formDataToSend.append('document', documentFile)
      }

      const response = await fetch('/api/asset', {
        method: 'POST',
        body: formDataToSend,
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type (accept PDF and images)
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp'
      ]

      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type. Please upload PDF or image files.')
        return
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        toast.error('File size exceeds 10MB limit')
        return
      }

      setDocumentFile(file)
    }
  }

  const handleRemoveFile = () => {
    setDocumentFile(null)
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

              {/* Document Upload Field */}
              <Field className="group">
                <FieldLabel htmlFor="document" className="text-sm font-medium">
                  Document
                </FieldLabel>
                {documentFile ? (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                    <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{documentFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(documentFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      id="document"
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      className="h-10 file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-muted file:text-muted-foreground hover:file:bg-muted/80"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload PDF or image files (max 10MB)
                    </p>
                  </div>
                )}
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
