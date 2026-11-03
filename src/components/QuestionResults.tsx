import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { QuestionResult } from '../lib/results'

export function QuestionResults({
  question,
  index,
  total,
}: {
  question: QuestionResult
  index: number
  total: number
}) {
  const unanswered = total - question.response_count
  const data = question.choices.map((choice, index) => ({
    ...choice,
    label: `Choice ${index + 1}`,
  }))
  return (
    <section
      className="min-w-0 rounded-xl border border-slate-300 bg-white p-5 sm:p-7"
      aria-labelledby={`question-title-${question.question_id}`}
    >
      <h2
        id={`question-title-${question.question_id}`}
        className="break-words text-xl font-semibold"
      >
        {index + 1}. {question.question_text}
      </h2>
      <p className="mt-3 text-slate-600">
        {question.response_count.toLocaleString()} answered ·{' '}
        {unanswered.toLocaleString()} unanswered
      </p>
      {question.response_count === 0 ? (
        <p className="mt-5 text-slate-600">No answers for this question yet.</p>
      ) : (
        <figure className="mt-6">
          <figcaption className="mb-3 text-sm font-medium text-slate-600">
            Response counts by choice. Full choice text and percentages appear
            below.
          </figcaption>
          <div
            className="h-auto min-w-0"
            style={{ height: Math.max(160, data.length * 44) }}
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 8, right: 40, bottom: 8, left: 0 }}
                accessibilityLayer
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  domain={[0, Math.max(total, 1)]}
                />
                <YAxis
                  dataKey="label"
                  type="category"
                  width={76}
                  interval={0}
                />
                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                <Bar
                  dataKey="count"
                  name="Responses"
                  fill="#115e59"
                  isAnimationActive={false}
                  maxBarSize={28}
                >
                  <LabelList dataKey="count" position="right" fill="#0f172a" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </figure>
      )}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-left text-sm sm:text-base">
          <caption className="sr-only">
            Counts and percentages for question {index + 1}:{' '}
            {question.question_text}
          </caption>
          <thead>
            <tr className="border-b border-slate-300">
              <th scope="col" className="w-3/5 py-3 pr-3">
                Choice
              </th>
              <th scope="col" className="py-3 text-right">
                Count
              </th>
              <th scope="col" className="py-3 pl-3 text-right">
                Percent
              </th>
            </tr>
          </thead>
          <tbody>
            {question.choices.map((choice, index) => (
              <tr key={choice.choice_id} className="border-b border-slate-200">
                <th scope="row" className="break-words py-4 pr-3 font-normal">
                  <span className="font-medium">{index + 1}. </span>
                  {choice.choice_text}
                </th>
                <td className="py-4 text-right tabular-nums">
                  {choice.count.toLocaleString()}
                </td>
                <td className="py-4 pl-3 text-right tabular-nums">
                  {choice.percentage.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
