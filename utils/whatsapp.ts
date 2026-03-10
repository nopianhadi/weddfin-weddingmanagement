export function cleanPhoneNumber(phone: string | undefined | null): string {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.slice(1);
    }
    return cleaned;
}

export function generateWhatsAppLink(phone: string | undefined | null, text: string): string {
    const cleanPhone = cleanPhoneNumber(phone);
    if (!cleanPhone) return '#';
    const encodedText = encodeURIComponent(text);
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}
