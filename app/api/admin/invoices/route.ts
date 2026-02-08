import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { requirePermission } from "@/lib/permissions-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

// Generate invoice number
function generateInvoiceNumber(invoiceType: string = "INVOICE"): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const prefix = invoiceType === "PROFORMA" ? "PRO" : "INV";
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `${prefix}-${year}-${month}${day}-${random}`;
}

// POST - Create invoice manually (Admin/Staff)
export async function POST(request: NextRequest) {
  try {
    // Check authentication and role
    const { user, role } = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission for invoices.create
    const { allowed, error: permError } = await requirePermission(
      user.id,
      role || "",
      "invoices.create",
    );
    if (!allowed) {
      return NextResponse.json(
        {
          error:
            permError || "Permission denied. Invoices create access required.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      business_id,
      start_date,
      end_date,
      invoice_type = "INVOICE",
      due_date,
      notes,
    } = body;

    // Validation
    if (!business_id || !start_date || !end_date) {
      return NextResponse.json(
        { error: "Business ID, start date, and end date are required" },
        { status: 400 },
      );
    }

    // Verify business exists
    const { data: business, error: businessError } = await supabaseAdmin
      .from("businesses")
      .select("id, name")
      .eq("id", business_id)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 },
      );
    }

    // Get charges and unbilled deliveries in date range
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    endDate.setHours(23, 59, 59, 999); // Include entire end date

    // Fetch existing charges
    const { data: existingCharges, error: chargesError } = await supabaseAdmin
      .from("charges")
      .select("*")
      .eq("business_id", business_id)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: true });

    if (chargesError) {
      return NextResponse.json(
        { error: `Failed to fetch charges: ${chargesError.message}` },
        { status: 500 },
      );
    }

    // Fetch deliveries with delivery_fee > 0 that might not have charges
    const { data: deliveries, error: deliveriesError } = await supabaseAdmin
      .from("deliveries")
      .select("id, delivery_fee, created_at, dropoff_name")
      .eq("business_id", business_id)
      .gt("delivery_fee", 0)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: true });

    if (deliveriesError) {
      return NextResponse.json(
        { error: `Failed to fetch deliveries: ${deliveriesError.message}` },
        { status: 500 },
      );
    }

    // Get delivery IDs that already have charges
    const chargedDeliveryIds = new Set(
      (existingCharges || [])
        .filter((c) => c.delivery_id)
        .map((c) => c.delivery_id),
    );

    // Find unbilled deliveries (have delivery_fee but no charge record)
    const unbilledDeliveries = (deliveries || []).filter(
      (d) => !chargedDeliveryIds.has(d.id),
    );

    // Create charges for unbilled deliveries
    const newCharges: {
      id: string;
      delivery_id: string;
      amount: number;
      description: string;
    }[] = [];
    if (unbilledDeliveries.length > 0) {
      const chargeRecords = unbilledDeliveries.map((delivery) => ({
        delivery_id: delivery.id,
        business_id: business_id,
        amount: delivery.delivery_fee,
        description: `Delivery fee - ${delivery.dropoff_name}`,
      }));

      const { data: insertedCharges, error: insertError } = await supabaseAdmin
        .from("charges")
        .insert(chargeRecords)
        .select();

      if (insertError) {
        return NextResponse.json(
          {
            error: `Failed to create charges for unbilled deliveries: ${insertError.message}`,
          },
          { status: 500 },
        );
      }

      newCharges.push(...(insertedCharges || []));
    }

    // Combine existing charges with newly created charges
    const allCharges = [...(existingCharges || []), ...newCharges];

    if (allCharges.length === 0) {
      return NextResponse.json(
        { error: "No billable items found in the selected date range" },
        { status: 400 },
      );
    }

    // Calculate total
    const totalAmount = allCharges.reduce((sum, charge) => {
      return sum + parseFloat(charge.amount.toString());
    }, 0);

    // Generate invoice number
    let invoiceNumber = generateInvoiceNumber(invoice_type);

    // Ensure uniqueness
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await supabaseAdmin
        .from("invoices")
        .select("id")
        .eq("invoice_number", invoiceNumber)
        .single();

      if (!existing) break;

      invoiceNumber = generateInvoiceNumber(invoice_type);
      attempts++;
    }

    // Determine status based on invoice type
    const status = invoice_type === "PROFORMA" ? "PROFORMA" : "DRAFT";

    // Create invoice
    const invoiceData = {
      business_id,
      week_start: start_date,
      week_end: end_date,
      invoice_number: invoiceNumber,
      total_amount: totalAmount,
      status,
      invoice_type: invoice_type,
      due_date: due_date || null,
      notes: notes || null,
      created_by: user.id,
    };
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .insert(invoiceData)
      .select()
      .single();

    if (invoiceError) {
      return NextResponse.json(
        { error: `Failed to create invoice: ${invoiceError.message}` },
        { status: 500 },
      );
    }

    // Create invoice items from all charges (existing + newly created)
    const invoiceItems = allCharges.map((charge) => ({
      invoice_id: invoice.id,
      delivery_id: charge.delivery_id,
      amount: charge.amount,
      description: charge.description || `Delivery charge`,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from("invoice_items")
      .insert(invoiceItems);

    if (itemsError) {
      // Rollback: delete invoice if items creation fails
      await supabaseAdmin.from("invoices").delete().eq("id", invoice.id);
      return NextResponse.json(
        { error: `Failed to create invoice items: ${itemsError.message}` },
        { status: 500 },
      );
    }

    // Fetch complete invoice with items
    const { data: completeInvoice, error: fetchError } = await supabaseAdmin
      .from("invoices")
      .select(
        `
        *,
        invoice_items (*)
      `,
      )
      .eq("id", invoice.id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: `Failed to fetch invoice: ${fetchError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json(completeInvoice);
  } catch (error) {
    console.error("Invoice creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
