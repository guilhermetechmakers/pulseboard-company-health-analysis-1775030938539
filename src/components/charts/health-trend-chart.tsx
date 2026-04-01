import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Card } from '@/components/ui/card'

interface Point {
  label: string
  score: number
}

const fallback: Point[] = [
  { label: 'Jan', score: 54 },
  { label: 'Feb', score: 61 },
  { label: 'Mar', score: 64 },
  { label: 'Apr', score: 69 },
]

export function HealthTrendChart({ data = fallback }: { data?: Point[] }) {
  return (
    <Card className="h-[300px]">
      <h3 className="mb-4">Health score trend</h3>
      <ResponsiveContainer width="100%" height="88%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="score" stroke="rgb(var(--primary))" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
