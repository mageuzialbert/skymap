'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Loader2, Printer, Receipt } from 'lucide-react';
import Sheet from '@/components/common/Sheet';
import { supabase } from '@/lib/supabase';
import { useT } from '@/lib/i18n';
import InvoiceDocument from '@/components/invoices/InvoiceDocument';
import {
  INVOICE_DOT,
  INVOICE_TEXT,
  invoiceStatusLabelKey,
  invoiceTone,
} from '@/lib/invoiceStatus';
import { cardClass, pageTitle, pillPrimary } from '@/lib/ui';

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

interface InvoiceItem {
  id: string;
  delivery_id: string | null;
  amount: number;
  description: string | null;
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

export default function BusinessInvoicesPage() {
  const t = useT();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [paymentInstructions, setPaymentInstructions] = useState<PaymentInstructions | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get business ID
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!business) return;

      // Get invoices
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('business_id', business.id)
        .order('generated_at', { ascending: false });

      // Ensure invoice_type is set for existing invoices
      if (data) {
        data.forEach((inv: any) => {
          if (!inv.invoice_type) {
            inv.invoice_type = 'INVOICE';
          }
        });
      }

      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error('Error loading invoices:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadInvoiceDetails(invoice: Invoice) {
    setSelectedInvoice(invoice);
    setLoadingInvoice(true);
    setInvoiceItems([]);
    setCompanyProfile(null);
    setBusiness(null);
    setPaymentInstructions(null);

    try {
      // Get business ID first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: businessData } = await supabase
        .from('businesses')
        .select('id, name, phone, address, city, postal_code')
        .eq('user_id', user.id)
        .single();

      if (businessData) {
        setBusiness(businessData);
      }

      // Load invoice items with delivery details
      const { data: items, error: itemsError } = await supabase
        .from('invoice_items')
        .select(`
          *,
          deliveries (
            pickup_name,
            pickup_address,
            dropoff_name,
            dropoff_address,
            package_description,
            pickup_district:pickup_district_id (name),
            dropoff_district:dropoff_district_id (name)
          )
        `)
        .eq('invoice_id', invoice.id)
        .order('created_at', { ascending: true });

      if (itemsError) throw itemsError;
      setInvoiceItems(items || []);

      // Load company profile
      const { data: profile, error: profileError } = await supabase
        .from('company_profile')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (!profileError && profile) {
        setCompanyProfile(profile);
      }

      // Load payment instructions
      const { data: instructions, error: instructionsError } = await supabase
        .from('payment_instructions')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000002')
        .single();

      if (!instructionsError && instructions) {
        setPaymentInstructions(instructions);
      }
    } catch (err) {
      console.error('Error loading invoice details:', err);
    } finally {
      setLoadingInvoice(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  function closeInvoice() {
    setSelectedInvoice(null);
    setInvoiceItems([]);
    setCompanyProfile(null);
    setBusiness(null);
    setPaymentInstructions(null);
  }

  return (
    <div>
      <h1 className={`${pageTitle} mb-4`}>{t('business.invoices.title')}</h1>

      {invoices.length === 0 ? (
        <div className={`${cardClass} px-6 py-12 text-center`}>
          <Receipt className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="mx-auto max-w-xs text-[15px] text-gray-500">
            {t('business.invoices.empty')}
          </p>
        </div>
      ) : (
        <div className={`${cardClass} overflow-hidden`}>
          <ul>
            {invoices.map((invoice, i) => {
              const tone = invoiceTone(invoice.status);
              return (
                <li key={invoice.id}>
                  <button
                    type="button"
                    onClick={() => loadInvoiceDetails(invoice)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="min-w-0 flex-1 truncate font-mono text-[15px] font-semibold text-gray-900">
                          {invoice.invoice_number}
                        </span>
                        <span className="shrink-0 text-[15px] font-semibold text-gray-900">
                          TZS {invoice.total_amount.toLocaleString()}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] text-gray-500">
                        {new Date(invoice.week_start).toLocaleDateString()} –{' '}
                        {new Date(invoice.week_end).toLocaleDateString()}
                      </span>
                      <span
                        className={`mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium ${INVOICE_TEXT[tone]}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${INVOICE_DOT[tone]}`} />
                        {t(invoiceStatusLabelKey(invoice.status))}
                      </span>
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />
                  </button>
                  {i < invoices.length - 1 && <span className="block h-px bg-gray-100" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Sheet
        open={selectedInvoice !== null}
        onClose={closeInvoice}
        title={t('business.invoices.details')}
        headerRight={
          selectedInvoice ? (
            <button
              type="button"
              onClick={() =>
                router.push(`/dashboard/business/invoices/${selectedInvoice.id}/print`)
              }
              className={`${pillPrimary} h-10 px-4 text-[13px]`}
            >
              <Printer className="h-4 w-4" />
              {t('business.invoices.printPdf')}
            </button>
          ) : undefined
        }
      >
        {loadingInvoice || !selectedInvoice ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="p-4">
            <InvoiceDocument
              invoice={selectedInvoice}
              invoiceItems={invoiceItems}
              companyProfile={companyProfile}
              business={business}
              paymentInstructions={paymentInstructions}
            />
          </div>
        )}
      </Sheet>
    </div>
  );
}
