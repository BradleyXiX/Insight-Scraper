export interface LeadItem {
  id?: number | string;
  business_name?: string;
  name?: string;
  "Business Name"?: string;
  contact?: string;
  "Contact"?: string;
  phone?: string;
  "Phone"?: string;
  email?: string;
  "Email"?: string;
  socials?: string;
  "Socials"?: string;
  website?: string;
  "Website"?: string;
  region?: string;
  "Region"?: string;
  has_chatbot_widget?: boolean;
  "Has_Chatbot_Widget"?: boolean;
  mobile_load_ms?: number;
  "Mobile_Load_Ms"?: number;
  mobile_load_time?: string;
  "Mobile Load Time"?: string;
  pagespeed_score?: string;
  "PageSpeed Score"?: string;
  pitch?: string;
  "Pitch"?: string;
  pitch_hook?: string;
  "Pitch_Hook"?: string;
  pitch_rank?: number | null;
  "Pitch_Rank"?: number | null;
  pitchRank?: number | null;
  query?: string;
  search_query?: string;
  "Search Query"?: string;
  created_at?: string;
}

export const SLOW_LOAD_MS = 3000;
export const SPEED_PITCH = "Pitch $750 Speed Overhaul (#2)";
export const RAG_PITCH = "Pitch $1,000 RAG Bot (#4)";
export const QUALIFIED_PITCH = "Qualified Enterprise AI Lead";

export type PitchTone = "attention" | "accent" | "neutral";

export function getMobileLoadMs(lead: LeadItem): number {
  if (lead.mobile_load_ms !== undefined) return Number(lead.mobile_load_ms);
  if (lead["Mobile_Load_Ms"] !== undefined) return Number(lead["Mobile_Load_Ms"]);
  return 0;
}

export function getHasChatbot(lead: LeadItem): boolean {
  if (lead.has_chatbot_widget !== undefined) return Boolean(lead.has_chatbot_widget);
  if (lead["Has_Chatbot_Widget"] !== undefined) return Boolean(lead["Has_Chatbot_Widget"]);
  return false;
}

export function getPitchHook(lead: LeadItem): string {
  if (lead.pitch_hook || lead["Pitch_Hook"]) {
    return lead.pitch_hook || lead["Pitch_Hook"] || "";
  }
  const loadMs = getMobileLoadMs(lead);
  const hasChatbot = getHasChatbot(lead);

  if (loadMs > SLOW_LOAD_MS) {
    return SPEED_PITCH;
  }
  if (!hasChatbot) {
    return RAG_PITCH;
  }
  return QUALIFIED_PITCH;
}

export function getPitchRank(lead: LeadItem): number | null {
  if (lead.pitch_rank !== undefined && lead.pitch_rank !== null) {
    const val = Number(lead.pitch_rank);
    return Number.isFinite(val) ? val : null;
  }
  if (lead["Pitch_Rank"] !== undefined && lead["Pitch_Rank"] !== null) {
    const val = Number(lead["Pitch_Rank"]);
    return Number.isFinite(val) ? val : null;
  }
  if (lead.pitchRank !== undefined && lead.pitchRank !== null) {
    const val = Number(lead.pitchRank);
    return Number.isFinite(val) ? val : null;
  }
  return null;
}

export const pitchRank = getPitchRank;

export function sortByPitch(leads: LeadItem[]): LeadItem[] {
  return [...leads].sort((a, b) => {
    const rankA = getPitchRank(a);
    const rankB = getPitchRank(b);

    if (rankA === null && rankB === null) return 0;
    if (rankA === null) return 1;
    if (rankB === null) return -1;

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    const loadA = getMobileLoadMs(a);
    const loadB = getMobileLoadMs(b);
    return loadB - loadA;
  });
}

export function pitchTone(pitch: string, rank?: number | null): PitchTone {
  if (rank === 1 || rank === 2) return "attention";
  if (rank === 3) return "accent";
  if (rank === 4 || rank === 5) return "neutral";

  if (pitch === SPEED_PITCH || /speed|load/i.test(pitch) || /https|not secure/i.test(pitch)) {
    return "attention";
  }
  if (pitch === RAG_PITCH || /rag|bot/i.test(pitch)) {
    return "accent";
  }
  return "neutral";
}

