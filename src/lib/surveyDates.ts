// Calendar-day comparisons match the local date shown on dashboard cards,
// avoiding UTC-midnight and daylight-saving boundary shifts.
const localFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  numberingSystem: 'latn',
})
export function surveyDateKey(
  timestamp: string,
  timeZone?: string,
): string | null {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return null
  const formatter = timeZone
    ? new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        numberingSystem: 'latn',
        timeZone,
      })
    : localFormatter
  const parts = formatter.formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${part('year').padStart(4, '0')}-${part('month')}-${part('day')}`
}
export function matchesSurveyDates(
  timestamp: string,
  from: string,
  through: string,
  timeZone?: string,
) {
  if (!from && !through) return true
  const day = surveyDateKey(timestamp, timeZone)
  return day !== null && (!from || day >= from) && (!through || day <= through)
}
