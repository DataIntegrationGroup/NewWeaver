/**
 * OSE Points of Diversion coded-value lookups. The WATERS database stores
 * water-right status, POD status, and use as short codes; these maps render
 * them human-readable as "CODE: Label". Labels are taken verbatim from the
 * original Weaver OSE filter. Formatting happens at display time only — the raw
 * codes stay in the data so the OSE filter keeps matching on them.
 */

/** Water-right status (`status`). */
export const OSE_STATUS_LABELS: Record<string, string> = {
  ADJ: "Adjudicated",
  ADM: "Administrative",
  APP: "Application",
  APR: "Application Being Protested",
  CAN: "Cancelled",
  CLS: "Closed File",
  DCL: "Declaration",
  DED: "Dedicated",
  DEN: "Denied",
  EXP: "Expired",
  HS: "Hydrographic Survey",
  LIC: "Licensed",
  NOI: "Notice of Intention",
  NOT: "Not — implies that there is no status",
  OMS: "Owner Management Status",
  OOJ: "Offer of Judgment",
  PBU: "Proof of Beneficial Use",
  PMT: "Permit",
  PRG: "Purged Conversion Record",
  REN: "Renumbered",
  RET: "Retired",
  TRN: "Transferred",
  WMS: "Water Master Status",
  WTD: "Withdrawn",
}

/** POD status (`pod_status`). */
export const OSE_POD_STATUS_LABELS: Record<string, string> = {
  PEN: "Pending",
  PLG: "Plugged",
  CAP: "Capped",
  INC: "Inactive",
  ACT: "Active",
}

/** Use of water (`use_`). */
export const OSE_USE_LABELS: Record<string, string> = {
  AGR: "Agriculture other than irrigation",
  AUG: "Augmentation well",
  BPW: "Brine production well",
  CEM: "Cemetery",
  CLS: "Closed file",
  COM: "Commercial",
  CON: "Construction",
  CPS: "Cathodic protection well",
  DAI: "Dairy operation",
  DCN: "Domestic construction",
  DEW: "Dewatering well",
  DOL: "72-12-1 domestic and livestock watering",
  DOM: "72-12-1 domestic one household",
  EXP: "Exploration",
  FCD: "Flood control",
  FGP: "Fish and game propagation",
  FPO: "Feed pen operation",
  GEO: "Geothermal boreholes",
  HWY: "Highway construction",
  IND: "Industrial",
  INJ: "Injection",
  IRR: "Irrigation",
  MDW: "Community type use - mdwca, private or commercial supplied",
  MFG: "Manufacturing",
  MIL: "Military - military installations",
  MIN: "Mining or milling or oil",
  MOB: "Mobile home parks",
  MON: "Monitoring well",
  MPP: "Meat packing plant",
  MUL: "72-12-1 multiple domestic households",
  MUN: "Municipal - city or county supplied water",
  N07: "No pre-1907 water right exists on this land",
  NON: "Non-profit organizational use",
  NOT: "No use of right or POD",
  NRT: "No right",
  OBS: "Observation",
  OFM: "Oil field maintenance",
  OIL: "Oil production",
  PDL: "Non 72-12-1 domestic and livestock watering",
  PDM: "Non 72-12-1 domestic one household",
  PLS: "Non 72-12-1 livestock watering",
  PMH: "Non 72-12-1 multiple domestic households",
  POL: "Pollution control well",
  POU: "Poultry and egg operation",
  PPP: "Petroleum processing plant",
  PRO: "72-12-1 Prospecting or development of natural resource",
  PUB: "72-12-1 Construction of public works",
  REC: "Recreation",
  SAN: "72-12-1 Sanitary in conjunction with a commercial use",
  SCH: "School use - public, private, parochial, & universities",
  SRO: "Secondary recovery of oil",
  STK: "72-12-1 livestock watering",
  STO: "Storage",
  STR: "Strategic water reserve",
  SUB: "Subdivision",
  SWR: "Stacked water right",
  TBD: "To be determined",
  UTL: "Public utility",
}

/** The coded POD field name → its label lookup. */
const OSE_CODE_FIELDS: Record<string, Record<string, string>> = {
  status: OSE_STATUS_LABELS,
  pod_status: OSE_POD_STATUS_LABELS,
  use_: OSE_USE_LABELS,
}

/** "CODE: Label" for a coded value; the raw code when unmapped; "" when empty. */
function codeLabel(value: unknown, labels: Record<string, string>): string {
  const code = String(value ?? "").trim()
  if (!code) return ""
  const label = labels[code]
  return label ? `${code}: ${label}` : code
}

/**
 * Display formatter for OSE POD properties: expand coded fields to
 * "Label (CODE)", pass everything else through unchanged. Suitable as a
 * layer's `formatValue`.
 */
export function formatOseValue(key: string, value: unknown): string {
  const labels = OSE_CODE_FIELDS[key]
  return labels ? codeLabel(value, labels) : String(value ?? "")
}
