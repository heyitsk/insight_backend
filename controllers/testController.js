// Test route for chart system - bypasses Gemini API
const { getChartRecommendation } = require("../services/chartAnalyzer");

/**
 * Test endpoint with hardcoded data to test chart rendering
 * GET /api/test/charts/:type
 * 
 * Available types: bar, line, pie, scatter, area, table
 */
async function testCharts(req, res) {
  const chartType = req.params.type || 'bar';

  // Hardcoded test data for different chart types
  const testData = {
    bar: {
      query: "Show me products by category",
      sql: "SELECT category, COUNT(*) as count FROM products GROUP BY category",
      data: [
        { category: "Electronics", count: 4 },
        { category: "Furniture", count: 3 },
        { category: "Stationery", count: 2 },
        { category: "Accessories", count: 1 }
      ]
    },
    line: {
      query: "Show me orders by month",
      sql: "SELECT DATE_TRUNC('month', order_date) as month, COUNT(*) as orders FROM orders GROUP BY month ORDER BY month",
      data: [
        { month: "2024-01-01", orders: 3 },
        { month: "2024-02-01", orders: 5 },
        { month: "2024-03-01", orders: 4 },
        { month: "2024-04-01", orders: 6 },
        { month: "2024-05-01", orders: 8 }
      ]
    },
    pie: {
      query: "Show me order status distribution",
      sql: "SELECT status, COUNT(*) * 100.0 / (SELECT COUNT(*) FROM orders) as percentage FROM orders GROUP BY status",
      data: [
        { status: "Delivered", percentage: 60 },
        { status: "Pending", percentage: 25 },
        { status: "Cancelled", percentage: 15 }
      ]
    },
    scatter: {
      query: "Show relationship between price and stock",
      sql: "SELECT price, stock_quantity FROM products",
      data: [
        { price: 1299.99, stock_quantity: 45 },
        { price: 29.99, stock_quantity: 150 },
        { price: 249.99, stock_quantity: 30 },
        { price: 599.99, stock_quantity: 20 },
        { price: 12.99, stock_quantity: 200 },
        { price: 399.99, stock_quantity: 35 },
        { price: 89.99, stock_quantity: 80 },
        { price: 45.99, stock_quantity: 60 }
      ]
    },
    area: {
      query: "Show revenue trend over time",
      sql: "SELECT DATE_TRUNC('month', order_date) as month, SUM(total_amount) as revenue FROM orders GROUP BY month ORDER BY month",
      data: [
        { month: "2024-01-01", revenue: 3500 },
        { month: "2024-02-01", revenue: 4200 },
        { month: "2024-03-01", revenue: 3800 },
        { month: "2024-04-01", revenue: 5100 },
        { month: "2024-05-01", revenue: 6300 }
      ]
    },
    table: {
      query: "Show all products",
      sql: "SELECT * FROM products",
      data: [
        { product_id: 1, product_name: "Laptop Pro 15", category: "Electronics", price: 1299.99, stock_quantity: 45 },
        { product_id: 2, product_name: "Wireless Mouse", category: "Electronics", price: 29.99, stock_quantity: 150 },
        { product_id: 3, product_name: "Office Chair", category: "Furniture", price: 249.99, stock_quantity: 30 },
        { product_id: 4, product_name: "Standing Desk", category: "Furniture", price: 599.99, stock_quantity: 20 },
        { product_id: 5, product_name: "USB-C Cable", category: "Accessories", price: 12.99, stock_quantity: 200 }
      ]
    }
  };

  const selectedTest = testData[chartType] || testData.bar;

  // Use chart analyzer to get intelligent chart recommendation
  const chartRecommendation = getChartRecommendation(selectedTest.data, selectedTest.sql);

  console.log('Test chart recommendation:', chartRecommendation);

  // Return response in same format as regular chat endpoint
  res.json({
    sql: selectedTest.sql,
    data: selectedTest.data,
    answer: `This is test data for ${chartType} chart. The chart analyzer detected the data pattern and recommended: ${chartRecommendation.chartType}. ${chartRecommendation.reason}`,
    chart: {
      ...chartRecommendation.chartConfig,
      response: `Test data showing ${selectedTest.query.toLowerCase()}. Chart type: ${chartRecommendation.chartType}`
    },
    insights: [
      `This is a ${chartType} chart test with hardcoded data`,
      `Chart analyzer recommendation: ${chartRecommendation.chartType}`,
      `Data pattern: ${chartRecommendation.reason}`
    ],
    suggestedQuestions: [
      "Try /api/test/charts/bar for bar chart",
      "Try /api/test/charts/line for line chart",
      "Try /api/test/charts/pie for pie chart"
    ]
  });
}

module.exports = { testCharts };
