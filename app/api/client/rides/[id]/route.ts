import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';

// GET - Hire-vehicle details for one of the caller's own requests.
// The vehicle's non-sensitive info (name, capacity, color) is always returned;
// the driver/plate/phone are revealed ONLY once the order is confirmed
// (status has moved beyond CREATED).
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!business) {
      return NextResponse.json({ error: 'No business profile' }, { status: 400 });
    }

    const { data: delivery } = await supabaseAdmin
      .from('deliveries')
      .select('id, status, service_type, hire_vehicle_id, hire_category')
      .eq('id', params.id)
      .eq('business_id', business.id)
      .single();

    if (!delivery) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (!delivery.hire_vehicle_id) {
      return NextResponse.json({ hireVehicle: null });
    }

    const { data: v } = await supabaseAdmin
      .from('hire_vehicles')
      .select('*')
      .eq('id', delivery.hire_vehicle_id)
      .single();

    if (!v) {
      return NextResponse.json({ hireVehicle: null });
    }

    const confirmed = delivery.status !== 'CREATED';
    return NextResponse.json({
      confirmed,
      hireVehicle: {
        category: v.category,
        name: v.name,
        capacity_value: v.capacity_value,
        capacity_unit: v.capacity_unit,
        color: v.color,
        image_url: v.image_url,
        description: v.description,
        // Sensitive contact details only after the order is confirmed.
        plate_number: confirmed ? v.plate_number : null,
        driver_name: confirmed ? v.driver_name : null,
        driver_phone: confirmed ? v.driver_phone : null,
      },
    });
  } catch (error) {
    console.error('Error fetching ride hire details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
