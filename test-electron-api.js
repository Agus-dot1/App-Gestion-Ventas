// Test script to verify electronAPI functionality
// This script can be run in the browser console to test database operations

console.log('Testing electronAPI availability...');

if (typeof window !== 'undefined' && window.electronAPI) {
  console.log('✅ electronAPI is available');
  
  // Test database operations
  async function testDatabaseOperations() {
    try {
      console.log('Testing database operations...');
      
      // Test customer operations
      console.log('Testing customer count...');
      const customerCount = await window.electronAPI.database.customers.getCount();
      console.log('Customer count:', customerCount);
      
      // Test product operations
      console.log('Testing product count...');
      const productCount = await window.electronAPI.database.products.getCount();
      console.log('Product count:', productCount);
      
      // Test sales operations
      console.log('Testing sales count...');
      const salesCount = await window.electronAPI.database.sales.getCount();
      console.log('Sales count:', salesCount);
      
      // Test revenue calculation
      console.log('Testing total revenue...');
      const totalRevenue = await window.electronAPI.database.sales.getTotalRevenue();
      console.log('Total revenue:', totalRevenue);
      
      // Test recent data
      console.log('Testing recent customers...');
      const recentCustomers = await window.electronAPI.database.customers.getRecent(3);
      console.log('Recent customers:', recentCustomers);
      
      console.log('Testing recent sales...');
      const recentSales = await window.electronAPI.database.sales.getRecent(3);
      console.log('Recent sales:', recentSales);
      
      // Test chart data
      console.log('Testing sales chart data...');
      const chartData = await window.electronAPI.database.sales.getSalesChartData(7);
      console.log('Chart data:', chartData);
      
      console.log('✅ All database operations completed successfully!');
      
    } catch (error) {
      console.error('❌ Database operation failed:', error);
    }
  }
  
  // Run the test
  testDatabaseOperations();
  
} else {
  console.log('❌ electronAPI is not available');
  console.log('window object:', typeof window);
  if (typeof window !== 'undefined') {
    console.log('window.electronAPI:', window.electronAPI);
  }
}

// Export for manual testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testDatabaseOperations };
}