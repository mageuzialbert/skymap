import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Get businesses with logos for landing page
    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select('id, name, logo_url')
      .eq('active', true)
      .not('logo_url', 'is', null)
      .limit(20);

    if (businessesError) {
      return NextResponse.json(
        { error: businessesError.message },
        { status: 500 }
      );
    }

    // Get total count of active businesses
    const { count: totalBusinesses, error: countError } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    if (countError) {
      console.error('Error counting businesses:', countError);
    }

    // Get total count of deliveries
    const { count: totalDeliveries, error: deliveriesError } = await supabase
      .from('deliveries')
      .select('*', { count: 'exact', head: true });

    if (deliveriesError) {
      console.error('Error counting deliveries:', deliveriesError);
    }

    return NextResponse.json({
      businesses: businesses || [],
      totalBusinesses: totalBusinesses || 0,
      totalDeliveries: totalDeliveries || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
