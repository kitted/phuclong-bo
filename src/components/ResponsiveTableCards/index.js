import { useEffect } from "react";

const normalizeLabel = (value) => String(value || "").replace(/\s+/g, " ").trim();

const prepareTable = (table) => {
  if (!(table instanceof HTMLTableElement)) return;
  if (table.dataset.mobileTable === "keep" || table.closest('[data-mobile-table-scope="keep"]'))
    return;

  const headers = Array.from(table.querySelectorAll("thead tr:first-child th")).map((cell) =>
    normalizeLabel(cell.textContent)
  );
  if (!headers.length) return;

  table.classList.add("admin-responsive-table");
  table.querySelectorAll("tbody tr").forEach((row) => {
    const cells = Array.from(row.children).filter((cell) => cell.tagName === "TD");
    const fullRow = cells.length === 1 && Number(cells[0]?.colSpan || 1) > 1;
    row.classList.toggle("admin-responsive-table-full-row", fullRow);

    cells.forEach((cell, index) => {
      if (fullRow) {
        cell.removeAttribute("data-label");
        return;
      }
      const label = headers[index] || "";
      cell.dataset.label = label;
      cell.classList.toggle("admin-responsive-table-actions", !label);
    });
  });
};

const scanTables = (root) => {
  if (!(root instanceof Element) && root !== document) return;
  if (root instanceof HTMLTableElement) prepareTable(root);
  root.querySelectorAll?.("table").forEach(prepareTable);
  const parentTable = root instanceof Element ? root.closest("table") : null;
  if (parentTable) prepareTable(parentTable);
};

export default function ResponsiveTableCards() {
  useEffect(() => {
    scanTables(document);
    const pendingTables = new Set();
    let frameId = null;

    const queueTables = (root) => {
      if (!(root instanceof Element)) return;
      if (root instanceof HTMLTableElement) pendingTables.add(root);
      root.querySelectorAll?.("table").forEach((table) => pendingTables.add(table));
      const parentTable = root.closest("table");
      if (parentTable) pendingTables.add(parentTable);
      if (frameId === null) {
        frameId = window.requestAnimationFrame(() => {
          pendingTables.forEach(prepareTable);
          pendingTables.clear();
          frameId = null;
        });
      }
    };

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) queueTables(node);
        });
        if (mutation.target instanceof Element) queueTables(mutation.target);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, []);

  return null;
}
