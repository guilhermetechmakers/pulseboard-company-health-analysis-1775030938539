import { ImagePlus } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface ExportBrandingUploaderProps {
  onFileChange: (files: FileList | null) => void
  className?: string
  disabled?: boolean
}

export function ExportBrandingUploader({ onFileChange, className, disabled }: ExportBrandingUploaderProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label className="flex items-center gap-2">
        <ImagePlus className="h-4 w-4" aria-hidden />
        Logo file
      </Label>
      <Input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        disabled={disabled}
        onChange={(e) => onFileChange(e.target.files)}
        aria-label="Upload company logo for PDF and HTML exports"
      />
      <p className="text-xs text-muted-foreground">
        PNG, JPG, WebP, or SVG. Stored privately. Turn on “Include logo in export” only after a logo is saved.
      </p>
    </div>
  )
}
