'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, X, FileText, Printer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import InvoiceDocument from '@/components/invoices/InvoiceDocument';

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

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PROFORMA: 'bg-purple-100 text-purple-800',
  SENT: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function BusinessInvoicesPage() {
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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
        <p className="text-gray-600 mt-2">
          View and manage your weekly invoices
        </p>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Generated
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No invoices found. Invoices are generated weekly for completed deliveries.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr 
                    key={invoice.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => loadInvoiceDetails(invoice)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(invoice.week_start).toLocaleDateString()} -{' '}
                      {new Date(invoice.week_end).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      TZS {invoice.total_amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          statusColors[invoice.status] || statusColors.DRAFT
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.generated_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-2xl font-bold text-gray-900">Invoice Details</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push(`/dashboard/business/invoices/${selectedInvoice.id}/print`)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Print / PDF
                </button>
                <button
                  onClick={() => {
                    setSelectedInvoice(null);
                    setInvoiceItems([]);
                    setCompanyProfile(null);
                    setBusiness(null);
                    setPaymentInstructions(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {loadingInvoice ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
              </div>
            ) : (
              <div className="p-6">
                <InvoiceDocument
                  invoice={selectedInvoice}
                  invoiceItems={invoiceItems}
                  companyProfile={companyProfile}
                  business={business}
                  paymentInstructions={paymentInstructions}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
