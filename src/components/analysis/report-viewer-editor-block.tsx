import { forwardRef } from 'react'
import { ReportEditorBlock, type ReportEditorHandle, type ReportEditorBlockProps } from '@/components/analysis/report-editor-block'

type Props = ReportEditorBlockProps

export const ReportViewerEditorBlock = forwardRef<ReportEditorHandle, Props>(function ReportViewerEditorBlock(props, ref) {
  return <ReportEditorBlock ref={ref} {...props} />
})

export type { ReportEditorHandle }
