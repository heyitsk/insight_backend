/**
 * Chart Analyzer Service
 * Intelligently determines the best chart type based on data structure
 */

const SUPPORTED_CHART_TYPES = {
  BAR: 'bar_chart',
  LINE: 'line_chart',
  PIE: 'pie_chart',
  AREA: 'area_chart',
  SCATTER: 'scatter_chart',
  TABLE: 'table',
};

/**
 * Analyze data structure to determine column types and characteristics
 */
function analyzeDataStructure(data) {
  if (!data || data.length === 0) {
    return {
      rowCount: 0,
      columns: [],
      numericColumns: [],
      categoricalColumns: [],
      dateColumns: [],
      hasPercentages: false,
    };
  }

  const firstRow = data[0];
  const columns = Object.keys(firstRow);
  const numericColumns = [];
  const categoricalColumns = [];
  const dateColumns = [];

  columns.forEach((col) => {
    const values = data.map((row) => row[col]).filter((v) => v != null);
    if (values.length === 0) return;

    const sampleValue = values[0];

    // Check if date
    if (
      typeof sampleValue === 'string' &&
      /^\d{4}-\d{2}-\d{2}/.test(sampleValue)
    ) {
      dateColumns.push(col);
    }
    // Check if numeric
    else if (typeof sampleValue === 'number' || !isNaN(parseFloat(sampleValue))) {
      numericColumns.push(col);
    }
    // Otherwise categorical
    else {
      categoricalColumns.push(col);
    }
  });

  // Check if data represents percentages (values sum to ~100)
  const hasPercentages = numericColumns.some((col) => {
    const sum = data.reduce((acc, row) => acc + (parseFloat(row[col]) || 0), 0);
    return Math.abs(sum - 100) < 5; // Within 5% of 100
  });

  return {
    rowCount: data.length,
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
    hasPercentages,
  };
}

/**
 * Determine the best chart type based on data structure
 */
function determineChartType(data, sqlQuery = '') {
  const analysis = analyzeDataStructure(data);
  const { rowCount, numericColumns, categoricalColumns, dateColumns, hasPercentages } = analysis;

  // No data or too many rows → Table
  if (rowCount === 0 || rowCount > 50) {
    return {
      type: SUPPORTED_CHART_TYPES.TABLE,
      reason: rowCount === 0 ? 'No data to visualize' : 'Too many rows for chart visualization',
    };
  }

  // Single row → Table
  if (rowCount === 1) {
    return {
      type: SUPPORTED_CHART_TYPES.TABLE,
      reason: 'Single row best displayed as table',
    };
  }

  // 1 date column + 1 numeric column → Line Chart (time series)
  if (dateColumns.length === 1 && numericColumns.length === 1 && categoricalColumns.length === 0) {
    return {
      type: SUPPORTED_CHART_TYPES.LINE,
      reason: 'Time series data',
      config: {
        x: dateColumns[0],
        y: numericColumns[0],
      },
    };
  }

  // 1 date column + 1 numeric column → Area Chart (cumulative trend)
  if (dateColumns.length === 1 && numericColumns.length >= 1) {
    return {
      type: SUPPORTED_CHART_TYPES.AREA,
      reason: 'Time series with area visualization',
      config: {
        x: dateColumns[0],
        y: numericColumns[0],
      },
    };
  }

  // 1 categorical column + 1 numeric column (small categories) → Bar Chart
  if (categoricalColumns.length === 1 && numericColumns.length === 1 && rowCount <= 15) {
    return {
      type: SUPPORTED_CHART_TYPES.BAR,
      reason: 'Categorical comparison',
      config: {
        x: categoricalColumns[0],
        y: numericColumns[0],
      },
    };
  }

  // 1 categorical column + 1 numeric column (percentages) → Pie Chart
  if (categoricalColumns.length === 1 && numericColumns.length === 1 && hasPercentages && rowCount <= 8) {
    return {
      type: SUPPORTED_CHART_TYPES.PIE,
      reason: 'Distribution showing parts of whole',
      config: {
        nameKey: categoricalColumns[0],
        dataKey: numericColumns[0],
      },
    };
  }

  // 2 numeric columns, no categories → Scatter Chart
  if (numericColumns.length === 2 && categoricalColumns.length === 0 && dateColumns.length === 0) {
    return {
      type: SUPPORTED_CHART_TYPES.SCATTER,
      reason: 'Relationship between two numeric variables',
      config: {
        x: numericColumns[0],
        y: numericColumns[1],
      },
    };
  }

  // Default fallback → Table
  return {
    type: SUPPORTED_CHART_TYPES.TABLE,
    reason: 'Complex data structure best displayed as table',
  };
}

/**
 * Generate complete chart configuration
 */
function generateChartConfig(data, chartType, baseConfig = {}) {
  const analysis = analyzeDataStructure(data);

  switch (chartType) {
    case SUPPORTED_CHART_TYPES.BAR:
      return {
        type: 'bar_chart',
        x: baseConfig.x || analysis.categoricalColumns[0] || analysis.columns[0],
        y: baseConfig.y || analysis.numericColumns[0] || analysis.columns[1],
      };

    case SUPPORTED_CHART_TYPES.LINE:
      return {
        type: 'line_chart',
        x: baseConfig.x || analysis.dateColumns[0] || analysis.columns[0],
        y: baseConfig.y || analysis.numericColumns[0] || analysis.columns[1],
      };

    case SUPPORTED_CHART_TYPES.PIE:
      return {
        type: 'pie_chart',
        nameKey: baseConfig.nameKey || analysis.categoricalColumns[0] || analysis.columns[0],
        dataKey: baseConfig.dataKey || analysis.numericColumns[0] || analysis.columns[1],
      };

    case SUPPORTED_CHART_TYPES.AREA:
      return {
        type: 'area_chart',
        x: baseConfig.x || analysis.dateColumns[0] || analysis.columns[0],
        y: baseConfig.y || analysis.numericColumns[0] || analysis.columns[1],
      };

    case SUPPORTED_CHART_TYPES.SCATTER:
      return {
        type: 'scatter_chart',
        x: baseConfig.x || analysis.numericColumns[0] || analysis.columns[0],
        y: baseConfig.y || analysis.numericColumns[1] || analysis.columns[1],
      };

    case SUPPORTED_CHART_TYPES.TABLE:
    default:
      return {
        type: 'table',
        x: baseConfig.x || analysis.columns[0],
        y: baseConfig.y || analysis.columns[1],
      };
  }
}

/**
 * Main function: Analyze data and return chart recommendation
 */
function getChartRecommendation(data, sqlQuery = '') {
  const recommendation = determineChartType(data, sqlQuery);
  const chartConfig = generateChartConfig(data, recommendation.type, recommendation.config);

  return {
    chartType: recommendation.type,
    chartConfig,
    reason: recommendation.reason,
    dataAnalysis: analyzeDataStructure(data),
  };
}

module.exports = {
  getChartRecommendation,
  analyzeDataStructure,
  determineChartType,
  generateChartConfig,
  SUPPORTED_CHART_TYPES,
};
