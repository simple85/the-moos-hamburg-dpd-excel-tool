const { buildReport, escapeHtml, exportRows, fmtDate } = require("../report");

const row = (courier_name, tour, scan_date, delivery_status = "DELIVERED") => ({
  courier_name, tour, scan_date, delivery_status,
});

describe("fmtDate", () => {
  it.each([
    [46031, "09.01.2026"],
    [45658, "01.01.2025"],
    [46031.75, "09.01.2026"], // time of day is ignored
  ])("converts Excel serial %p to %p", (serial, expected) => {
    expect(fmtDate(serial)).toBe(expected);
  });

  it("passes through dates that are already text", () => {
    expect(fmtDate("09.01.2026")).toBe("09.01.2026");
  });

  it("returns an empty string for missing dates", () => {
    expect(fmtDate(undefined)).toBe("");
    expect(fmtDate(0)).toBe("");
  });
});

describe("buildReport", () => {
  it("rejects an empty sheet", () => {
    expect(buildReport([])).toEqual({ error: "Dosya boş." });
  });

  it("rejects sheets without the DPD columns", () => {
    expect(buildReport([{ name: "x" }]).error).toMatch(/^Gerekli sütunlar eksik/);
  });

  it("counts only delivered parcels", () => {
    const { meta } = buildReport([
      row("Ali", 1, 46031, "DELIVERED"),
      row("Ali", 1, 46031, "DELIVERED_TO_PUDO"),
      row("Ali", 1, 46031, "DELIVERY"),
      row("Ali", 1, 46031, "NOT_DELIVERED"),
      row("Ali", 1, 46031, "RETURNED"),
    ]);

    expect(meta).toEqual({ filteredRows: 3, excluded: 2, couriers: 1, grandTotal: 3 });
  });

  it("groups by courier, then tour and day", () => {
    const { results } = buildReport([
      row("Ben", 7, 46032),
      row("Ali", 12, 46031),
      row("Ali", 3, 46032),
      row("Ali", 12, 46031),
      row("Ali", 12, 46032),
    ]);

    expect(results.map((c) => c.name)).toEqual(["Ali", "Ben"]);
    expect(results[0]).toEqual({
      name: "Ali",
      total: 4,
      entries: [
        expect.objectContaining({ tour: "3", date: "10.01.2026", count: 1 }),
        expect.objectContaining({ tour: "12", date: "09.01.2026", count: 2 }),
        expect.objectContaining({ tour: "12", date: "10.01.2026", count: 1 }),
      ],
    });
  });

  it("sorts tours numerically, not alphabetically", () => {
    const { results } = buildReport([row("Ali", 10, 46031), row("Ali", 9, 46031), row("Ali", 100, 46031)]);
    expect(results[0].entries.map((e) => e.tour)).toEqual(["9", "10", "100"]);
  });

  it("puts parcels without a courier under 'Bilinmeyen'", () => {
    const { results } = buildReport([row("", 1, 46031)]);
    expect(results[0].name).toBe("Bilinmeyen");
  });

  it("handles a file where nothing was delivered", () => {
    const { results, meta } = buildReport([row("Ali", 1, 46031, "RETURNED")]);
    expect(results).toEqual([]);
    expect(meta.grandTotal).toBe(0);
  });
});

describe("exportRows", () => {
  it("produces per-day detail and per-tour totals for the Excel download", () => {
    const { results } = buildReport([row("Ali", 12, 46031), row("Ali", 12, 46032), row("Ali", 3, 46031)]);

    expect(exportRows(results)).toEqual({
      detail: [
        { courier_name: "Ali", tour: 3, scan_date: "09.01.2026", count: 1 },
        { courier_name: "Ali", tour: 12, scan_date: "09.01.2026", count: 1 },
        { courier_name: "Ali", tour: 12, scan_date: "10.01.2026", count: 1 },
      ],
      totals: [
        { courier_name: "Ali", tour: 3, count: 1 },
        { courier_name: "Ali", tour: 12, count: 2 },
      ],
    });
  });
});

it("escapes HTML in names taken from the uploaded file", () => {
  expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
});
