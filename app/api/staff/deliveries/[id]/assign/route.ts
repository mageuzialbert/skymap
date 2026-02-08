import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, supabaseAdmin } from "@/lib/auth-server";
import { sendSMS } from "@/lib/sms";

// PUT - Assign rider to delivery
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { user, role } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is STAFF or ADMIN
    if (role !== "STAFF" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { rider_id } = await request.json();

    if (!rider_id) {
      return NextResponse.json(
        { error: "Rider ID is required" },
        { status: 400 },
      );
    }

    // Verify rider exists and is a RIDER
    const { data: rider, error: riderError } = await supabaseAdmin
      .from("users")
      .select("id, name, role, active, phone")
      .eq("id", rider_id)
      .single();

    if (riderError || !rider) {
      return NextResponse.json({ error: "Rider not found" }, { status: 404 });
    }

    if (rider.role !== "RIDER") {
      return NextResponse.json(
        { error: "User is not a rider" },
        { status: 400 },
      );
    }

    if (!rider.active) {
      return NextResponse.json(
        { error: "Rider is not active" },
        { status: 400 },
      );
    }

    // Verify delivery exists
    const { data: delivery, error: deliveryError } = await supabaseAdmin
      .from("deliveries")
      .select("id, status, assigned_rider_id, created_by")
      .eq("id", params.id)
      .single();

    console.log(
      `[Assign Rider] Attempting to assign rider to delivery ${params.id}:`,
      {
        deliveryId: params.id,
        currentStatus: delivery?.status,
        currentRiderId: delivery?.assigned_rider_id,
        newRiderId: rider_id,
        requestedBy: user.id,
      },
    );

    if (deliveryError || !delivery) {
      console.error(`[Assign Rider] Delivery not found: ${params.id}`);
      return NextResponse.json(
        { error: "Delivery not found" },
        { status: 404 },
      );
    }

    // Prevent assigning to deliveries that are pending confirmation (rider-created)
    // These should use the confirm endpoint instead
    if (delivery.status === "PENDING_CONFIRMATION") {
      console.warn(
        `[Assign Rider] Cannot assign to PENDING_CONFIRMATION delivery ${params.id}`,
      );
      return NextResponse.json(
        {
          error:
            "This delivery is pending confirmation. Please use the Confirm button to approve it.",
        },
        { status: 400 },
      );
    }

    // Prevent re-assigning deliveries that are already assigned or in progress
    if (delivery.status !== "CREATED") {
      console.warn(
        `[Assign Rider] Cannot assign to delivery with status ${delivery.status}`,
      );
      return NextResponse.json(
        {
          error: `Cannot assign rider to delivery with status: ${delivery.status}. Only CREATED deliveries can be assigned.`,
        },
        { status: 400 },
      );
    }

    // Update delivery
    const { data: updatedDelivery, error: updateError } = await supabaseAdmin
      .from("deliveries")
      .update({
        assigned_rider_id: rider_id,
        status: "ASSIGNED",
      })
      .eq("id", params.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Create delivery event
    await supabaseAdmin.from("delivery_events").insert({
      delivery_id: params.id,
      status: "ASSIGNED",
      note: `Assigned to rider ${rider.name || rider_id}`,
      created_by: user.id,
    });

    // Send SMS notification to rider
    if (rider.phone) {
      await sendSMS(
        rider.phone,
        `You have been assigned a new delivery (ID: ${params.id.substring(0, 8)}). Please check your dashboard app for details.`,
      );
    }

    return NextResponse.json({
      success: true,
      delivery: updatedDelivery,
    });
  } catch (error) {
    console.error("Error assigning rider:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
