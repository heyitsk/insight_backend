function extractChartType(userPrompt) {
  const types = [
    "bar",
    "line",
    "pie",
    "scatter",
    "area",
    "radar",
    "composed",
    "treemap",
    "table",
    "list",
  ];
  const otherFormats = ["table", "list"];
  const lowerPrompt = userPrompt.toLowerCase();
  for (const type of types) {
    if (lowerPrompt.includes(`${type} chart`) || lowerPrompt.includes(type)) {
      return type;
    }
  }
  return null;
}
module.exports = { extractChartType };
