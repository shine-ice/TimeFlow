export function normalizeInstant(value: string): string {
  return new Date(value).toISOString();
}
