describe("parseNumericValue", function() {
  it("should parse plain numbers", function() {
    expect(parseNumericValue("123")).toBe(123);
    expect(parseNumericValue("123.45")).toBe(123.45);
    expect(parseNumericValue("-123")).toBe(-123);
  });

  it("should ignore thousand separators", function() {
    expect(parseNumericValue("1,234")).toBe(1234);
    expect(parseNumericValue("1,234.56")).toBe(1234.56);
  });

  it("should ignore currency symbols", function() {
    expect(parseNumericValue("$123")).toBe(123);
    expect(parseNumericValue("€123.45")).toBe(123.45);
    expect(parseNumericValue("£1,234")).toBe(1234);
    expect(parseNumericValue("¥100")).toBe(100);
  });

  it("should handle invalid inputs", function() {
    expect(parseNumericValue("abc")).toBe(null);
    expect(parseNumericValue("")).toBe(null);
    expect(parseNumericValue(null)).toBe(null);
  });
});

describe("parseTsv", function() {
  it("should parse valid TSV data", function() {
    const input = "Month\tRevenue\nJan\t100\nFeb\t200";
    const result = parseTsv(input);
    expect(result.headers).toEqual(["Month", "Revenue"]);
    expect(result.series.length).toBe(1);
    expect(result.series[0].name).toBe("Revenue");
    expect(result.series[0].values).toEqual([100, 200]);
    expect(result.xLabels).toEqual(["Jan", "Feb"]);
  });

  it("should handle numeric X values", function() {
    const input = "X\tY\n1\t10\n2\t20";
    const result = parseTsv(input);
    expect(result.numericX).toBe(true);
    expect(result.xValues).toEqual([1, 2]);
  });

  it("should throw error for invalid data", function() {
    expect(function() { parseTsv(""); }).toThrow();
    expect(function() { parseTsv("Header"); }).toThrow();
  });
});

describe("getSeriesMinMax", function() {
  it("should calculate min and max", function() {
    const series = [{ values: [1, 2, 3] }, { values: [4, 5] }];
    const result = getSeriesMinMax(series);
    expect(result.min).toBeCloseTo(0.6); // with padding
    expect(result.max).toBeCloseTo(5.4);
  });

  it("should return null for no numeric data", function() {
    const series = [{ values: [null, null] }];
    expect(getSeriesMinMax(series)).toBe(null);
  });
});