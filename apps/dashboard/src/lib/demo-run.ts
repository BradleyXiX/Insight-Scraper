import type { LeadItem } from "./leads";

export interface DemoRun {
  captured_at: string;
  query: string;
  region: string;
  source: string;
  source_label: string;
  limit: number;
  leads: LeadItem[];
}

/**
 * One real run, frozen for the public sample page.
 *
 * Captured from job 9394dd39-5cfe-44d4-b1e2-2b5fd26cf4a7 ("dental clinic", KE,
 * Google Maps, limit 10). Phone numbers and email addresses were removed before
 * publication; every other value is what the extractor produced. Do not hand-edit:
 * regenerate from a run, and let `demo-run.test.ts` prove nothing leaked.
 */
export const DEMO_RUN: DemoRun = {
  captured_at: "2026-11-18",
  query: "dental clinic",
  region: "KE",
  source: "gmaps",
  source_label: "Google Maps",
  limit: 10,
  leads: [
  {
    "business_name": "Garden Family Dental Clinic",
    "phone": "—",
    "email": "",
    "website": "https://www.drnguru.com",
    "has_chatbot_widget": false,
    "mobile_load_ms": 16443,
    "pitch_hook": "Your site takes 16.4s to load on a phone. Most visitors leave before three.",
    "pitch_rank": 1,
    "region": "KE",
    "email_subject": "Mobile load time for www.drnguru.com",
    "email_body": "Hi Garden Family Dental Clinic,\n\nI tested www.drnguru.com on a mobile connection and it took 16.4s to load. Most mobile visitors leave if a page takes more than three seconds.\n\nWould faster mobile loading help you convert more visitors?\n\nIf this is not relevant, tell me and I will not follow up."
  },
  {
    "business_name": "All Smiles Dental Practice Ltd",
    "phone": "—",
    "email": "",
    "website": "https://www.allsmiles.co.ke",
    "has_chatbot_widget": false,
    "mobile_load_ms": 7967,
    "pitch_hook": "Your site takes 8.0s to load on a phone. Most visitors leave before three.",
    "pitch_rank": 1,
    "region": "KE",
    "email_subject": "Mobile load time for www.allsmiles.co.ke",
    "email_body": "Hi All Smiles Dental Practice Ltd,\n\nI tested www.allsmiles.co.ke on a mobile connection and it took 8.0s to load. Most mobile visitors leave if a page takes more than three seconds.\n\nWould faster mobile loading help you convert more visitors?\n\nIf this is not relevant, tell me and I will not follow up."
  },
  {
    "business_name": "Gottel Dental Center",
    "phone": "—",
    "email": "",
    "website": "https://www.gotteldentalcenter.com",
    "has_chatbot_widget": false,
    "mobile_load_ms": 5709,
    "pitch_hook": "Your site takes 5.7s to load on a phone. Most visitors leave before three.",
    "pitch_rank": 1,
    "region": "KE",
    "email_subject": "Mobile load time for www.gotteldentalcenter.com",
    "email_body": "Hi Gottel Dental Center,\n\nI tested www.gotteldentalcenter.com on a mobile connection and it took 5.7s to load. Most mobile visitors leave if a page takes more than three seconds.\n\nWould faster mobile loading help you convert more visitors?\n\nIf this is not relevant, tell me and I will not follow up."
  },
  {
    "business_name": "Dentplan Dental Surgeons",
    "phone": "—",
    "email": "",
    "website": "https://www.dentplan.org",
    "has_chatbot_widget": true,
    "mobile_load_ms": 5246,
    "pitch_hook": "Your site takes 5.2s to load on a phone. Most visitors leave before three.",
    "pitch_rank": 1,
    "region": "KE",
    "email_subject": "Mobile load time for www.dentplan.org",
    "email_body": "Hi Dentplan Dental Surgeons,\n\nI tested www.dentplan.org on a mobile connection and it took 5.2s to load. Most mobile visitors leave if a page takes more than three seconds.\n\nWould faster mobile loading help you convert more visitors?\n\nIf this is not relevant, tell me and I will not follow up."
  },
  {
    "business_name": "Century Dentistry",
    "phone": "—",
    "email": "",
    "website": "https://www.centurydentistry.co.ke",
    "has_chatbot_widget": false,
    "mobile_load_ms": 3835,
    "pitch_hook": "Your site takes 3.8s to load on a phone. Most visitors leave before three.",
    "pitch_rank": 1,
    "region": "KE",
    "email_subject": "Mobile load time for www.centurydentistry.co.ke",
    "email_body": "Hi Century Dentistry,\n\nI tested www.centurydentistry.co.ke on a mobile connection and it took 3.8s to load. Most mobile visitors leave if a page takes more than three seconds.\n\nWould faster mobile loading help you convert more visitors?\n\nIf this is not relevant, tell me and I will not follow up."
  },
  {
    "business_name": "Rycedental Supplies Ltd",
    "phone": "—",
    "email": "",
    "website": "https://www.rycedentalsupplies.com",
    "has_chatbot_widget": false,
    "mobile_load_ms": 3500,
    "pitch_hook": "Your site takes 3.5s to load on a phone. Most visitors leave before three.",
    "pitch_rank": 1,
    "region": "KE",
    "email_subject": "Mobile load time for www.rycedentalsupplies.com",
    "email_body": "Hi Rycedental Supplies Ltd,\n\nI tested www.rycedentalsupplies.com on a mobile connection and it took 3.5s to load. Most mobile visitors leave if a page takes more than three seconds.\n\nWould faster mobile loading help you convert more visitors?\n\nIf this is not relevant, tell me and I will not follow up."
  },
  {
    "business_name": "Yaya Dental Centre",
    "phone": "—",
    "email": "",
    "website": "https://www.yayadental.co.ke",
    "has_chatbot_widget": false,
    "mobile_load_ms": 3292,
    "pitch_hook": "Your site takes 3.3s to load on a phone. Most visitors leave before three.",
    "pitch_rank": 1,
    "region": "KE",
    "email_subject": "Mobile load time for www.yayadental.co.ke",
    "email_body": "Hi Yaya Dental Centre,\n\nI tested www.yayadental.co.ke on a mobile connection and it took 3.3s to load. Most mobile visitors leave if a page takes more than three seconds.\n\nWould faster mobile loading help you convert more visitors?\n\nIf this is not relevant, tell me and I will not follow up."
  },
  {
    "business_name": "Abdallah & Associates Dental and Implant Centre (CBD)",
    "phone": "—",
    "email": "",
    "website": "",
    "has_chatbot_widget": false,
    "mobile_load_ms": 0,
    "pitch_hook": "There is no site to find — just a directory listing.",
    "pitch_rank": 4,
    "region": "KE",
    "email_subject": "Online presence for Abdallah & Associates Dental and Implant Centre (CBD)",
    "email_body": "Hi Abdallah & Associates Dental and Implant Centre (CBD),\n\nI searched for Abdallah & Associates Dental and Implant Centre (CBD) online and found a directory listing, but no dedicated website for your business.\n\nAre you looking to set up a dedicated website to capture local search leads?\n\nIf this is not relevant, tell me and I will not follow up."
  },
  {
    "business_name": "Abdallah & Associates Dental and Implant Centre ( Parklands )",
    "phone": "—",
    "email": "",
    "website": "",
    "has_chatbot_widget": false,
    "mobile_load_ms": 0,
    "pitch_hook": "There is no site to find — just a directory listing.",
    "pitch_rank": 4,
    "region": "KE",
    "email_subject": "Online presence for Abdallah & Associates Dental and Implant Centre ( Parklands )",
    "email_body": "Hi Abdallah & Associates Dental and Implant Centre ( Parklands ),\n\nI searched for Abdallah & Associates Dental and Implant Centre ( Parklands ) online and found a directory listing, but no dedicated website for your business.\n\nAre you looking to set up a dedicated website to capture local search leads?\n\nIf this is not relevant, tell me and I will not follow up."
  },
  {
    "business_name": "Mirage Dental Clinic",
    "phone": "—",
    "email": "",
    "website": "",
    "has_chatbot_widget": false,
    "mobile_load_ms": 0,
    "pitch_hook": "There is no site to find — just a directory listing.",
    "pitch_rank": 4,
    "region": "KE",
    "email_subject": "Online presence for Mirage Dental Clinic",
    "email_body": "Hi Mirage Dental Clinic,\n\nI searched for Mirage Dental Clinic online and found a directory listing, but no dedicated website for your business.\n\nAre you looking to set up a dedicated website to capture local search leads?\n\nIf this is not relevant, tell me and I will not follow up."
  }
],
};

export const DEMO_PROVENANCE =
  "One real run, captured 2026-11-18. Contact details are masked for publication; " +
  "load times, signals and pitches are exactly what the tool produced.";
