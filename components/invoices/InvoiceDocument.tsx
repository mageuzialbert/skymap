'use client';

import { useT } from '@/lib/i18n';

interface CompanyProfile {
  company_name: string;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  tax_id: string | null;
}

interface Business {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
}

interface InvoiceItem {
  id: string;
  description: string | null;
  amount: number;
  deliveries?: {
    pickup_name: string;
    pickup_address: string;
    dropoff_name: string;
    dropoff_address: string;
    package_description: string | null;
    pickup_district?: { name: string } | null;
    dropoff_district?: { name: string } | null;
  } | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  week_start: string;
  week_end: string;
  total_amount: number;
  status: string;
  invoice_type: string;
  generated_at: string;
  due_date: string | null;
  notes: string | null;
}

interface PaymentInstructions {
  title: string;
  instructions: string;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  swift_code: string | null;
  branch: string | null;
  active: boolean;
}

interface InvoiceDocumentProps {
  invoice: Invoice;
  invoiceItems: InvoiceItem[];
  companyProfile: CompanyProfile | null;
  business: Business | null;
  paymentInstructions: PaymentInstructions | null;
  showActions?: boolean;
  onPrint?: () => void;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PROFORMA: 'bg-purple-100 text-purple-800',
  SENT: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function InvoiceDocument({
  invoice,
  invoiceItems,
  companyProfile,
  business,
  paymentInstructions,
  showActions = false,
  onPrint,
}: InvoiceDocumentProps) {
  const t = useT();
  return (
    <div className="bg-white p-8 max-w-4xl mx-auto">
      {/* Header Section */}
      <div className="mb-8 pb-6 border-b-2 border-gray-300">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {companyProfile?.logo_url && (
              <img
                src={companyProfile.logo_url}
                alt={companyProfile.company_name}
                className="h-16 mb-3 object-contain"
              />
            )}
            <h1 className="text-xl font-bold text-gray-900 mb-1">
              {companyProfile?.company_name || 'The Skymap Logistics'}
            </h1>
            <div className="text-xs text-gray-600 space-y-0.5">
              {companyProfile?.address && (
                <p>
                  {companyProfile.address}
                  {companyProfile.city && `, ${companyProfile.city}`}
                  {companyProfile.region && `, ${companyProfile.region}`}
                  {companyProfile.postal_code && ` ${companyProfile.postal_code}`}
                </p>
              )}
              {companyProfile?.phone && <p>{t('components.invoice.phone')}: {companyProfile.phone}</p>}
              {companyProfile?.email && <p>{t('common.email')}: {companyProfile.email}</p>}
              {companyProfile?.tax_id && <p>{t('components.invoice.taxId')}: {companyProfile.tax_id}</p>}
            </div>
          </div>
          <div className="text-right">
            <div className="mb-4">
              <h2 className="text-4xl font-bold text-primary mb-1">
                {invoice.invoice_type === 'PROFORMA' ? t('components.invoice.proforma') : t('components.invoice.invoice')}
              </h2>
              {invoice.status === 'PROFORMA' && (
                <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                  {t('components.invoice.proforma')}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-700 space-y-1">
              <p>
                <span className="font-semibold">{t('components.invoice.invoiceNumber')}:</span>{' '}
                <span className="font-mono">{invoice.invoice_number}</span>
              </p>
              <p>
                <span className="font-semibold">{t('common.date')}:</span>{' '}
                {new Date(invoice.generated_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              {invoice.due_date && (
                <p>
                  <span className="font-semibold">{t('components.invoice.dueDate')}:</span>{' '}
                  {new Date(invoice.due_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}
              <p>
                <span className="font-semibold">{t('common.status')}:</span>{' '}
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    statusColors[invoice.status] || statusColors.DRAFT
                  }`}
                >
                  {invoice.status}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Billing To Section */}
      {business && (
        <div className="mb-8 grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">{t('components.invoice.billTo')}</h3>
            <div className="text-gray-900">
              <p className="font-semibold text-sm">{business.name}</p>
              {business.address && (
                <p className="text-xs mt-0.5">
                  {business.address}
                  {business.city && `, ${business.city}`}
                  {business.postal_code && ` ${business.postal_code}`}
                </p>
              )}
              {business.phone && <p className="text-xs mt-0.5">{t('components.invoice.phone')}: {business.phone}</p>}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">{t('components.invoice.period')}</h3>
            <div className="text-gray-900">
              <p className="text-sm">
                {new Date(invoice.week_start).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}{' '}
                -{' '}
                {new Date(invoice.week_end).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Items Table */}
      <div className="mb-8">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-primary text-white">
              <th className="px-6 py-4 text-left text-sm font-semibold uppercase">{t('components.financial.description')}</th>
              <th className="px-6 py-4 text-right text-sm font-semibold uppercase">{t('components.financial.amount')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoiceItems.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-6 py-8 text-center text-gray-500">
                  {t('components.invoice.noItems')}
                </td>
              </tr>
            ) : (
              invoiceItems.map((item, index) => {
                const delivery = item.deliveries;
                const pickupLocation = delivery?.pickup_district?.name || '';
                const dropoffLocation = delivery?.dropoff_district?.name || '';
                
                return (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="space-y-1">
                        {/* Main description */}
                        <div className="font-medium">
                          {item.description || t('components.invoice.deliveryService')}
                        </div>
                        
                        {/* Pickup and Dropoff details */}
                        {delivery && (
                          <div className="text-xs text-gray-600 space-y-0.5">
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-gray-700">{t('components.invoice.from')}:</span>
                              <span>
                                {delivery.pickup_name}
                                {pickupLocation && ` (${pickupLocation})`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-gray-700">{t('components.invoice.to')}:</span>
                              <span>
                                {delivery.dropoff_name}
                                {dropoffLocation && ` (${dropoffLocation})`}
                              </span>
                            </div>
                            
                            {/* Package description / Special instructions */}
                            {delivery.package_description && (
                              <div className="flex items-start gap-1 mt-1 pt-1 border-t border-gray-200">
                                <span className="font-medium text-gray-700">{t('components.invoice.items')}:</span>
                                <span className="text-gray-600">{delivery.package_description}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium align-top">
                      TZS {item.amount.toLocaleString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot className="bg-gray-100 border-t-2 border-gray-300">
            <tr>
              <td className="px-6 py-4 text-right text-lg font-bold text-gray-900">
                {t('components.invoice.totalAmount')}:
              </td>
              <td className="px-6 py-4 text-right text-lg font-bold text-primary">
                TZS {invoice.total_amount.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Notes Section */}
      {invoice.notes && (
        <div className="mb-6">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}

      {/* Payment Instructions */}
      {paymentInstructions && paymentInstructions.active && (
        <div className="mb-6">
          <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">
            {paymentInstructions.instructions}
          </p>
          {(paymentInstructions.bank_name ||
            paymentInstructions.account_name ||
            paymentInstructions.account_number) && (
            <div className="text-sm text-gray-700 space-y-1">
              {paymentInstructions.bank_name && (
                <p>{t('components.invoice.bank')}: {paymentInstructions.bank_name}</p>
              )}
              {paymentInstructions.account_name && (
                <p>{t('components.invoice.accountName')}: {paymentInstructions.account_name}</p>
              )}
              {paymentInstructions.account_number && (
                <p>{t('components.invoice.accountNumber')}: {paymentInstructions.account_number}</p>
              )}
              {paymentInstructions.swift_code && (
                <p>{t('components.invoice.swiftCode')}: {paymentInstructions.swift_code}</p>
              )}
              {paymentInstructions.branch && (
                <p>{t('components.invoice.branch')}: {paymentInstructions.branch}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-gray-300 text-center text-sm text-gray-600">
        <p className="mb-2">
          {t('components.invoice.thankYou')}
        </p>
        <p>
          &copy; {new Date().getFullYear()}{' '}
          {companyProfile?.company_name || 'The Skymap Logistics'}. {t('components.invoice.allRightsReserved')}
        </p>
      </div>

      {/* Print Actions (if needed) */}
      {showActions && onPrint && (
        <div className="mt-8 flex justify-end gap-3 print:hidden">
          <button
            onClick={onPrint}
            className="px-6 py-2 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors"
          >
            {t('components.invoice.printSave')}
          </button>
        </div>
      )}
    </div>
  );
}
