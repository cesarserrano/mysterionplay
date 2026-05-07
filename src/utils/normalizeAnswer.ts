export function normalizeAnswer(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

export function isAcceptedAnswer(input: string, answer: string, aliases: string[]) {
  const normalizedInput = normalizeAnswer(input)
  if (!normalizedInput) {
    return false
  }

  const accepted = [answer, ...aliases].map(normalizeAnswer)
  return accepted.includes(normalizedInput)
}
