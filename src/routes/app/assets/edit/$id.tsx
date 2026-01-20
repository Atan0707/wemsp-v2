import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Package, DollarSign, FileText, Loader2, X, ExternalLink, RefreshCw } from 'lucide-react'
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
import type { Asset } from '@/components/assets/assets-table'

export const Route = createFileRoute('/app/assets/edit/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { id } = Route.useParams()

  const [formData, setFormData] = useState({
    name: '',
    type: '' as AssetTypeEnum | '',
    description: '',
    value: '',
  })
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [showReplaceDocument, setShowReplaceDocument] = useState(false)

  // Fetch existing asset
  const { data: assetData, isLoading: assetLoading } = useQuery<{ asset: Asset }>({
    queryKey: ['asset', id],
    queryFn: async () => {
      const response = await fetch(`/api/asset/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch asset')
      }
      return response.json()
    },
    enabled: !!id,
  })

  const asset = assetData?.asset

  // Initialize form data when asset loads
  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name,
        type: asset.type as AssetTypeEnum,
        description: asset.description || '',
        value: asset.value.toString(),
      })
    }
  }, [asset])

  // Update asset mutation
  const updateAssetMutation = useMutation({
    mutationFn: async () => {
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

      const response = await fetch(`/api/asset/${id}`, {
        method: 'PUT',
        body: formDataToSend,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update asset')
      }

      return data
    },
    onSuccess: () => {
      toast.success('Asset updated successfully')
      queryClient.invalidateQueries({ queryKey: ['asset', id] })
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      router.navigate({ to: '/app/assets' })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update asset')
    },
  })

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const allowedTypes = ['application/pdf']

      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type. Please upload PDF files.')
        return
      }

      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        toast.error('File size exceeds 10MB limit')
        return
      }

      setDocumentFile(file)
      setShowReplaceDocument(false)
    }
  }

  const handleCancelReplace = () => {
    setShowReplaceDocument(false)
    setDocumentFile(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

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

    updateAssetMutation.mutate()
  }

  const handleCancel = () => {
    router.navigate({ to: '/app/assets' })
  }

  const formatAssetType = (type: string) => {
    return type.charAt(0) + type.slice(1).toLowerCase()
  }

  // Loading state
  if (assetLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Asset not found
  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Asset Not Found</h2>
        <p className="text-muted-foreground max-w-md">
          The asset you're looking for doesn't exist or you don't have permission to edit it.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Edit Asset</CardTitle>
              <CardDescription>Update your asset information</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={updateAssetMutation.isPending}
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

              {/* Document Field */}
              <Field className="group">
                <FieldLabel className="text-sm font-medium">Document</FieldLabel>

                {/* Show current document if exists and not replacing */}
                {asset.documentUrl && !showReplaceDocument && !documentFile ? (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                    <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Current document</p>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => window.open(asset.documentUrl!, '_blank')}
                      >
                        View document
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReplaceDocument(true)}
                      className="shrink-0"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Replace
                    </Button>
                  </div>
                ) : documentFile ? (
                  /* Show new selected file */
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
                      onClick={handleCancelReplace}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  /* Show file input */
                  <div className="relative">
                    <Input
                      id="document"
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf"
                      className="h-10 file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-muted file:text-muted-foreground hover:file:bg-muted/80"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload PDF files (max 10MB). This will replace the current document.
                    </p>
                  </div>
                )}
              </Field>
            </FieldGroup>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={updateAssetMutation.isPending}
            >
              {updateAssetMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
