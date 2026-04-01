import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ProgressStepper } from '@/components/analysis/progress-stepper'

export type PipelineStep = { id: string; label: string }

export interface GenerateAnalysisStatusProps {
  steps: PipelineStep[]
  activeIndex: number
  progressValue: number
  isVisible: boolean
  footnote?: string
}

export function GenerateAnalysisStatus({
  steps,
  activeIndex,
  progressValue,
  isVisible,
  footnote = 'Estimated time depends on model load. You can leave this page — the report will appear in history when complete.',
}: GenerateAnalysisStatusProps) {
  if (!isVisible) return null

  return (
    <Card className="space-y-4 p-4 animate-fade-in-up motion-reduce:animate-none">
      <ProgressStepper steps={steps} activeIndex={activeIndex} />
      <div className="space-y-2">
        <Progress value={progressValue} />
        <p className="text-xs text-muted-foreground motion-reduce:transition-none">{footnote}</p>
      </div>
    </Card>
  )
}
