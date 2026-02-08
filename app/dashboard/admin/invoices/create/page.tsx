"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Calendar, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Business {
  id: string;
  name: string;
  phone: string;
}

interface Charge {
  id: string;
  delivery_id: string | null;
  amount: number;
  description: string | null;
  created_at: string;
}

// Represents a billable item - either from charges table or from delivery with delivery_fee
interface BillableItem {
  id: string;
  delivery_id: string | null;
  amount: number;
  description: string | null;
  created_at: string;
  source: "charge" | "delivery"; // Track where it came from
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [billableItems, setBillableItems] = useState<BillableItem[]>([]);
  const [loadingCharges, setLoadingCharges] = useState(false);

  const [formData, setFormData] = useState({
    business_id: "",
    start_date: "",
    end_date: "",
    invoice_type: "INVOICE",
    due_date: "",
    notes: "",
  });

  useEffect(() => {
    loadBusinesses();
    // Set default dates (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    setFormData((prev) => ({
      ...prev,
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
    }));
  }, []);

  useEffect(() => {
    if (formData.business_id && formData.start_date && formData.end_date) {
      loadBillableItems();
    } else {
      setBillableItems([]);
    }
  }, [formData.business_id, formData.start_date, formData.end_date]);

  async function loadBusinesses() {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, phone")
        .eq("active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      setBusinesses(data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load businesses",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadBillableItems() {
    if (!formData.business_id || !formData.start_date || !formData.end_date)
      return;

    setLoadingCharges(true);
    try {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      endDate.setHours(23, 59, 59, 999);

      // Fetch existing charges
      const { data: charges, error: chargesError } = await supabase
        .from("charges")
        .select("*")
        .eq("business_id", formData.business_id)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: true });

      if (chargesError) throw chargesError;

      // Fetch deliveries with delivery_fee > 0 that might not have charges
      const { data: deliveries, error: deliveriesError } = await supabase
        .from("deliveries")
        .select("id, delivery_fee, created_at, dropoff_name")
        .eq("business_id", formData.business_id)
        .gt("delivery_fee", 0)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: true });

      if (deliveriesError) throw deliveriesError;

      // Get delivery IDs that already have charges
      const chargedDeliveryIds = new Set(
        (charges || []).filter((c) => c.delivery_id).map((c) => c.delivery_id),
      );

      // Convert charges to billable items
      const chargeItems: BillableItem[] = (charges || []).map((charge) => ({
        id: charge.id,
        delivery_id: charge.delivery_id,
        amount: charge.amount,
        description: charge.description,
        created_at: charge.created_at,
        source: "charge" as const,
      }));

      // Convert unbilled deliveries to billable items
      const unbilledDeliveryItems: BillableItem[] = (deliveries || [])
        .filter((d) => !chargedDeliveryIds.has(d.id))
        .map((delivery) => ({
          id: `delivery-${delivery.id}`,
          delivery_id: delivery.id,
          amount: delivery.delivery_fee,
          description: `Delivery fee - ${delivery.dropoff_name}`,
          created_at: delivery.created_at,
          source: "delivery" as const,
        }));

      // Combine and sort by date
      const allItems = [...chargeItems, ...unbilledDeliveryItems].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

      setBillableItems(allItems);
    } catch (err) {
      console.error("Error loading billable items:", err);
      setBillableItems([]);
    } finally {
      setLoadingCharges(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const endpoint =
        formData.invoice_type === "PROFORMA"
          ? "/api/admin/invoices/proforma"
          : "/api/admin/invoices";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: formData.business_id,
          start_date: formData.start_date,
          end_date: formData.end_date,
          invoice_type: formData.invoice_type,
          due_date: formData.due_date || null,
          notes: formData.notes || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create invoice");
      }

      router.push("/dashboard/admin/invoices");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setSubmitting(false);
    }
  }

  const totalAmount = billableItems.reduce(
    (sum, item) => sum + parseFloat(item.amount.toString()),
    0,
  );

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
        <h1 className="text-3xl font-bold text-gray-900">Create Invoice</h1>
        <p className="text-gray-600 mt-2">
          Create a new invoice or proforma invoice for a business
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Invoice Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business *
              </label>
              <select
                value={formData.business_id}
                onChange={(e) =>
                  setFormData({ ...formData, business_id: e.target.value })
                }
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select Business</option>
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name} ({business.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Type *
              </label>
              <select
                value={formData.invoice_type}
                onChange={(e) =>
                  setFormData({ ...formData, invoice_type: e.target.value })
                }
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="INVOICE">Invoice</option>
                <option value="PROFORMA">Proforma Invoice</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) =>
                  setFormData({ ...formData, start_date: e.target.value })
                }
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) =>
                  setFormData({ ...formData, end_date: e.target.value })
                }
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) =>
                  setFormData({ ...formData, due_date: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes / Terms
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Additional notes or terms for this invoice..."
            />
          </div>
        </div>

        {/* Charges Preview */}
        {formData.business_id && formData.start_date && formData.end_date && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Charges Preview</h2>
            {loadingCharges ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : billableItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No billable items found in the selected date range</p>
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto mb-4">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Description
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Source
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {billableItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(item.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {item.description || "Delivery charge"}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                item.source === "charge"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {item.source === "charge" ? "Charge" : "Unbilled"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            TZS {item.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-3 text-sm font-bold text-gray-900"
                        >
                          Total
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                          TZS {totalAmount.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="text-sm text-gray-600">
                  {billableItems.length} item
                  {billableItems.length !== 1 ? "s" : ""} will be included in
                  this invoice
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || billableItems.length === 0}
            className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>
                  Create{" "}
                  {formData.invoice_type === "PROFORMA" ? "Proforma " : ""}
                  Invoice
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
