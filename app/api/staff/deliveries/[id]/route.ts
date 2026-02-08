import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, supabaseAdmin } from "@/lib/auth-server";

export async function GET(
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

    const { data: delivery, error } = await supabaseAdmin
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
      .eq("id", params.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Delivery not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(delivery);
  } catch (error) {
    console.error("Error fetching delivery:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE - Permanently delete a delivery (Admin/Staff only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { user, role } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only STAFF and ADMIN can delete deliveries
    if (role !== "STAFF" && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Only staff and admin can delete deliveries" },
        { status: 403 },
      );
    }

    // Verify delivery exists
    const { data: delivery, error: fetchError } = await supabaseAdmin
      .from("deliveries")
      .select("id, status")
      .eq("id", params.id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Delivery not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Hard delete the delivery
    // Related charges and delivery_events will be cascade deleted automatically
    const { error: deleteError } = await supabaseAdmin
      .from("deliveries")
      .delete()
      .eq("id", params.id);

    if (deleteError) {
      console.error("Error deleting delivery:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Delivery permanently deleted",
      deleted_id: params.id,
    });
  } catch (error) {
    console.error("Error deleting delivery:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT - Update delivery details (fee, etc.) - Admin/Staff only
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { user, role } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only STAFF and ADMIN can update deliveries
    if (role !== "STAFF" && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Only staff and admin can update deliveries" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { delivery_fee } = body;

    // Verify delivery exists and get current data
    const { data: delivery, error: fetchError } = await supabaseAdmin
      .from("deliveries")
      .select("id, business_id, delivery_fee")
      .eq("id", params.id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Delivery not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (delivery_fee !== undefined) {
      const fee = parseFloat(delivery_fee.toString());
      if (isNaN(fee) || fee < 0) {
        return NextResponse.json(
          { error: "Invalid delivery fee" },
          { status: 400 },
        );
      }
      updateData.delivery_fee = fee;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    // Update delivery
    const { data: updatedDelivery, error: updateError } = await supabaseAdmin
      .from("deliveries")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating delivery:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Handle charge record for fee changes
    if (delivery_fee !== undefined && delivery.business_id) {
      const newFee = parseFloat(delivery_fee.toString());

      // Check if charge exists for this delivery
      const { data: existingCharge } = await supabaseAdmin
        .from("charges")
        .select("id")
        .eq("delivery_id", params.id)
        .single();

      if (existingCharge) {
        // Update existing charge
        if (newFee > 0) {
          await supabaseAdmin
            .from("charges")
            .update({
              amount: newFee,
              description: "Delivery fee - Updated by staff",
            })
            .eq("delivery_id", params.id);
        } else {
          // Delete charge if fee is 0
          await supabaseAdmin
            .from("charges")
            .delete()
            .eq("delivery_id", params.id);
        }
      } else if (newFee > 0) {
        // Create new charge
        await supabaseAdmin.from("charges").insert({
          delivery_id: params.id,
          business_id: delivery.business_id,
          amount: newFee,
          description: "Delivery fee - Added by staff",
        });
      }
    }

    return NextResponse.json({
      success: true,
      delivery: updatedDelivery,
    });
  } catch (error) {
    console.error("Error updating delivery:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
