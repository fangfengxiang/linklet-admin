import dayjs from 'dayjs';

export const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

/** Display timestamps in the browser's local time; retain the original instant. */
export function DateTime({ value, empty = '—' }: { value?: string | null; empty?: string }) {
  if (!value) return <>{empty}</>;
  const parsed = dayjs(value);
  if (!parsed.isValid()) return <>{empty}</>;
  const text = parsed.format(DATE_TIME_FORMAT);
  return <time dateTime={value} title={text} style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{text}</time>;
}
