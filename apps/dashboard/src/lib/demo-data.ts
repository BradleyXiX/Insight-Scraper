export interface DemoLead {
  name: string;
  region: string;
  phone: string;
  website: string;
  loadMs: number;
  hasChatbot: boolean;
}

export const DEMO_QUERY = "medspas in Austin, TX";
export const DEMO_REGION = "US";
export const DEMO_SOURCE = "Google Maps";

export const DEMO_STAGES: readonly string[] = [
  "Queued",
  "Fetching 1/3",
  "Fetching 3/3",
  "Parsing",
  "Enriching",
  "Done",
] as const;

export const DEMO_LEADS: readonly DemoLead[] = [
  {
    name: "Cedar North Aesthetics",
    region: "US",
    phone: "512-555-0142",
    website: "https://cedarnorthaesthetics.com",
    loadMs: 4317,
    hasChatbot: true,
  },
  {
    name: "Barton Creek Skin Studio",
    region: "US",
    phone: "512-555-0188",
    website: "https://bartoncreekskin.com",
    loadMs: 1842,
    hasChatbot: true,
  },
  {
    name: "Lone Star Laser Collective",
    region: "US",
    phone: "512-555-0119",
    website: "https://lonestarlaseratx.com",
    loadMs: 6120,
    hasChatbot: false,
  },
  {
    name: "Verde Wellness ATX",
    region: "US",
    phone: "512-555-0164",
    website: "https://verdewellnessatx.com",
    loadMs: 2905,
    hasChatbot: false,
  },
  {
    name: "Mesa Med Spa Group",
    region: "US",
    phone: "512-555-0193",
    website: "https://mesamedspagroup.com",
    loadMs: 3688,
    hasChatbot: true,
  },
] as const;

