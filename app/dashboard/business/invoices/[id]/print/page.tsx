'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import InvoiceDocument from '@/components/invoices/InvoiceDocument';

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

export default function InvoicePrintPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [paymentInstructions, setPaymentInstructions] = useState<PaymentInstructions | null>(null);

  useEffect(() => {
    loadInvoiceData();
  }, [invoiceId]);

  async function loadInvoiceData() {
    try {
      // Load invoice with business
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          businesses (
            id,
            name,
            phone,
            address,
            city,
            postal_code
          )
        `)
        .eq('id', invoiceId)
        .single();

      if (invoiceError) throw invoiceError;
      setInvoice(invoiceData);
      setBusiness(invoiceData.businesses as Business);

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
        .eq('invoice_id', invoiceId)
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
      console.error('Error loading invoice:', err);
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Invoice not found</p>
          <button
            onClick={() => router.back()}
            className="text-primary hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Print Header - Hidden when printing */}
      <div className="bg-white border-b border-gray-200 p-4 print:hidden">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            <Printer className="w-5 h-5" />
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="py-8 print:py-0">
        <InvoiceDocument
          invoice={invoice}
          invoiceItems={invoiceItems}
          companyProfile={companyProfile}
          business={business}
          paymentInstructions={paymentInstructions}
        />
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:py-0 {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}
