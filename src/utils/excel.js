import * as XLSX from "xlsx";

const normalizeHeader = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[đĐ]/g, "d")
  .toLowerCase()
  .replace(/[^a-z0-9]/g, "");

export const readExcelFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const workbook = XLSX.read(event.target.result, { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
      resolve(rawRows.map((row) => Object.entries(row).reduce((result, [key, value]) => {
        result[normalizeHeader(key)] = typeof value === "string" ? value.trim() : value;
        return result;
      }, {})));
    } catch (error) { reject(error); }
  };
  reader.onerror = reject;
  reader.readAsArrayBuffer(file);
});

export const exportExcel = (rows, fileName, sheetName = "Data") => {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  XLSX.writeFile(workbook, fileName);
};

export const downloadBlob = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
