import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, supabaseAdmin } from "@/lib/auth-server";
import { requirePermission } from "@/lib/permissions-server";

// GET - List all businesses
export async function GET(request: NextRequest) {
  try {
    const { user, role } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission for businesses.view
    const { allowed, error: permError } = await requirePermission(
      user.id,
      role || "",
      "businesses.view",
    );
    if (!allowed) {
      return NextResponse.json(
        { error: permError || "Permission denied" },
        { status: 403 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const active = searchParams.get("active");
    const search = searchParams.get("search");
    const includePackage = searchParams.get("include_package") === "true";
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query - include package info if requested
    const selectQuery = includePackage
      ? `*, delivery_fee_packages:package_id (id, fee_per_delivery)`
      : "*";

    let query = supabaseAdmin.from("businesses").select(selectQuery);

    // Apply active filter first
    if (active !== null) {
      if (active === "true") {
        query = query.eq("active", true);
      } else {
        // For inactive: get records where active is false OR null
        // In Supabase, we can use multiple filters
        query = query.or("active.is.null,active.eq.false");
      }
    }

    // Apply search filter if provided
    if (search && search.trim()) {
      // Search in name or phone - need to combine with existing filters
      // Use or() for the search terms
      const searchTerm = `%${search.trim()}%`;
      query = query.or(`name.ilike.${searchTerm},phone.ilike.${searchTerm}`);
    }

    // Apply ordering and pagination
    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: businesses, error } = await query;

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json(
        { error: error.message || "Query failed" },
        { status: 500 },
      );
    }

    // Fetch user data separately and map to businesses
    if (businesses && businesses.length > 0) {
      const userIds = businesses
        .map((b: any) => b.user_id)
        .filter((id: any): id is string => id !== null && id !== undefined);

      if (userIds.length > 0) {
        const { data: users, error: userError } = await supabaseAdmin
          .from("users")
          .select("id, name, phone, role")
          .in("id", userIds);

        if (userError) {
          console.error("Error fetching users:", userError);
        } else {
          // Map users to businesses
          const userMap = new Map(users?.map((u: any) => [u.id, u]) || []);
          businesses.forEach((business: any) => {
            if (business.user_id && userMap.has(business.user_id)) {
              business.user = userMap.get(business.user_id);
            }
          });
        }
      }
    }

    return NextResponse.json(businesses || []);
  } catch (error) {
    console.error("Error fetching businesses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST - Create a new business (Admin/Staff with permission)
export async function POST(request: NextRequest) {
  try {
    const { user, role } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission for businesses.create
    const { allowed, error: permError } = await requirePermission(
      user.id,
      role || "",
      "businesses.create",
    );
    if (!allowed) {
      return NextResponse.json(
        { error: permError || "Permission denied" },
        { status: 403 },
      );
    }

    const {
      name,
      email,
      phone,
      password,
      delivery_fee,
      district_id,
      package_id,
      address,
      latitude,
      longitude,
    } = await request.json();

    // Validation
    if (!name || !email || !phone || !password) {
      return NextResponse.json(
        { error: "Name, email, phone, and password are required" },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    // Normalize phone number
    let phoneNumber = phone.trim();
    if (!phoneNumber.startsWith("+255")) {
      phoneNumber =
        "+255" + phoneNumber.replace(/^\+?255?/, "").replace(/\D/g, "");
    } else {
      phoneNumber =
        "+255" + phoneNumber.replace(/^\+255/, "").replace(/\D/g, "");
    }

    // Validate phone format
    const digitsAfter255 = phoneNumber.replace(/^\+255/, "");
    if (digitsAfter255.length !== 9) {
      return NextResponse.json(
        { error: "Phone number must be exactly 9 digits after +255" },
        { status: 400 },
      );
    }

    // Check if phone already exists
    const { data: existingBusiness } = await supabaseAdmin
      .from("businesses")
      .select("id")
      .eq("phone", phoneNumber)
      .single();

    if (existingBusiness) {
      return NextResponse.json(
        { error: "Phone number already registered" },
        { status: 400 },
      );
    }

    // Create auth user
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          business_name: name,
          phone: phoneNumber,
          role: "BUSINESS",
        },
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Failed to create user account" },
        { status: 500 },
      );
    }

    // Create user record
    const { error: userError } = await supabaseAdmin.from("users").upsert(
      {
        id: authData.user.id,
        name,
        email,
        phone: phoneNumber,
        role: "BUSINESS",
        active: true,
      },
      {
        onConflict: "id",
      },
    );

    if (userError) {
      // Rollback: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    // Get default package if not provided
    let finalPackageId = package_id;
    if (!finalPackageId) {
      const { data: defaultPackage } = await supabaseAdmin
        .from("delivery_fee_packages")
        .select("id")
        .eq("is_default", true)
        .eq("active", true)
        .single();

      if (defaultPackage) {
        finalPackageId = defaultPackage.id;
      }
    }

    // Parse delivery fee
    let finalDeliveryFee = null;
    if (
      delivery_fee !== undefined &&
      delivery_fee !== null &&
      delivery_fee !== ""
    ) {
      const fee = parseFloat(delivery_fee);
      if (!isNaN(fee) && fee >= 0) {
        finalDeliveryFee = fee;
      }
    }

    // Parse latitude and longitude
    let finalLatitude = null;
    let finalLongitude = null;
    if (latitude !== undefined && latitude !== null) {
      const lat = parseFloat(latitude);
      if (!isNaN(lat) && lat >= -90 && lat <= 90) {
        finalLatitude = lat;
      }
    }
    if (longitude !== undefined && longitude !== null) {
      const lng = parseFloat(longitude);
      if (!isNaN(lng) && lng >= -180 && lng <= 180) {
        finalLongitude = lng;
      }
    }

    // Create business record
    const { data: newBusiness, error: businessError } = await supabaseAdmin
      .from("businesses")
      .insert({
        name,
        phone: phoneNumber,
        user_id: authData.user.id,
        district_id: district_id || null,
        package_id: finalPackageId || null,
        delivery_fee: finalDeliveryFee,
        billing_cycle: "WEEKLY",
        active: true,
        address: address || null,
        latitude: finalLatitude,
        longitude: finalLongitude,
      })
      .select()
      .single();

    if (businessError) {
      // Rollback: delete user records
      await supabaseAdmin.from("users").delete().eq("id", authData.user.id);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: businessError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      business: newBusiness,
    });
  } catch (error) {
    console.error("Error creating business:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
