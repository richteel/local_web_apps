# TSV Graph Builder

A static web page that accepts tab-delimited data in a textarea and renders charts on a canvas.

Supported chart types:
- Line
- X-Y Scatter
- Bar

The app also generates accessibility guidance (short alt text, long description text, and embedding recommendations for web/Word).

## Project Requirements Implemented

This implementation satisfies the requested behavior:

- Input data is pasted as tab-delimited text.
- First row is treated as headers.
- First column is treated as X values.
- Remaining columns are treated as Y series.
- X-axis label comes from the first header.
- Y-series headers are shown in a legend.
- Chart type can be switched between scatter, line, and bar.
- Y-axis label can be entered by the user via textbox.
- Bar chart treats X values as categories (text), even if values are numeric.
- Non-numeric X values are displayed as text labels on the X-axis.

Accessibility features included:
- Semantic page sections and headings.
- Labeled form controls and helper text.
- Live status messaging.
- Canvas configured for assistive tech with title/description linkage.
- Auto-generated short alt text and long description based on current chart.
- Copy-ready guidance for webpage embedding and Word document usage.

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript (no external libraries)
- `<canvas>` for chart rendering

No build tooling or package installation is required.

## File Structure

- `index.html`  
  Main UI layout (inputs, canvas, and accessibility guidance sections).

- `styles.css`  
  Styling for controls, canvas region, accessibility guidance blocks, and focus states.

- `script.js`  
  Parsing, chart rendering, axis/legend drawing, and accessibility text generation logic.

- `test.html`  
  Test runner page using Jasmine for unit tests.

- `tests/script.test.js`  
  Unit test cases for core functions.

## How To Run

1. Open `index.html` in a modern browser.
2. Paste tab-delimited data into the input box.
3. Select chart type (`Line`, `Scatter`, or `Bar`).
4. Enter/update the Y-axis label (default: `$ in thousands`).
5. Click **Draw Graph**.

## Input Data Format

Use tab characters between columns.

Example:

```text
Month	Revenue	Expense
Jan	$120	$85
Feb	$145	$95
Mar	$160	$110
Apr	$180	$130
```

Rules:
- Row 1: headers (`X label`, then one or more series labels).
- Column 1: X values.
- Columns 2..N: numeric Y values for each series (thousand separators and currency symbols are automatically ignored).
- Blank or non-numeric Y values are skipped for plotting.

## How The Code Works

### 1) Parse phase

`parseTsv()`:
- Splits pasted text into rows.
- Uses first row as headers.
- Builds:
  - `xLabels` (original X text values)
  - `xValues` (numeric values or index values)
  - `series` arrays for Y values
- Detects whether X is numeric (`numericX`).

`parseNumericValue()`:
- Parses numeric values from strings, handling thousand separators (commas) and currency symbols by removing non-numeric characters except for digits, decimal points, and minus signs.

### 2) Render orchestration

`renderChartFromInput()`:
- Clears canvas and validates parsed data.
- Chooses X-axis behavior by chart type:
  - `bar` forces categorical X behavior.
  - `line`/`scatter` use numeric X only when valid.
- Computes plot ranges.
- Draws axes, grid, and legend.
- Draws chart-specific geometry.
- Generates accessibility output text.

### 3) Axis and legend

`drawAxes()`:
- Draws Y and X axes plus gridlines.
- Draws Y tick labels and X tick labels.
- For category X:
  - Bar labels are centered under bar groups.
  - Line/scatter labels align with plotted points.
- Uses the user-entered Y-axis label text.

`drawLegend()`:
- Draws color keys and series names from header labels.

### 4) Chart drawing

- `drawLineChart()` connects points per series.
- `drawScatterChart()` draws circular markers.
- `drawBarChart()` draws grouped bars per X category.

Helper mapping functions (`mapX`, `mapY`) convert data values into canvas coordinates.

### 5) Accessibility text generation

`updateAccessibilityContent()`:
- Creates short alt text summarizing chart type, axes, and series.
- Creates long description including sample X values and per-series min/max.
- Updates hidden canvas title/description content.
- Renders copy-ready web and Word guidance sections.

## Testing

Unit tests are provided using Jasmine (a browser-based testing framework, no installation required).

To run tests:
1. Open `test.html` in a modern browser.
2. View test results on the page (green for passes, red for failures).

Tests cover:
- Data parsing and number handling (including thousand separators and currency symbols).
- TSV validation and series min/max calculations.
- Core utility functions.

## Accessibility Embedding Guidance (Quick Summary)

When embedding elsewhere:

- **Web image/chart**
  - Use concise `alt` text.
  - Provide a nearby long description.
  - Link long description with `aria-describedby`.
  - Prefer semantic markup (`figure`, `figcaption`) for context.

- **Word**
  - Set short Alt Text description on the image.
  - Place full long description in normal document text near the chart.
  - Add a visible heading like "Chart description" for navigation.

## Limitations / Notes

- The chart is canvas-based and does not provide data-point-level keyboard interaction.
- Very large datasets may produce dense labels; the app samples X labels to reduce clutter.
- Parsing assumes tab-delimited input (not CSV).

## Future Enhancements

- CSV delimiter auto-detection.
- Image export button (PNG).
- Custom chart title input.
- Configurable color palettes.
- Data table rendering beneath chart for full non-visual equivalence.
