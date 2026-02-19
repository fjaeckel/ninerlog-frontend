export const gettingStarted = `
# Getting Started with PilotLog

Welcome to **PilotLog** — your digital pilot logbook for EASA, FAA, and other regulatory authorities. This guide walks you through setting up your account and logging your first flight.

---

## 1. Create Your Account

Visit the registration page and enter your **name**, **email**, and a **strong password** (minimum 8 characters). You'll be logged in immediately after registration.

> **Tip:** We strongly recommend enabling **two-factor authentication (2FA)** in your profile settings for account security.

---

## 2. Add Your License

Go to **Licenses** from the sidebar. Click **Add License** and enter:

- **Regulatory Authority** — e.g. EASA, FAA, CAA UK
- **License Type** — e.g. PPL, CPL, ATPL, SPL
- **License Number** — your official license number

After creating a license, add your **class ratings** (e.g. SEP Land, MEP Land, IR) with their issue and expiry dates.

---

## 3. Add Your Aircraft

Go to **Aircraft** and add the planes you fly. For each aircraft, enter:

| Field | Example |
|-------|---------|
| Registration | D-EABC |
| Type Code | C172 |
| Make & Model | Cessna 172SP |
| Aircraft Class | SEP Land |

The aircraft class determines which class ratings your flights count toward.

---

## 4. Log Your First Flight

Go to **Flights** and click the **+** button. Fill in:

1. **Date** — the flight date
2. **Aircraft** — select from your fleet (auto-fills type)
3. **Departure / Arrival** — ICAO codes (e.g. EDDF, EDDH)
4. **Off-block / On-block times** — chocks off and on (total time auto-calculated)
5. **Landings** — day and night landing counts

PilotLog **auto-calculates** solo time, cross-country time, distance, day/night splits, and more based on your input.

---

## 5. Check Your Currency

Visit the **Currency** page to see your status per class rating. PilotLog evaluates:

- ✅ **EASA** revalidation rules (FCL.740.A)
- ✅ **FAA** 14 CFR 61.57 requirements

**Green** means current, **amber** means attention needed, **red** means not current.

---

## 6. Add Your Credentials

Go to **Credentials** to track your:

- Medical certificate (EASA Class 1/2/LAPL, FAA Class 1/2/3)
- Language proficiency (ICAO Level 4/5/6)
- Security clearances

PilotLog will **warn you before they expire** via email notifications.

---

## You're All Set! 🎉

Explore the **Reports** page for flight statistics, the **Map** for route visualization, and **Import** to bring in flights from ForeFlight or other logbooks.
`;

export const aircraft = `
# Aircraft Management

The Aircraft section lets you maintain a database of the aircraft you fly. This enables **auto-fill when logging flights** and powers **currency tracking** per class rating.

---

## Adding an Aircraft

1. Go to **Aircraft** from the sidebar
2. Click **Add Aircraft**
3. Fill in the details:

| Field | Description | Example |
|-------|-------------|---------|
| Registration | Tail number | D-EABC, N12345 |
| Type Code | ICAO type designator | C172, PA28, DR40 |
| Make | Manufacturer | Cessna |
| Model | Model name | 172SP |
| Aircraft Class | Determines currency tracking | SEP Land, MEP Land, TMG |

---

## Quick-Add from Flight Form

You can also add aircraft **directly from the flight form**. When you type a registration that isn't in your database, you'll see an option to quick-add it inline.

---

## Editing & Deactivating

- Click any aircraft card to **edit** its details
- Mark aircraft as **inactive** if you no longer fly them
- Inactive aircraft still appear in historical flights but won't show in the flight form dropdown

---

## Aircraft Class

The aircraft class field is critical — it determines which **class ratings** your flights on this aircraft count toward:

| Aircraft Class | Typical Aircraft |
|---------------|-----------------|
| SEP Land | C172, PA28, DR400 |
| SEP Sea | C172 on floats |
| MEP Land | PA34, DA42 |
| TMG | SF25, Super Dimona |
| SET Land | TBM 900, PC-12 |
`;

