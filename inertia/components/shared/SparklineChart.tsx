import { LineChart, Line, YAxis } from 'recharts'

interface SparklineChartProps {
  data: { date: string; value: number }[]
  width?: number
  height?: number
  color?: string
}

export default function SparklineChart({
  data,
  width = 200,
  height = 80,
  color = 'currentColor',
}: SparklineChartProps) {
  return (
    <LineChart width={width} height={height} data={data}>
      <YAxis domain={['dataMin', 'dataMax']} hide />
      <Line type="monotone" dataKey="value" stroke={color} dot={false} strokeWidth={2} />
    </LineChart>
  )
}
