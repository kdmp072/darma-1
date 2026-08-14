export const SPPG_PDF_THEME = Object.freeze({
  headerBackground: Object.freeze([11, 31, 58]),
  headerText: Object.freeze([253, 230, 138]),
  sectionBackground: Object.freeze([11, 31, 58]),
  sectionText: Object.freeze([253, 230, 138]),
  labelBackground: Object.freeze([239, 246, 255]),
  tableHead: Object.freeze({
    fillColor: Object.freeze([21, 52, 91]),
    textColor: Object.freeze([253, 230, 138]),
    fontSize: 7.5,
    fontStyle: 'bold'
  })
});

export const NAKER_PDF_THEME = Object.freeze({
  headerBackground: Object.freeze([30, 58, 138]),
  headerText: Object.freeze([255, 255, 255]),
  sectionBackground: Object.freeze([29, 78, 216]),
  sectionText: Object.freeze([255, 255, 255]),
  labelBackground: Object.freeze([239, 246, 255]),
  tableHead: Object.freeze({
    fillColor: Object.freeze([37, 99, 235]),
    textColor: Object.freeze([255, 255, 255]),
    fontSize: 7.5,
    fontStyle: 'bold'
  })
});

export function themeForFormType(formType) {
  if (formType === 'SPPG') return SPPG_PDF_THEME;
  if (formType === 'NAKER') return NAKER_PDF_THEME;
  return null;
}
