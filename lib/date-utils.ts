export interface ParsedSaleDateResult {
  valid: boolean;
  iso?: string;
  error?: string;
}

const INPUT_REGEX = /^\d{1,2}\/\d{1,2}(\/\d{4})?$/;

export function parseSaleDateInputToISO(input: string): ParsedSaleDateResult {
  const trimmed = (input || '').trim();
  if (!trimmed) return { valid: false, error: 'Fecha vacía' };
  if (!INPUT_REGEX.test(trimmed)) {
    return { valid: false, error: 'Formato inválido. Usa dd/mm o dd/mm/aaaa' };
  }

  const parts = trimmed.split('/');
  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = parts[2] ? Number(parts[2]) : new Date().getFullYear();

  if (month < 1 || month > 12) return { valid: false, error: 'Mes inválido' };
  if (day < 1 || day > 31) return { valid: false, error: 'Día inválido' };
  if (parts[2] && (year < 1900 || year > 9999)) return { valid: false, error: 'Año inválido' };

  // Crear fecha al mediodía local para evitar desbordes de zona horaria
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  // Validar que la fecha creada coincide con los valores ingresados
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return { valid: false, error: 'Fecha inválida' };
  }

  const iso = date.toISOString();
  return { valid: true, iso };
}

export function formatISOToDDMMYYYY(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear());
  return `${d}/${m}/${y}`;
}