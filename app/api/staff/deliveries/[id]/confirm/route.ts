import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, supabaseAdmin } from "@/lib/auth-server";
import { requirePermission } from "@/lib/permissions-server";

// PUT - Confirm a pending delivery (approve rider-created delivery)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { user, role } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission for deliveries.assign (same permission needed to confirm)
    const { allowed, error: permError } = await requirePermission(
      user.id,
      role || "",
      "deliveries.assign",
    );
    if (!allowed) {
      return NextResponse.json(
        { error: permError || "Permission denied" },
        { status: 403 },
      );
    }

    // Verify delivery exists and is in PENDING_CONFIRMATION status
    const { data: delivery, error: deliveryError } = await supabaseAdmin
      .from("deliveries")
      .select("id, status, assigned_rider_id, created_by")
      .eq("id", params.id)
      .single();

    console.log(
      `[Confirm Delivery] Attempting to confirm delivery ${params.id}:`,
      {
        deliveryId: params.id,
        currentStatus: delivery?.status,
        assignedRiderId: delivery?.assigned_rider_id,
        createdBy: delivery?.created_by,
        requestedBy: user.id,
      },
    );

    if (deliveryError || !delivery) {
      console.error(`[Confirm Delivery] Delivery not found: ${params.id}`);
      return NextResponse.json(
        { error: `Delivery not found (ID: ${params.id})` },
        { status: 404 },
      );
    }

    if (delivery.status !== "PENDING_CONFIRMATION") {
      console.warn(
        `[Confirm Delivery] Invalid status for delivery ${params.id}: ${delivery.status}`,
      );
      return NextResponse.json(
        {
          error: `Cannot confirm delivery (ID: ${params.id.substring(0, 8)}...) with status: ${delivery.status}. Only PENDING_CONFIRMATION deliveries can be confirmed.`,
        },
        { status: 400 },
      );
    }

    // Update delivery status to ASSIGNED
    const { data: updatedDelivery, error: updateError } = await supabaseAdmin
      .from("deliveries")
      .update({ status: "ASSIGNED" })
      .eq("id", params.id)
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
        )
      `,
      )
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Create delivery event
    await supabaseAdmin.from("delivery_events").insert({
      delivery_id: params.id,
      status: "ASSIGNED",
      note: "Delivery confirmed by staff/admin",
      created_by: user.id,
    });

    return NextResponse.json({
      success: true,
      delivery: updatedDelivery,
    });
  } catch (error) {
    console.error("Error confirming delivery:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE - Reject a pending delivery
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { user, role } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission for deliveries.assign
    const { allowed, error: permError } = await requirePermission(
      user.id,
      role || "",
      "deliveries.assign",
    );
    if (!allowed) {
      return NextResponse.json(
        { error: permError || "Permission denied" },
        { status: 403 },
      );
    }

    // Verify delivery exists and is in PENDING_CONFIRMATION status
    const { data: delivery, error: deliveryError } = await supabaseAdmin
      .from("deliveries")
      .select("id, status")
      .eq("id", params.id)
      .single();

    if (deliveryError || !delivery) {
      return NextResponse.json(
        { error: "Delivery not found" },
        { status: 404 },
      );
    }

    if (delivery.status !== "PENDING_CONFIRMATION") {
      return NextResponse.json(
        {
          error: `Cannot reject delivery with status: ${delivery.status}. Only PENDING_CONFIRMATION deliveries can be rejected.`,
        },
        { status: 400 },
      );
    }

    // Get rejection reason from request body (optional)
    let reason = "Delivery rejected by staff/admin";
    try {
      const body = await request.json();
      if (body.reason) {
        reason = body.reason;
      }
    } catch {
      // No body provided, use default reason
    }

    // Update delivery status to REJECTED
    const { data: updatedDelivery, error: updateError } = await supabaseAdmin
      .from("deliveries")
      .update({
        status: "REJECTED",
        assigned_rider_id: null, // Remove rider assignment
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
      status: "REJECTED",
      note: reason,
      created_by: user.id,
    });

    return NextResponse.json({
      success: true,
      delivery: updatedDelivery,
    });
  } catch (error) {
    console.error("Error rejecting delivery:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
