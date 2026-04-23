function pad(value: number) {
  return `${value}`.padStart(2, "0");
}

function normalizeDateString(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T00:00:00`;
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    return value.replace(" ", "T");
  }

  return value;
}

export function parseDateLike(value: Date | number | string | null | undefined) {
  if (!value && value !== 0) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const date = new Date(typeof value === "string" ? normalizeDateString(value.trim()) : value);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatLocalDate(value: Date | number | string | null | undefined = new Date()) {
  const date = parseDateLike(value);

  if (!date) {
    return "";
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatLocalDateTime(value: Date | number | string | null | undefined = new Date()) {
  const date = parseDateLike(value);

  if (!date) {
    return "";
  }

  return `${formatLocalDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
