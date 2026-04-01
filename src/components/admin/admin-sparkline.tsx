import { useMemo } from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

export interface AdminSparklineProps {
  values: number[]
}

export function AdminSparkline({ values }: AdminSparklineProps) {
  const data = useMemo(() => {
    const v = Array.isArray(values) ? values : []
    return v.map((value, i) => ({ i, value }))
  }, [values])

  if (data.length < 2) {
    return <div className="h-10 w-full rounded-md bg-muted/50" />
  }

  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke="rgb(var(--primary))"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
