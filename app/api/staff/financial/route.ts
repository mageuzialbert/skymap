import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';

// GET - Financial analytics data
export async function GET(request: NextRequest) {
  try {
    const { user, role } = await getAuthenticatedUser();

    if (!user || (role !== 'STAFF' && role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get date range from query params (optional)
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Calculate date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Use provided date range or default to all time
    const dateFilterStart = startDate ? new Date(startDate) : null;
    const dateFilterEnd = endDate ? new Date(endDate) : null;

    // Get total revenue from charges
    const { data: allCharges } = await supabaseAdmin
      .from('charges')
      .select('amount');

    const totalRevenue = allCharges?.reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0) || 0;

    // Get this week's revenue
    const { data: weekCharges } = await supabaseAdmin
      .from('charges')
      .select('amount')
      .gte('created_at', weekStart.toISOString());

    const weekRevenue = weekCharges?.reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0) || 0;

    // Get this month's revenue
    const { data: monthCharges } = await supabaseAdmin
      .from('charges')
      .select('amount')
      .gte('created_at', monthStart.toISOString());

    const monthRevenue = monthCharges?.reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0) || 0;

    // Get invoices overview
    const { data: invoices } = await supabaseAdmin
      .from('invoices')
      .select('id, status, total_amount, generated_at');

    const invoicesOverview = {
      total: invoices?.length || 0,
      pending: invoices?.filter((i) => i.status === 'SENT').length || 0,
      paid: invoices?.filter((i) => i.status === 'PAID').length || 0,
      draft: invoices?.filter((i) => i.status === 'DRAFT').length || 0,
      totalAmount: invoices?.reduce((sum, i) => sum + parseFloat(i.total_amount.toString()), 0) || 0,
      pendingAmount: invoices?.filter((i) => i.status === 'SENT').reduce((sum, i) => sum + parseFloat(i.total_amount.toString()), 0) || 0,
    };

    // Get charges breakdown (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: recentCharges } = await supabaseAdmin
      .from('charges')
      .select(`
        id,
        amount,
        description,
        created_at,
        businesses:business_id (
          id,
          name
        )
      `)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    // Get top businesses by revenue
    const { data: businessCharges } = await supabaseAdmin
      .from('charges')
      .select(`
        business_id,
        amount,
        businesses:business_id (
          id,
          name
        )
      `);

    const businessRevenue: Record<string, { businessId: string; businessName: string; revenue: number }> = {};
    businessCharges?.forEach((charge) => {
      const businessId = charge.business_id;
      const business = charge.businesses as any;
      if (!businessRevenue[businessId]) {
        businessRevenue[businessId] = {
          businessId,
          businessName: business?.name || 'Unknown',
          revenue: 0,
        };
      }
      businessRevenue[businessId].revenue += parseFloat(charge.amount.toString());
    });

    const topBusinesses = Object.values(businessRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Get revenue trends (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: trendCharges } = await supabaseAdmin
      .from('charges')
      .select('amount, created_at')
      .gte('created_at', sevenDaysAgo.toISOString());

    const dailyRevenue: Record<string, number> = {};
    trendCharges?.forEach((charge) => {
      const date = new Date(charge.created_at).toISOString().split('T')[0];
      dailyRevenue[date] = (dailyRevenue[date] || 0) + parseFloat(charge.amount.toString());
    });

    const revenueTrends = Object.entries(dailyRevenue)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get expenses
    let expenseQuery = supabaseAdmin.from('expenses').select('amount, expense_date, category_id, expense_categories:category_id(id, name)');
    
    if (dateFilterStart) {
      expenseQuery = expenseQuery.gte('expense_date', dateFilterStart.toISOString().split('T')[0]);
    }
    if (dateFilterEnd) {
      expenseQuery = expenseQuery.lte('expense_date', dateFilterEnd.toISOString().split('T')[0]);
    }

    const { data: allExpenses } = await expenseQuery;

    // Calculate total expenses
    const totalExpenses = allExpenses?.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0) || 0;

    // Calculate expenses for date range (if provided)
    let filteredRevenue = totalRevenue;
    if (dateFilterStart && dateFilterEnd) {
      const { data: filteredCharges } = await supabaseAdmin
        .from('charges')
        .select('amount')
        .gte('created_at', dateFilterStart.toISOString())
        .lte('created_at', dateFilterEnd.toISOString());
      
      filteredRevenue = filteredCharges?.reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0) || 0;
    }

    // Calculate profit
    const profit = filteredRevenue - totalExpenses;

    // Expense breakdown by category
    const expenseByCategory: Record<string, { categoryName: string; amount: number }> = {};
    allExpenses?.forEach((expense) => {
      const category = expense.expense_categories as any;
      const categoryId = expense.category_id;
      const categoryName = category?.name || 'Unknown';
      
      if (!expenseByCategory[categoryId]) {
        expenseByCategory[categoryId] = {
          categoryName,
          amount: 0,
        };
      }
      expenseByCategory[categoryId].amount += parseFloat(expense.amount.toString());
    });

    const expenseBreakdown = Object.values(expenseByCategory).sort((a, b) => b.amount - a.amount);

    // Expense trends (last 30 days)
    const thirtyDaysAgoForExpenses = new Date();
    thirtyDaysAgoForExpenses.setDate(thirtyDaysAgoForExpenses.getDate() - 30);
    const { data: recentExpenses } = await supabaseAdmin
      .from('expenses')
      .select('amount, expense_date')
      .gte('expense_date', thirtyDaysAgoForExpenses.toISOString().split('T')[0]);

    const dailyExpenses: Record<string, number> = {};
    recentExpenses?.forEach((expense) => {
      const date = expense.expense_date;
      dailyExpenses[date] = (dailyExpenses[date] || 0) + parseFloat(expense.amount.toString());
    });

    const expenseTrends = Object.entries(dailyExpenses)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      revenue: {
        total: totalRevenue,
        thisWeek: weekRevenue,
        thisMonth: monthRevenue,
        filtered: filteredRevenue, // Revenue for selected date range
      },
      expenses: {
        total: totalExpenses,
        breakdown: expenseBreakdown,
        trends: expenseTrends,
      },
      profit: {
        total: profit,
        margin: filteredRevenue > 0 ? ((profit / filteredRevenue) * 100) : 0,
      },
      invoices: invoicesOverview,
      chargesBreakdown: recentCharges || [],
      topBusinesses,
      revenueTrends,
      dateRange: {
        start: dateFilterStart?.toISOString().split('T')[0] || null,
        end: dateFilterEnd?.toISOString().split('T')[0] || null,
      },
    });
  } catch (error) {
    console.error('Error fetching financial data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