export const licenses = `
# Licenses & Class Ratings

PilotLog supports **any regulatory authority** worldwide. Licenses hold your basic license information; class ratings track what you're rated to fly.

---

## Understanding the Model

| Concept | What It Is | Expires? |
|---------|-----------|----------|
| **License** | Your PPL, CPL, ATPL, SPL | No — a PPL is permanent |
| **Class Rating** | SEP Land, MEP Land, IR, TMG | Yes — EASA ratings have expiry dates |
| **Flight** | A logged flight entry | Not linked to any specific license |

> **Key insight:** A flight counts toward **all applicable class ratings** across all your licenses. You don't need to assign flights to licenses.

---

## Adding a License

1. Go to **Licenses** → **Add License**
2. Enter the **regulatory authority** (e.g. EASA, FAA)
3. Enter the **license type** (e.g. PPL, CPL)
4. Enter your **license number** and **issuing authority**

---

## Adding Class Ratings

After creating a license, click **Add Rating**:

- Select the **class type** — SEP Land, SEP Sea, MEP Land, TMG, IR, etc.
- Enter the **issue date** and **expiry date**
- PilotLog tracks revalidation requirements based on your license's authority

---

## Separate Logbooks

For **SPL** (glider) or **ultralight** licenses, enable **"Requires separate logbook"**. This filters the flights view to show only flights on aircraft matching that license's class ratings.
`;

export const credentials = `
# Credentials & Medicals

Track your medical certificates, language proficiency, and security clearances. PilotLog sends **email warnings before they expire**.

---

## Supported Credential Types

| Category | Types |
|----------|-------|
| **Medical Certificates** | EASA Class 1, Class 2, LAPL Medical; FAA Class 1, 2, 3 |
| **Language Proficiency** | ICAO Level 4, 5, 6 |
| **Security Clearances** | German ZÜP/ZüBB, and others |

---

## Adding a Credential

1. Go to **Credentials** from the sidebar
2. Click **Add Credential**
3. Select the **type**, enter **issue date**, **expiry date**, and **issuing authority**
4. Add optional **notes** (e.g. restriction codes, examiner name)

---

## Expiry Alerts

PilotLog shows color-coded status badges:

| Status | Meaning | Color |
|--------|---------|-------|
| **Valid** | Not expiring soon | 🟢 Green |
| **Expiring Soon** | Within 90 days of expiry | 🟡 Amber |
| **Expired** | Past expiry date | 🔴 Red |

Enable email notifications in **Profile → Notifications** to receive warnings at **30, 14, and 7 days** before expiry.
`;

export const flights = `
# Logging Flights

PilotLog's flight form captures all the data you need for **EASA and FAA logbook compliance**.

---

## Creating a Flight

1. Go to **Flights** and click the **+** button
2. Fill in the required fields: date, aircraft, departure/arrival ICAO, block times, landings
3. PilotLog auto-calculates the rest

---

## Form Sections

The flight form is organized into **collapsible sections**:

| Section | Fields |
|---------|--------|
| **Basic** | Date, aircraft, departure → arrival |
| **Route & Times** | Off/on-block, departure/arrival times, route waypoints |
| **Landings** | Day/night landings and takeoffs |
| **People** | Crew members with roles (PIC, SIC, Instructor, Student, etc.) |
| **Advanced Times** | IFR time, instrument tracking, simulated flight, ground training |

---

## Auto-Calculated Fields

PilotLog automatically computes these values from your input:

| Field | How It's Calculated |
|-------|-------------------|
| **Total time** | From off-block to on-block |
| **Night time** | Using sunset/sunrise at your route airports |
| **Solo time** | When no crew members and not a dual flight |
| **Cross-country** | When departure ≠ arrival |
| **Distance** | Great-circle distance between airports |
| **Day/night split** | Landing split based on sunset at arrival airport |
| **PIC / Dual** | Based on whether an instructor is on board |
| **IFR total** | From actual + simulated instrument time |
| **SIC time** | When SIC role is assigned |

---

## People on Board

Add crew members with their roles:

- **PIC** — Pilot in Command
- **SIC** — Second in Command
- **Instructor** — Flight instructor (makes the flight "dual")
- **Student** — Student pilot
- **Passenger** — Non-flying passenger
- **Safety Pilot** — Required for simulated instrument
- **Examiner** — Check ride examiner

PilotLog **saves contacts** for auto-complete on future flights.

---

## Editing & Deleting

Click any flight in the list to view details. Use the **edit** button to modify or the **delete** button to remove it.

> ⚠️ Deleted flights **cannot be recovered**.
`;

export const importExport = `
# Import & Export

---

## Importing Flights

PilotLog supports importing from:

| Format | Auto-Detected? | Column Mapping |
|--------|---------------|----------------|
| **ForeFlight CSV** | ✅ Yes | Pre-mapped automatically |
| **Generic CSV** | — | Manual mapping required |

### Import Steps

1. Go to **Import** and upload your file (max 10 MB)
2. PilotLog detects the format and suggests column mappings
3. Review and adjust the mappings if needed
4. Preview the import — see valid, duplicate, and error rows
5. Confirm to import

> **ForeFlight imports** also bring in aircraft data and crew/person information — creating contacts and assigning roles (Instructor, Student, PIC) automatically.

### Duplicate Detection

PilotLog detects duplicates by matching: **date + aircraft + departure + arrival + total time (±0.1h)**

---

## Exporting Data

Go to **Export** to download your data:

| Format | What's Included |
|--------|----------------|
| **CSV** | All flight fields, spreadsheet-compatible |
| **PDF** | EASA-style logbook format |
| **JSON** | Full data backup (flights, aircraft, licenses, credentials) |
`;

