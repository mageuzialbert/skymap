/**
 * Normalize a Tanzanian phone number to international +255XXXXXXXXX form.
 *
 * Accepts: "0712345678", "712345678", "255712345678", "+255712345678",
 * and the same with spaces/dashes. A leading 0 is correctly dropped (so
 * "0712345678" -> "+255712345678", not "+2550712345678").
 */
export function normalizeTzPhone(input: string): string {
  const raw = (input || '').trim();
  const hadPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');

  if (!digits) return '';
  if (digits.startsWith('255')) return '+' + digits;          // 255XXXXXXXXX / +255XXXXXXXXX
  if (digits.startsWith('0')) return '+255' + digits.slice(1); // 0XXXXXXXXX  -> +255XXXXXXXXX
  if (hadPlus) return '+' + digits;                            // already international, non-255
  return '+255' + digits;                                      // bare local number
}
