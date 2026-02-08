import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, supabaseAdmin } from "@/lib/auth-server";

// GET - List businesses for staff/admin delivery form
export async function GET(request: NextRequest) {
  try {
    const { user, role } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Staff and Admin can access this endpoint
    if (role !== "STAFF" && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const includePackage = searchParams.get("include_package") === "true";
    const limit = parseInt(searchParams.get("limit") || "100");

    // Build query - include package info if requested
    const selectQuery = includePackage
      ? `id, name, phone, address, latitude, longitude, district_id, delivery_fee, package_id, delivery_fee_packages:package_id (id, fee_per_delivery)`
      : "id, name, phone, address, latitude, longitude, district_id, delivery_fee, package_id";

    const { data: businesses, error } = await supabaseAdmin
      .from("businesses")
      .select(selectQuery)
      .eq("active", true)
      .order("name", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("Error fetching businesses:", error);
      return NextResponse.json(
        { error: error.message || "Query failed" },
        { status: 500 },
      );
    }

    return NextResponse.json(businesses || []);
  } catch (error) {
    console.error("Error in staff businesses endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