export const currency = `
# Currency & Recency

The Currency page shows your flight recency status per class rating. PilotLog **automatically evaluates rules** based on your license's regulatory authority.

---

## EASA Rules

| Class Type | Requirement | Reference |
|-----------|-------------|-----------|
| **SEP / TMG** | 12h total + 6h PIC + 12 T&L + 1h instructor within 24 months before expiry | FCL.740.A |
| **MEP / SET** | Proficiency check, or 10 route sectors + 1h instructor in last 3 months | FCL.740.A |
| **IR** | 10h IFR flight time within 12 months + proficiency check | FCL.625.A |

---

## FAA Rules

| Requirement | Details | Reference |
|------------|---------|-----------|
| **Day passenger currency** | 3 takeoffs & landings in preceding 90 days | 14 CFR 61.57 |
| **Night passenger currency** | 3 full-stop night T&L in 90 days | 14 CFR 61.57 |
| **Instrument currency** | 6 approaches + holding in 6 calendar months | 14 CFR 61.57(c) |
| **Flight review** | Within preceding 24 calendar months | 14 CFR 61.56 |

---

## Status Indicators

| Status | Meaning |
|--------|---------|
| 🟢 **Current** | All requirements met |
| 🟡 **Attention** | Approaching expiry or requirements |
| 🔴 **Not Current** | Expired or requirements not met |
`;

export const reports = `
# Reports & Maps

---

## Flight Reports

The **Reports** page shows charts and statistics:

- 📊 **Block hours over time** — stacked area chart by month
- 📈 **Flights per month** — bar chart
- 🛩️ **Hours by aircraft type** — breakdown with progress bars

Select a time range (**6, 12, or 24 months**) and export as **CSV** or **PDF**.

---

## Flight Map

The **Map** page visualizes your flight routes on an interactive map:

- ✈️ Flight route lines between departure and arrival airports
- 📍 Airport markers with flight counts
- 🌡️ Activity heatmap view
- 📋 Airport statistics table
`;

export const profile = `
# Profile & Settings

---

## Profile Information

Update your **name** and **email** in Profile & Settings.

---

## Change Password

Enter your current password and a new password (minimum 8 characters).

---

## Two-Factor Authentication (2FA)

Enable 2FA for stronger security. PilotLog uses **TOTP** (Time-based One-Time Password) compatible with authenticator apps.

### Setup Steps

1. Go to **Profile** → **Two-Factor Authentication**
2. Click **Enable 2FA**
3. Scan the QR code with your authenticator app (Google Authenticator, Authy, 1Password)
4. Enter the 6-digit code to verify
5. **Save your backup/recovery codes** in a safe place

---

## Notification Settings

Toggle email alerts for **currency** and **credential expiry** warnings.

---

## Danger Zone

> ⚠️ These actions are **irreversible**.

| Action | What It Does |
|--------|-------------|
| **Delete All Flights** | Removes all flights and import history |
| **Delete All Data** | Removes all data but keeps your account |
| **Delete Account** | Permanently deletes your account and all data |
`;

export const admin = `
# Admin Console

The Admin Console is available only to the **platform administrator** (designated via the \`ADMIN_EMAIL\` environment variable).

---

## Dashboard

System-wide **aggregate statistics**:
- Total users, flights, aircraft, credentials, imports
- Locked and disabled accounts count
- Flights this month, new users this week

---

## User Management

View all user accounts (**metadata only** — no flight data or credentials visible):

| Action | Description |
|--------|------------|
| **Disable / Enable** | Prevent a user from logging in |
| **Unlock** | Clear brute-force lockout |
| **Reset 2FA** | Disable 2FA for users who lost their authenticator |

> All actions are logged to the **admin audit trail**.

---

## Announcements

Create **banner messages** visible to all users:

| Severity | Color | Use Case |
|----------|-------|----------|
| Info | 🔵 Blue | General information |
| Success | 🟢 Green | Positive suggestions |
| Warning | 🟠 Orange | Maintenance notices |
| Critical | 🔴 Red | Urgent alerts |

Set an optional **auto-expiry time** in hours.

---

## Maintenance

- **Token Cleanup** — delete expired refresh tokens and password reset tokens
- **SMTP Test** — send a test email to verify email configuration

---

## Config

View non-secret **runtime configuration**: Go version, uptime, migration version, airport database size, rate limits, CORS origins, SMTP status.
`;
