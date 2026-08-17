/**
 * DEV-ONLY fixtures for /preview-import.html.
 *
 * The template catalogue is a verbatim dump of what `GET /imports/templates`
 * serves, produced from internal/service/importtemplate in the API repo — not
 * hand-written copy. If the wording here looks wrong, it is wrong in the
 * catalogue, which is the point of previewing against it.
 */
import type { components } from './api/schema';

type ImportTemplate = components['schemas']['ImportTemplate'];

export const previewTemplates: ImportTemplate[] = [
  {
    "autoDetected": true,
    "confidence": "exact",
    "description": "ForeFlight Logbook export. Carries a separate Aircraft Table, so your fleet — make, model and class — is created alongside the flights.",
    "exportSteps": [
      "Open ForeFlight on iPad or iPhone and go to Logbook.",
      "Tap the gear icon, then Export Logbook.",
      "Mail the file to yourself and save the attached .csv.",
      "Upload that file here — the Aircraft Table is imported too."
    ],
    "id": "FOREFLIGHT_CSV",
    "name": "ForeFlight",
    "regions": [
      "FAA",
      "EASA"
    ],
    "vendor": "ForeFlight (Boeing)",
    "website": "https://foreflight.com"
  },
  {
    "autoDetected": true,
    "confidence": "exact",
    "description": "A CSV written by NinerLog's own Export screen. Re-importing one round-trips cleanly, including instructor, approach and endorsement columns.",
    "exportSteps": [
      "Open Export in another NinerLog account or installation.",
      "Choose CSV and the Standard column layout.",
      "Upload the downloaded file here.",
      "To move an entire account — aircraft, licences and credentials as well as flights — use Restore JSON Backup instead."
    ],
    "id": "NINERLOG_CSV",
    "name": "NinerLog",
    "regions": [
      "EASA",
      "FAA"
    ],
    "vendor": "NinerLog",
    "website": "https://ninerlog.com"
  },
  {
    "autoDetected": true,
    "confidence": "exact",
    "description": "LogTen Pro flight export — the Dynamic Export column set and the field-key (flight_…) dialect. Times are H:MM or bare four-digit clock times.",
    "exportSteps": [
      "Open LogTen Pro on Mac or iPad.",
      "Go to Reports → Exporters and export your flights (Dynamic Export or Export Flights, tab or CSV).",
      "Save the file — a .txt from a tab export is fine.",
      "Upload it here."
    ],
    "id": "LOGTEN_CSV",
    "name": "LogTen Pro",
    "regions": [
      "FAA",
      "EASA"
    ],
    "vendor": "Coradine Aviation",
    "website": "https://logtenpro.com"
  },
  {
    "autoDetected": true,
    "confidence": "exact",
    "description": "MyFlightbook CSV export. It records the route as a single field rather than separate airports, so departure and arrival are taken from the first and last waypoint — a flight logged with an empty Route cannot be imported.",
    "exportSteps": [
      "Sign in at myflightbook.com.",
      "Go to Logbook → Import/Export (or Profile → Download your logbook).",
      "Download the CSV of all flights.",
      "Upload it here."
    ],
    "id": "MYFLIGHTBOOK_CSV",
    "name": "MyFlightbook",
    "regions": [
      "FAA"
    ],
    "vendor": "MyFlightbook",
    "website": "https://myflightbook.com"
  },
  {
    "autoDetected": true,
    "confidence": "exact",
    "description": "capzlog.aero flights report. Dates each flight by its off-block timestamp rather than a date column, and carries the Swiss mountain/glacier and rotary external-load columns alongside the standard EASA breakdown.",
    "exportSteps": [
      "Sign in at capzlog.aero and open your Flights list.",
      "Apply any filter you want the export limited to (or none for everything).",
      "Choose Export and pick CSV rather than PDF.",
      "Upload the downloaded file here."
    ],
    "id": "CAPZLOG_CSV",
    "name": "capzlog.aero",
    "regions": [
      "EASA"
    ],
    "vendor": "Aviaso / capzlog.aero",
    "website": "https://capzlog.aero"
  },
  {
    "autoDetected": true,
    "confidence": "exact",
    "description": "FLYLOG.io CSV export. Carries block and airborne times, the full EASA duration breakdown, and named crew per role.",
    "exportSteps": [
      "Sign in at flylog.io and open your Logbook.",
      "Choose Export and select the CSV format.",
      "Upload the downloaded file here.",
      "If FLYLOG gave you an XLSX, save it as CSV first."
    ],
    "id": "FLYLOG_CSV",
    "name": "FLYLOG.io",
    "regions": [
      "EASA"
    ],
    "vendor": "FLYLOG.io",
    "website": "https://www.flylog.io"
  },
  {
    "autoDetected": true,
    "confidence": "exact",
    "description": "Wader Pilot Logbook CSV export. Carries block, takeoff and landing times, the full EASA duration breakdown and up to four named crew. Rows Wader marks as previous experience or simulator sessions are imported as ordinary flights and are worth reviewing afterwards.",
    "exportSteps": [
      "Open Wader on your phone, or sign in at logbook.waderaviation.com.",
      "Open your logbook and choose Export.",
      "Pick CSV rather than PDF.",
      "Upload the downloaded file here."
    ],
    "id": "WADER_CSV",
    "name": "Wader",
    "regions": [
      "EASA",
      "FAA"
    ],
    "vendor": "Wader Aviation",
    "website": "https://www.waderaviation.com"
  },
  {
    "autoDetected": true,
    "confidence": "best-effort",
    "description": "Vereinsflieger club flight list (German column headers). Club records log the aircraft, times and crew; instrument and night columns are usually absent and stay empty.",
    "exportSteps": [
      "Sign in at vereinsflieger.de.",
      "Open Flugbetrieb → Flüge and filter to your own flights.",
      "Use the CSV export button above the list.",
      "Upload the downloaded file here — German headers are recognised."
    ],
    "id": "VEREINSFLIEGER_CSV",
    "name": "Vereinsflieger",
    "regions": [
      "EASA"
    ],
    "vendor": "Vereinsflieger.de",
    "website": "https://vereinsflieger.de"
  },
  {
    "autoDetected": true,
    "confidence": "best-effort",
    "description": "mccPILOTLOG / CrewLounge PILOTLOG export. Its column names carry the mcc_ and flight_ prefixes used by the desktop database.",
    "exportSteps": [
      "Open mccPILOTLOG or CrewLounge PILOTLOG on your computer.",
      "Go to File → Export and choose the CSV / text export.",
      "Select all flights and export.",
      "Upload the downloaded file here."
    ],
    "id": "MCC_PILOTLOG_CSV",
    "name": "mccPILOTLOG",
    "regions": [
      "EASA",
      "FAA"
    ],
    "vendor": "CrewLounge AERO",
    "website": "https://crewlounge.aero"
  },
  {
    "autoDetected": true,
    "confidence": "exact",
    "description": "SkyDemon logbook export. It dates each flight by its departure and arrival timestamps rather than a date column, and records no total time — the total is derived from those two. Durations are whole minutes, and registrations are exported without their hyphen. Approach and hold detail is not exported at all.",
    "exportSteps": [
      "Open SkyDemon on your tablet or PC and go to the Logbook.",
      "Choose Export and pick the CSV format.",
      "Upload the downloaded file here.",
      "Expect to fill in approach and hold detail afterwards — SkyDemon does not record it."
    ],
    "id": "SKYDEMON_CSV",
    "name": "SkyDemon",
    "regions": [
      "EASA"
    ],
    "vendor": "Divelements / SkyDemon",
    "website": "https://www.skydemon.aero"
  },
  {
    "autoDetected": true,
    "confidence": "exact",
    "description": "The standard European logbook column layout. Use this for any EU logbook app or spreadsheet whose columns follow AMC1 FCL.050, including NinerLog's own EASA CSV export.",
    "exportSteps": [
      "Export from your current logbook in the EASA / FCL.050 column layout.",
      "If you keep a spreadsheet, save it as CSV with the EASA headings in row 1.",
      "Upload the file here."
    ],
    "id": "EASA_CSV",
    "name": "EASA logbook (AMC1 FCL.050)",
    "regions": [
      "EASA"
    ],
    "vendor": "Any EASA-format logbook"
  },
  {
    "autoDetected": true,
    "confidence": "exact",
    "description": "The classic US paper-logbook column layout used by ASA and Jeppesen books and by NinerLog's own FAA CSV export.",
    "exportSteps": [
      "Export from your current logbook in the FAA / ASA column layout.",
      "If you keep a spreadsheet, save it as CSV with the FAA headings in row 1.",
      "Upload the file here."
    ],
    "id": "FAA_CSV",
    "name": "FAA logbook layout",
    "regions": [
      "FAA"
    ],
    "vendor": "Any FAA-format logbook"
  },
  {
    "autoDetected": false,
    "confidence": "best-effort",
    "description": "Any other CSV, tab- or semicolon-separated file. Columns are matched by name where possible and the rest is mapped by hand — nothing is imported until you have seen the preview.",
    "exportSteps": [
      "Export or save your logbook as CSV, with the column headings in row 1.",
      "Upload it here.",
      "Match each column to a NinerLog field on the next screen."
    ],
    "id": "CSV",
    "name": "Other CSV / spreadsheet",
    "regions": [
      "EASA",
      "FAA"
    ]
  }
];
