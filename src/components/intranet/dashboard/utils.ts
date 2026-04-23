import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  isBefore,
} from 'date-fns'

export const getEvolutionRange = (filter: string) => {
  const now = new Date()
  switch (filter) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) }
    case 'week':
      return {
        start: startOfWeek(now, { weekStartsOn: 0 }),
        end: endOfWeek(now, { weekStartsOn: 0 }),
      }
    case 'last7':
      return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) }
    case 'last30':
      return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) }
    default:
      return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) }
  }
}

export const getForecastRange = (filter: string) => {
  const now = new Date()
  switch (filter) {
    case 'next3':
      return { start: startOfDay(now), end: endOfDay(addDays(now, 3)) }
    case 'next7':
      return { start: startOfDay(now), end: endOfDay(addDays(now, 7)) }
    case 'next30':
      return { start: startOfDay(now), end: endOfDay(addDays(now, 30)) }
    default:
      return { start: startOfDay(now), end: endOfDay(addDays(now, 7)) }
  }
}

export const generateDaysArray = (start: Date, end: Date) => {
  const days = []
  let curr = new Date(start)
  while (curr <= end) {
    days.push(format(curr, 'yyyy-MM-dd'))
    curr = addDays(curr, 1)
  }
  return days
}

export const getTaskStatus = (task: any) => {
  if (task.status === 'completed') return 'Concluído'
  if (task.due_date && isBefore(new Date(task.due_date), new Date())) return 'Atrasado'
  return 'Em andamento'
}

export const getEventStatus = (event: any) => {
  if (event.start_date && isBefore(new Date(event.start_date), new Date())) return 'Concluído'
  return 'Em andamento'
}
