import { NextResponse } from 'next/server';
import { customerOperations, productOperations, saleOperations } from '@/lib/database-operations';
import { initializeDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Initialize database
    initializeDatabase();
    // Get basic stats
    const totalCustomers = customerOperations.getCount();
    const totalProducts = productOperations.getCount();
    const totalSales = saleOperations.getCount();
    const totalRevenue = saleOperations.getTotalRevenue();
    
    // Get recent data
    const recentSalesData = saleOperations.getRecent(5);
    const recentCustomersData = customerOperations.getRecent(5);
    
    // Get chart data
    const salesChartData = saleOperations.getSalesChartData(30);
    
    // Get comparison data
    const salesComparison = saleOperations.getStatsComparison();
    const customersComparison = customerOperations.getMonthlyComparison();
    const productsComparison = productOperations.getMonthlyComparison();
    
    // Calculate percentage changes
    const calculatePercentage = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };
    
    const statsComparison = {
      sales: {
        current: salesComparison.current,
        previous: salesComparison.previous,
        percentage: calculatePercentage(salesComparison.current, salesComparison.previous)
      },
      revenue: {
        current: salesComparison.current,
        previous: salesComparison.previous,
        percentage: calculatePercentage(salesComparison.current, salesComparison.previous)
      },
      customers: {
        current: customersComparison.current,
        previous: customersComparison.previous,
        percentage: calculatePercentage(customersComparison.current, customersComparison.previous)
      },
      products: {
        current: productsComparison.current,
        previous: productsComparison.previous,
        percentage: calculatePercentage(productsComparison.current, productsComparison.previous)
      }
    };
    
    return NextResponse.json({
      stats: {
        totalCustomers,
        totalProducts,
        totalSales,
        totalRevenue
      },
      recentSales: recentSalesData,
      recentCustomers: recentCustomersData,
      chartData: salesChartData,
      statsComparison
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}