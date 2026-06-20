// Courier report logic, kept free of DOM code so it can be unit tested.
// Works as a browser global (window.MoosReport) and as a CommonJS module.
(function (root) {
  const VALID_STATUSES = ["DELIVERED", "DELIVERED_TO_PUDO", "DELIVERY"];
  const REQUIRED_COLUMNS = ["delivery_status", "tour", "courier_name", "scan_date"];

  // Excel stores dates as days since 1899-12-30; already-formatted strings pass through
  function fmtDate(serial) {
    if (!serial) return "";
    if (typeof serial === "string") return serial;
    const d = new Date(Math.floor(serial - 25569) * 86400000);
    return String(d.getUTCDate()).padStart(2, "0") + "." +
           String(d.getUTCMonth() + 1).padStart(2, "0") + "." + d.getUTCFullYear();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /** Groups delivered parcels per courier, tour and scan date. Returns { error } or { results, meta }. */
  function buildReport(rows) {
    if (!rows.length) return { error: "Dosya boş." };
    const cols = Object.keys(rows[0]);
    if (!REQUIRED_COLUMNS.every((c) => cols.includes(c))) {
      return { error: "Gerekli sütunlar eksik: " + REQUIRED_COLUMNS.join(", ") };
    }

    const filtered = rows.filter((r) => VALID_STATUSES.includes(r.delivery_status));
    const map = {};
    filtered.forEach((r) => {
      const name = r.courier_name || "Bilinmeyen";
      const dateStr = fmtDate(r.scan_date);
      const tour = String(r.tour);
      if (!map[name]) map[name] = {};
      const key = tour + "|" + dateStr;
      if (!map[name][key]) map[name][key] = { tour, date: dateStr, count: 0, raw: r.scan_date };
      map[name][key].count++;
    });

    const results = Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, obj]) => {
        const entries = Object.values(obj).sort((a, b) => {
          if (a.tour !== b.tour) return Number(a.tour) - Number(b.tour);
          return a.raw - b.raw;
        });
        return { name, entries, total: entries.reduce((s, e) => s + e.count, 0) };
      });

    return {
      results,
      meta: {
        filteredRows: filtered.length,
        excluded: rows.length - filtered.length,
        couriers: results.length,
        grandTotal: filtered.length,
      },
    };
  }

  /** Rows for the downloadable workbook: per-day detail and per-tour totals. */
  function exportRows(results) {
    const detail = [];
    const totals = [];
    results.forEach((c) => {
      const tourMap = {};
      c.entries.forEach((e) => {
        detail.push({ courier_name: c.name, tour: Number(e.tour), scan_date: e.date, count: e.count });
        tourMap[e.tour] = (tourMap[e.tour] || 0) + e.count;
      });
      Object.entries(tourMap).sort(([a], [b]) => Number(a) - Number(b)).forEach(([tour, count]) => {
        totals.push({ courier_name: c.name, tour: Number(tour), count });
      });
    });
    return { detail, totals };
  }

  const api = { VALID_STATUSES, fmtDate, escapeHtml, buildReport, exportRows };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MoosReport = api;
})(typeof self !== "undefined" ? self : this);
