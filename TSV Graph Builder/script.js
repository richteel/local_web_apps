const inputEl = document.getElementById("dataInput");
const chartTypeEl = document.getElementById("chartType");
const yAxisLabelEl = document.getElementById("yAxisLabel");
const drawBtn = document.getElementById("drawBtn");
const statusEl = document.getElementById("status");
const canvas = document.getElementById("chartCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;
const chartTitleEl = document.getElementById("chartTitle");
const chartDescEl = document.getElementById("chartDesc");
const altTextOutputEl = document.getElementById("altTextOutput");
const longDescOutputEl = document.getElementById("longDescOutput");
const webGuidanceEl = document.getElementById("webGuidance");
const wordGuidanceEl = document.getElementById("wordGuidance");

const palette = [
  "#1976d2",
  "#2e7d32",
  "#ef6c00",
  "#7b1fa2",
  "#d32f2f",
  "#00838f",
  "#5d4037",
  "#455a64"
];

if (drawBtn) {
  drawBtn.addEventListener("click", renderChartFromInput);
}

window.addEventListener("load", () => {
  if (inputEl) {
    inputEl.value = "Month\tRevenue\tExpense\nJan\t120\t85\nFeb\t145\t95\nMar\t160\t110\nApr\t180\t130";
    if (drawBtn) {
      renderChartFromInput();
    }
  }
});

function renderChartFromInput() {
  if (!ctx) return;
  clearCanvas();
  setStatus("");

  let parsed;
  try {
    parsed = parseTsv(inputEl.value);
  } catch (err) {
    setStatus(err.message);
    return;
  }

  const chartType = chartTypeEl.value;
  const layout = getLayout();
  const numericX = chartType === "bar" ? false : parsed.numericX;
  const seriesStats = getSeriesMinMax(parsed.series);
  const xStats = getXStats(parsed.xValues, numericX);
  const yAxisLabel = (yAxisLabelEl.value || "").trim() || "Y Values";

  if (!seriesStats) {
    setStatus("No numeric Y data found in the provided rows.");
    return;
  }

  drawAxes(
    ctx,
    layout,
    parsed.headers[0],
    yAxisLabel,
    xStats,
    seriesStats,
    numericX,
    parsed.xLabels,
    chartType
  );
  drawLegend(ctx, layout, parsed.series, palette);

  if (chartType === "line") {
    drawLineChart(ctx, layout, parsed, xStats, seriesStats, numericX);
  } else if (chartType === "scatter") {
    drawScatterChart(ctx, layout, parsed, xStats, seriesStats, numericX);
  } else {
    drawBarChart(ctx, layout, parsed, xStats, seriesStats, numericX);
  }

  updateAccessibilityContent(parsed, chartType, yAxisLabel, numericX);
}

function parseNumericValue(raw) {
  const normalized = String(raw ?? "").trim().replace(/[^0-9.-]/g, "");
  if (normalized === "") return null;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function parseTsv(text) {
  const rawRows = text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter((row) => row.length > 0);

  if (rawRows.length < 2) {
    throw new Error("Please provide a header row and at least one data row.");
  }

  const rows = rawRows.map((row) => row.split("\t"));
  const headers = rows[0].map((value) => value.trim());

  if (headers.length < 2) {
    throw new Error("Please include one X column and at least one Y series column.");
  }

  const series = headers.slice(1).map((name) => ({ name, values: [] }));
  const xRawValues = [];
  const xNumericValues = [];
  const xValues = [];
  const xLabels = [];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (row.length < 2) {
      continue;
    }

    const xRaw = (row[0] ?? "").trim();
    xRawValues.push(xRaw);
    xNumericValues.push(parseNumericValue(xRaw));
    xLabels.push(xRaw || String(i));

    for (let s = 0; s < series.length; s += 1) {
      const raw = (row[s + 1] ?? "").trim();
      const yNum = parseNumericValue(raw);
      series[s].values.push(yNum);
    }
  }

  if (xRawValues.length === 0) {
    throw new Error("No data rows were found.");
  }

  const numericX = xNumericValues.every((value) => Number.isFinite(value));
  for (let i = 0; i < xRawValues.length; i += 1) {
    xValues.push(numericX ? xNumericValues[i] : i);
  }

  return { headers, series, xValues, xLabels, numericX };
}

function getSeriesMinMax(seriesList) {
  let min = Infinity;
  let max = -Infinity;
  for (const series of seriesList) {
    for (const value of series.values) {
      if (Number.isFinite(value)) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return null;
  }
  if (min === max) {
    return { min: min - 1, max: max + 1 };
  }
  const pad = (max - min) * 0.1;
  return { min: min - pad, max: max + pad };
}

function getXStats(xValues, numericX) {
  if (!numericX) {
    return { min: 0, max: Math.max(1, xValues.length - 1) };
  }
  let min = Infinity;
  let max = -Infinity;
  for (const x of xValues) {
    min = Math.min(min, x);
    max = Math.max(max, x);
  }
  if (min === max) {
    min -= 1;
    max += 1;
  }
  return { min, max };
}

function drawAxes(context, layout, xLabel, yLabel, xStats, yStats, numericX, xLabels, chartType) {
  const { left, right, top, bottom, width, height } = layout;

  context.strokeStyle = "#253648";
  context.lineWidth = 1.4;

  context.beginPath();
  context.moveTo(left, top);
  context.lineTo(left, bottom);
  context.lineTo(right, bottom);
  context.stroke();

  const yTicks = 5;
  context.fillStyle = "#1f2a37";
  context.textAlign = "right";
  context.textBaseline = "middle";
  context.font = "12px Arial";

  for (let i = 0; i <= yTicks; i += 1) {
    const t = i / yTicks;
    const y = bottom - t * height;
    const v = yStats.min + t * (yStats.max - yStats.min);

    context.strokeStyle = "#e6eef7";
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(right, y);
    context.stroke();

    context.fillStyle = "#2f3e4e";
    context.fillText(formatNumber(v), left - 8, y);
  }

  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillStyle = "#1f2a37";
  context.font = "bold 14px Arial";
  context.fillText(xLabel || "X Axis", left + width / 2, bottom + 28);

  const xTicks = Math.min(8, Math.max(2, Math.floor(width / 110)));
  context.textAlign = "center";
  context.textBaseline = "top";
  context.font = "12px Arial";

  if (numericX) {
    for (let i = 0; i <= xTicks; i += 1) {
      const t = i / xTicks;
      const x = left + t * width;
      const v = xStats.min + t * (xStats.max - xStats.min);

      context.strokeStyle = "#e6eef7";
      context.beginPath();
      context.moveTo(x, top);
      context.lineTo(x, bottom);
      context.stroke();

      context.fillStyle = "#2f3e4e";
      context.fillText(formatNumber(v), x, bottom + 8);
    }
  } else {
    const count = xLabels.length;
    const step = Math.max(1, Math.ceil(count / 10));
    for (let i = 0; i < count; i += step) {
      const x = chartType === "bar"
        ? layout.left + ((i + 0.5) / Math.max(1, count)) * layout.width
        : mapX(i, layout, xStats);

      context.strokeStyle = "#e6eef7";
      context.beginPath();
      context.moveTo(x, top);
      context.lineTo(x, bottom);
      context.stroke();

      context.fillStyle = "#2f3e4e";
      context.fillText(xLabels[i], x, bottom + 8);
    }
  }

  context.save();
  context.translate(18, top + height / 2);
  context.rotate(-Math.PI / 2);
  context.textAlign = "center";
  context.textBaseline = "top";
  context.font = "bold 14px Arial";
  context.fillStyle = "#1f2a37";
  context.fillText(yLabel, 0, 0);
  context.restore();
}

function drawLegend(context, layout, seriesList, colors) {
  const startX = layout.right + 20;
  const startY = layout.top + 10;
  const rowH = 22;

  context.font = "12px Arial";
  context.textAlign = "left";
  context.textBaseline = "middle";

  for (let i = 0; i < seriesList.length; i += 1) {
    const y = startY + i * rowH;
    context.fillStyle = colors[i % colors.length];
    context.fillRect(startX, y - 6, 14, 14);
    context.fillStyle = "#1f2a37";
    context.fillText(seriesList[i].name || `Series ${i + 1}`, startX + 20, y + 1);
  }
}

function drawLineChart(context, layout, parsed, xStats, yStats, numericX) {
  for (let s = 0; s < parsed.series.length; s += 1) {
    const series = parsed.series[s];
    context.strokeStyle = palette[s % palette.length];
    context.lineWidth = 2;
    context.beginPath();

    let hasStarted = false;
    for (let i = 0; i < series.values.length; i += 1) {
      const yVal = series.values[i];
      if (!Number.isFinite(yVal)) {
        hasStarted = false;
        continue;
      }

      const xVal = numericX ? parsed.xValues[i] : i;
      const x = mapX(xVal, layout, xStats);
      const y = mapY(yVal, layout, yStats);

      if (!hasStarted) {
        context.moveTo(x, y);
        hasStarted = true;
      } else {
        context.lineTo(x, y);
      }
    }
    context.stroke();
  }
}

function drawScatterChart(context, layout, parsed, xStats, yStats, numericX) {
  for (let s = 0; s < parsed.series.length; s += 1) {
    const series = parsed.series[s];
    context.fillStyle = palette[s % palette.length];

    for (let i = 0; i < series.values.length; i += 1) {
      const yVal = series.values[i];
      if (!Number.isFinite(yVal)) {
        continue;
      }

      const xVal = numericX ? parsed.xValues[i] : i;
      const x = mapX(xVal, layout, xStats);
      const y = mapY(yVal, layout, yStats);

      context.beginPath();
      context.arc(x, y, 4, 0, Math.PI * 2);
      context.fill();
    }
  }
}

function drawBarChart(context, layout, parsed, xStats, yStats, numericX) {
  const groupCount = parsed.xValues.length;
  const seriesCount = parsed.series.length;
  const barXStats = numericX ? getBarXStatsForNumeric(parsed.xValues, xStats) : xStats;
  const groupPixel = numericX
    ? getMinMappedGap(parsed.xValues, layout, barXStats)
    : layout.width / Math.max(1, groupCount);
  const barW = Math.max(3, (groupPixel * 0.8) / Math.max(1, seriesCount));

  for (let s = 0; s < seriesCount; s += 1) {
    const series = parsed.series[s];
    context.fillStyle = palette[s % palette.length];

    for (let i = 0; i < groupCount; i += 1) {
      const yVal = series.values[i];
      if (!Number.isFinite(yVal)) {
        continue;
      }

      const xCenter = numericX
        ? mapX(parsed.xValues[i], layout, barXStats)
        : layout.left + ((i + 0.5) / Math.max(1, groupCount)) * layout.width;
      const x = xCenter - (seriesCount * barW) / 2 + s * barW;
      const y = mapY(yVal, layout, yStats);
      const h = layout.bottom - y;

      context.fillRect(x, y, barW - 1, h);
    }
  }
}

function getBarXStatsForNumeric(xValues, xStats) {
  if (xValues.length === 1) {
    return { min: xValues[0] - 0.5, max: xValues[0] + 0.5 };
  }

  const firstGap = Math.abs(xValues[1] - xValues[0]);
  const lastGap = Math.abs(xValues[xValues.length - 1] - xValues[xValues.length - 2]);
  const fallbackGap = (xStats.max - xStats.min) / Math.max(1, xValues.length - 1);
  const leftPad = firstGap > 0 ? firstGap / 2 : fallbackGap / 2;
  const rightPad = lastGap > 0 ? lastGap / 2 : fallbackGap / 2;

  return { min: xStats.min - leftPad, max: xStats.max + rightPad };
}

function getMinMappedGap(xValues, layout, barXStats) {
  if (xValues.length < 2) {
    return layout.width;
  }

  let minGap = Infinity;
  for (let i = 1; i < xValues.length; i += 1) {
    const prev = mapX(xValues[i - 1], layout, barXStats);
    const curr = mapX(xValues[i], layout, barXStats);
    const gap = Math.abs(curr - prev);
    if (gap > 0) {
      minGap = Math.min(minGap, gap);
    }
  }

  if (!Number.isFinite(minGap)) {
    return layout.width / Math.max(1, xValues.length);
  }
  return minGap;
}

function mapX(value, layout, stats) {
  const t = (value - stats.min) / (stats.max - stats.min);
  return layout.left + t * layout.width;
}

function mapY(value, layout, stats) {
  const t = (value - stats.min) / (stats.max - stats.min);
  return layout.bottom - t * layout.height;
}

function getLayout() {
  return {
    left: 78,
    right: canvas.width - 180,
    top: 26,
    bottom: canvas.height - 64,
    width: canvas.width - 258,
    height: canvas.height - 90
  };
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return "";
  }
  if (Math.abs(value) >= 1000 || Math.abs(value) < 0.01) {
    return value.toExponential(2);
  }
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function setStatus(message) {
  statusEl.textContent = message;
}

function updateAccessibilityContent(parsed, chartType, yAxisLabel, numericX) {
  const chartTypeLabel = chartType === "scatter" ? "X-Y scatter" : chartType;
  const xLabel = parsed.headers[0] || "X axis";
  const seriesNames = parsed.series.map((s) => s.name || "Unnamed series");
  const xValuesText = sampleList(parsed.xLabels, 6);
  const yRanges = parsed.series
    .map((series) => {
      const stats = getSeriesStats(series.values);
      if (!stats) {
        return `${series.name}: no numeric values`;
      }
      return `${series.name}: min ${formatNumber(stats.min)}, max ${formatNumber(stats.max)}`;
    })
    .join("; ");

  const altText =
    `${chartTypeLabel} chart. X axis is ${xLabel}. Y axis is ${yAxisLabel}. ` +
    `Series shown: ${seriesNames.join(", ")}.`;

  const longDesc =
    `This ${chartTypeLabel} chart uses tab-delimited source data. ` +
    `The X axis is labeled "${xLabel}" and the Y axis is labeled "${yAxisLabel}". ` +
    `The chart includes ${seriesNames.length} series: ${seriesNames.join(", ")}. ` +
    `Sample X values include ${xValuesText}. ` +
    `Series ranges are: ${yRanges}. ` +
    `${numericX ? "X values are treated as numeric values." : "X values are treated as categories."}`;

  altTextOutputEl.value = altText;
  longDescOutputEl.value = longDesc;
  chartTitleEl.textContent = `Generated ${chartTypeLabel} chart`;
  chartDescEl.textContent = longDesc;
  canvas.setAttribute("aria-label", altText);

  renderWebGuidance(altText, longDesc);
  renderWordGuidance(altText, longDesc);
}

function getSeriesStats(values) {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (Number.isFinite(value)) {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return null;
  }
  return { min, max };
}

function sampleList(items, maxItems) {
  const list = items.slice(0, maxItems).filter((item) => item && item.trim().length > 0);
  if (list.length === 0) {
    return "no X labels provided";
  }
  const base = list.join(", ");
  return items.length > maxItems ? `${base}, and more` : base;
}

function renderWebGuidance(altText, longDesc) {
  webGuidanceEl.innerHTML = "";
  const exampleHtml = [
    "<figure>",
    `  <img src=\"chart.png\" alt=\"${escapeHtml(altText)}\" aria-describedby=\"chart-longdesc\">`,
    "  <figcaption>Chart generated from tab-delimited input data.</figcaption>",
    "</figure>",
    `<div id=\"chart-longdesc\">${escapeHtml(longDesc)}</div>`
  ].join("\n");

  const lines = [
    "Use an <img> element for exported chart images and include concise alt text.",
    "Use aria-describedby to connect the image to a nearby long description block.",
    "Use <figure> and <figcaption> when the caption adds meaningful context.",
    "Avoid adding redundant ARIA roles to native elements (for example, do not add role=\"img\" to <img>).",
    "If the chart is interactive in the browser, keep keyboard access and ensure status updates are in an aria-live region."
  ];

  appendGuidance(webGuidanceEl, lines, exampleHtml);
}

function renderWordGuidance(altText, longDesc) {
  wordGuidanceEl.innerHTML = "";
  const lines = [
    "Right-click the chart image in Word, then select Edit Alt Text.",
    `Set the Alt Text Description to: "${altText}"`,
    "Keep alt text short and outcome-focused; do not repeat full data tables in alt text.",
    "Place the detailed description text in normal document content directly after the chart image.",
    "Add a visible heading such as \"Chart description\" before the long description so screen reader users can find it quickly."
  ];

  appendGuidance(wordGuidanceEl, lines, longDesc);
}

function appendGuidance(container, lines, codeOrText) {
  for (const line of lines) {
    const p = document.createElement("p");
    p.textContent = `- ${line}`;
    container.appendChild(p);
  }

  const pre = document.createElement("pre");
  pre.textContent = codeOrText;
  pre.style.whiteSpace = "pre-wrap";
  pre.style.marginTop = "0.6rem";
  pre.style.background = "#f3f8ff";
  pre.style.padding = "0.6rem";
  pre.style.borderRadius = "6px";
  pre.style.border = "1px solid #d9e5f3";
  container.appendChild(pre);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}