export interface Kpis {
  total: number;
  meanLoadMs: number | null;
  withoutChatbot: number;
  withoutChatbotPct: number;
  markets: number;
}

export function computeKpis(leads: LeadItem[]): Kpis {
  const total = leads.length;
  const measuredLeads = leads.map(getMobileLoadMs).filter((ms) => ms > 0);
  const meanLoadMs = measuredLeads.length > 0
    ? Math.round(measuredLeads.reduce((sum, ms) => sum + ms, 0) / measuredLeads.length)
    : null;

  const withoutChatbot = leads.filter((lead) => !getHasChatbot(lead)).length;
  const withoutChatbotPct = total > 0 ? Math.round((withoutChatbot / total) * 100) : 0;

  const regions = new Set<string>();
  for (const lead of leads) {
    const r = lead.region || lead["Region"];
    if (r && r.trim() !== "") {
      regions.add(r.trim());
    }
  }
  const markets = regions.size;

  return {
    total,
    meanLoadMs,
    withoutChatbot,
    withoutChatbotPct,
    markets,
  };
}

export function toCsv(leads: LeadItem[], fallback: { region: string; query: string }): string {
  const headers = [
    "Business Name",
    "Phone",
    "Website",
    "Email",
    "Socials",
    "Region",
    "Has_Chatbot_Widget",
    "Mobile_Load_Ms",
    "Pitch_Hook",
    "Contact Details",
    "Search Query",
    "Extracted At",
  ];

  const rows = leads.map((lead) => {
    const name = lead.business_name || lead["Business Name"] || lead.name || "Unknown Business";
    const phone = lead.phone || lead["Phone"] || lead.contact || lead["Contact"] || "Hidden";
    const website = lead.website || lead["Website"] || "";
    const email = lead.email || lead["Email"] || "";
    const socials = lead.socials || lead["Socials"] || "";
    const reg = lead.region || lead["Region"] || fallback.region;
    const hasChatbot = getHasChatbot(lead);
    const mobileLoadMs = getMobileLoadMs(lead);
    const pitchHook = getPitchHook(lead);
    const contact = lead.contact || lead["Contact"] || phone;
    const searchQuery = lead.query || lead.search_query || lead["Search Query"] || fallback.query;
    const createdAt = lead.created_at || new Date().toISOString();

    return [
      name,
      phone,
      website,
      email,
      socials,
      reg,
      hasChatbot ? "TRUE" : "FALSE",
      mobileLoadMs,
      pitchHook,
      contact,
      searchQuery,
      createdAt,
    ]
      .map((field) => `"${String(field ?? "").replace(/"/g, '""')}"`)
      .join(",");
  });

  const headerLine = headers.map((h) => `"${h}"`).join(",");
  return [headerLine, ...rows].join("\r\n");
}

/**
 * Stable JSON shape for the same fields as the CSV, so an export can be re-imported
 * without guessing which key a value came from.
 */
export function toJson(leads: LeadItem[], fallback: { region: string; query: string }): string {
  const records = leads.map((lead) => ({
    business_name:
      lead.business_name || lead["Business Name"] || lead.name || "Unknown Business",
    phone: lead.phone || lead["Phone"] || lead.contact || lead["Contact"] || "Hidden",
    website: lead.website || lead["Website"] || "",
    email: lead.email || lead["Email"] || "",
    socials: lead.socials || lead["Socials"] || "",
    region: lead.region || lead["Region"] || fallback.region,
    has_chatbot_widget: getHasChatbot(lead),
    mobile_load_ms: getMobileLoadMs(lead),
    pitch_hook: getPitchHook(lead),
    contact: lead.contact || lead["Contact"] || "",
    search_query:
      lead.query || lead.search_query || lead["Search Query"] || fallback.query,
    extracted_at: lead.created_at || new Date().toISOString(),
  }));

  return JSON.stringify(records, null, 2);
}
