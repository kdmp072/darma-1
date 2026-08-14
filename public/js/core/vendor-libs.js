export function getVendorLibraries(globalObject = window) {
  return Object.freeze({
    leaflet: globalObject.L || null,
    xlsx: globalObject.XLSX || null,
    jsPDF: globalObject.jspdf && globalObject.jspdf.jsPDF || null,
    docx: globalObject.docx || null,
    PptxGenJS: globalObject.PptxGenJS || null
  });
}
