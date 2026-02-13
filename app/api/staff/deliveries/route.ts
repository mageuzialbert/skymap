import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, supabaseAdmin } from "@/lib/auth-server";
import { requirePermission } from "@/lib/permissions-server";
import { sendSMS } from "@/lib/sms";

const COMPANY_PROFILE_ID = "00000000-0000-0000-0000-000000000001";

// GET - List all deliveries with filters
export async function GET(request: NextRequest) {
  try {
    const { user, role } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission for deliveries.view
    const { allowed, error: permError } = await requirePermission(
      user.id,
      role || "",
      "deliveries.view",
    );
    if (!allowed) {
      return NextResponse.json(
        { error: permError || "Permission denied" },
        { status: 403 },
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const businessId = searchParams.get("business_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const limit = parseInt(searchParams.get("limit") || "25");
    const offset = parseInt(searchParams.get("offset") || "0");
    const includeTotals = searchParams.get("include_totals") === "true";

    // Build count query first (for pagination)
    let countQuery = supabaseAdmin
      .from("deliveries")
      .select("id", { count: "exact", head: true });

    // Apply filters to count query
    if (status && status !== "ALL") {
      countQuery = countQuery.eq("status", status);
    }
    if (businessId) {
      countQuery = countQuery.eq("business_id", businessId);
    }
    if (startDate) {
      countQuery = countQuery.gte("created_at", startDate);
    }
    if (endDate) {
      countQuery = countQuery.lte("created_at", endDate);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      console.error("Error counting deliveries:", countError);
    }

    // Build main query
    let query = supabaseAdmin
      .from("deliveries")
      .select(
        `
        *,
        businesses:business_id (
          id,
          name,
          phone
        ),
        assigned_rider:assigned_rider_id (
          id,
          name,
          phone
        ),
        created_by_user:created_by (
          id,
          name,
          role
        )
      `,
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status && status !== "ALL") {
      query = query.eq("status", status);
    }
    if (businessId) {
      query = query.eq("business_id", businessId);
    }
    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    const { data: deliveries, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return with pagination info if requested
    if (includeTotals) {
      return NextResponse.json({
        deliveries: deliveries || [],
        total: totalCount || 0,
        limit,
        offset,
      });
    }

    // Backwards compatible: return just array if not requesting totals
    return NextResponse.json(deliveries || []);
  } catch (error) {
    console.error("Error fetching deliveries:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST - Create delivery for any business
export async function POST(request: NextRequest) {
  try {
    const { user, role } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission for deliveries.create
    const { allowed, error: permError } = await requirePermission(
      user.id,
      role || "",
      "deliveries.create",
    );
    if (!allowed) {
      return NextResponse.json(
        { error: permError || "Permission denied" },
        { status: 403 },
      );
    }

    const {
      business_id,
      pickup_address,
      pickup_name,
      pickup_phone,
      pickup_region_id,
      pickup_district_id,
      dropoff_address,
      dropoff_name,
      dropoff_phone,
      dropoff_region_id,
      dropoff_district_id,
      pickup_latitude,
      pickup_longitude,
      dropoff_latitude,
      dropoff_longitude,
      package_description,
      delivery_fee: providedDeliveryFee,
      created_at: providedCreatedAt,
    } = await request.json();

    // Validation
    if (!business_id) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 },
      );
    }

    if (
      !pickup_address ||
      !pickup_name ||
      !pickup_phone ||
      !dropoff_address ||
      !dropoff_name ||
      !dropoff_phone
    ) {
      return NextResponse.json(
        { error: "All delivery fields are required" },
        { status: 400 },
      );
    }

    // Verify business exists and get package info for delivery fee
    const { data: business, error: businessError } = await supabaseAdmin
      .from("businesses")
      .select(
        `
        id,
        package_id,
        delivery_fee,
        delivery_fee_packages:package_id (
          id,
          fee_per_delivery
        )
      `,
      )
      .eq("id", business_id)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 },
      );
    }

    // Determine the delivery fee to use
    let finalDeliveryFee: number | null = null;

    if (
      providedDeliveryFee !== undefined &&
      providedDeliveryFee !== null &&
      providedDeliveryFee > 0
    ) {
      // Use the provided fee if specified
      finalDeliveryFee = parseFloat(providedDeliveryFee.toString());
    } else if (business.delivery_fee) {
      // Use business's custom delivery fee if set
      finalDeliveryFee = parseFloat(business.delivery_fee.toString());
    } else if (
      business.delivery_fee_packages &&
      typeof business.delivery_fee_packages === "object" &&
      !Array.isArray(business.delivery_fee_packages)
    ) {
      // Use business's package fee
      const packages = business.delivery_fee_packages as {
        id: any;
        fee_per_delivery: any;
      };
      finalDeliveryFee = parseFloat(packages.fee_per_delivery.toString());
    } else {
      // Fall back to default package
      const { data: defaultPackage } = await supabaseAdmin
        .from("delivery_fee_packages")
        .select("fee_per_delivery")
        .eq("is_default", true)
        .eq("active", true)
        .single();

      if (defaultPackage) {
        finalDeliveryFee = parseFloat(
          defaultPackage.fee_per_delivery.toString(),
        );
      }
    }

    // Determine status and assignment based on creator's role
    // Riders create deliveries with PENDING_CONFIRMATION and auto-assign to themselves
    const isRider = role === "RIDER";
    const deliveryStatus = isRider ? "PENDING_CONFIRMATION" : "CREATED";
    const assignedRiderId = isRider ? user.id : null;

    // Create delivery
    const { data: deliveryData, error: deliveryError } = await supabaseAdmin
      .from("deliveries")
      .insert({
        business_id,
        pickup_address,
        pickup_latitude,
        pickup_longitude,
        pickup_name,
        pickup_phone,
        pickup_region_id: pickup_region_id || null,
        pickup_district_id: pickup_district_id || null,
        dropoff_address,
        dropoff_latitude,
        dropoff_longitude,
        dropoff_name,
        dropoff_phone,
        dropoff_region_id: dropoff_region_id || null,
        dropoff_district_id: dropoff_district_id || null,
        package_description: package_description || null,
        delivery_fee: finalDeliveryFee,
        status: deliveryStatus,
        assigned_rider_id: assignedRiderId,
        created_by: user.id,
        ...(providedCreatedAt ? { created_at: new Date(providedCreatedAt).toISOString() } : {}),
      })
      .select()
      .single();

    if (deliveryError) {
      return NextResponse.json(
        { error: deliveryError.message },
        { status: 500 },
      );
    }

    // Create charge record for revenue tracking
    if (finalDeliveryFee && finalDeliveryFee > 0) {
      const chargeDescription = isRider
        ? "Delivery fee - Created by rider"
        : "Delivery fee - Created by staff";

      await supabaseAdmin.from("charges").insert({
        delivery_id: deliveryData.id,
        business_id: business_id,
        amount: finalDeliveryFee,
        description: chargeDescription,
      });
    }

    // Create delivery event
    const eventNote = isRider
      ? "Delivery created by rider - pending confirmation"
      : "Delivery created by staff";

    await supabaseAdmin.from("delivery_events").insert({
      delivery_id: deliveryData.id,
      status: deliveryStatus,
      note: eventNote,
      created_by: user.id,
    });

    // When rider creates and self-assigns, notify company profile so they can confirm
    if (isRider) {
      try {
        const { data: companyProfile } = await supabaseAdmin
          .from("company_profile")
          .select("phone")
          .eq("id", COMPANY_PROFILE_ID)
          .single();

        if (companyProfile?.phone) {
          const shortId = deliveryData.id.substring(0, 8);
          await sendSMS(
            companyProfile.phone,
            `The Skymap: A rider has created and self-assigned delivery ${shortId}. Status: Pending confirmation. Please confirm in Staff Dashboard.`,
          );
        }
      } catch (smsErr) {
        console.error("Failed to send company profile SMS:", smsErr);
        // Don't fail the request; delivery was created successfully
      }
    }

    return NextResponse.json({
      success: true,
      delivery: deliveryData,
    });
  } catch (error) {
    console.error("Error creating delivery:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
