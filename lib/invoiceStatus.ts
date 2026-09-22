/**
 * How an invoice's status is shown.
 *
 * The sibling of lib/deliveryStatus.ts, for the app's other status vocabulary.
 * Three separate files each declared their own colour map and then rendered the
 * raw enum ("DRAFT", "PROFORMA") to customers.
 */

export type InvoiceTone = 'DRAFT' | 'OPEN' | 'PAID' | 'VOID';

export function invoiceTone(status: string): InvoiceTone {
  if (status === 'PAID') return 'PAID';
  if (status === 'CANCELLED') return 'VOID';
  if (status === 'SENT' || status === 'PROFORMA') return 'OPEN';
  return 'DRAFT';
}

export const INVOICE_DOT: Record<InvoiceTone, string> = {
  DRAFT: 'bg-gray-400',
  OPEN: 'bg-blue-500',
  PAID: 'bg-emerald-500',
  VOID: 'bg-red-500',
};

export const INVOICE_TEXT: Record<InvoiceTone, string> = {
  DRAFT: 'text-gray-600',
  OPEN: 'text-blue-700',
  PAID: 'text-emerald-700',
  VOID: 'text-red-700',
};

const STATUS_KEYS: Record<string, string> = {
  DRAFT: 'draft',
  PROFORMA: 'proforma',
  SENT: 'sent',
  PAID: 'paid',
  CANCELLED: 'cancelled',
};

/** i18n key for an invoice status label. */
export function invoiceStatusLabelKey(status: string): string {
  return `business.invoices.status.${STATUS_KEYS[status] || 'draft'}`;
}
