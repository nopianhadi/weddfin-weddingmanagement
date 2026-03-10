export const formatIdNumber = (value: number) => {
    if (!Number.isFinite(value)) return '';
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value);
};

export const parseIdNumber = (input: string, opts?: { allowNegative?: boolean }) => {
    const allowNegative = opts?.allowNegative ?? false;
    const trimmed = (input ?? '').trim();
    if (trimmed === '') return '';

    let sign = '';
    let body = trimmed;

    if (allowNegative && body.startsWith('-')) {
        sign = '-';
        body = body.slice(1);
    }

    const digits = body.replace(/\D+/g, '');
    if (digits === '') return sign ? '-' : '';

    const normalized = digits.replace(/^0+(\d)/, '$1');
    return sign + normalized;
};

export const formatIdFromRaw = (raw: string, opts?: { allowNegative?: boolean }) => {
    const allowNegative = opts?.allowNegative ?? false;
    if (!raw) return '';
    if (allowNegative && raw === '-') return '-';

    const negative = allowNegative && raw.startsWith('-');
    const digits = negative ? raw.slice(1) : raw;
    const n = Number(digits);
    if (!Number.isFinite(n)) return '';

    const formatted = formatIdNumber(n);
    return negative ? `-${formatted}` : formatted;
};
