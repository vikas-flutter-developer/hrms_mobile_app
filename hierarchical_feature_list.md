# Follow Up App — Hierarchical Feature List

This directory contains the structured breakdown of the features built into the **Follow Up App (Sales Pipeline & Field Tracker)**, organized by user hierarchy and structural access layers.

---

## 1. SUPER ADMIN (Global Platform Owner / Developer)
* **Who they are:** You and your development/operations team.
* **Their core role:** Platform maintenance, universal payment audits, database debugging, company approvals, and database schema updates.

### Exclusive Features & Console Capabilities:
* **Supabase SQL Console:** A built-in, functional Postgres SQL client inside the mobile app to run standard database commands (DDL, DML, DQL) directly on production tables.
* **Database Schema Browser Sidebar:** Interactive explorer listing active system tables (`profiles`, `leads`, `attendance`, `subscriptions`, `app_settings`, `message_templates`) with row metadata details.
* **Useful SQL Query Templates:** One-click pre-installed query insertion for rapid developer audits:
  * **All Leads:** View the entire global lead register.
  * **Pending Approvals:** List users waiting to get approved by company owners.
  * **Active Subs:** List all paying companies.
  * **Lead Stats:** Show pipeline breakdown counts.
* **SQL Query CSV Exporter:** Instantly converts any query output grid into a formatted CSV sheet and opens the system share panel.
* **Query Cache History:** Remembers the last 20 queries locally (via `shared_preferences`) for fast reuse.
* **Billing Pausing Override:** Bypasses expired subscription blocks to ensure smooth testing and administration.

---

## 2. ADMIN (Company Owner / CXO / License Purchaser)
* **Who they are:** The business owners who purchase the app for their enterprise.
* **Their core role:** Overseeing sales metrics, managing employees, managing billing packages, and approving field attendance.

### Exclusive Features & Management Capabilities:
* **Multi-Tenant Sandbox Setup:** Keeps all customer lists, staff records, and billing isolated under a unique `tenant_id` (Company ID) generated via Supabase.
* **Company ID sharing console:** Features a quick-copy panel under "Company Info" to share the company tenant ID with staff so they request permission to join the correct workspace.
* **Staff Approvals & Security Console:** Complete control to approve new employee registrations, change staff roles, or disable accounts to protect data.
* **Shift Attendance Approvals Console:**
  * **Employee Dropdown Filter:** Audit daily logs for specific employees or the entire organization.
  * **Date-Range Pickers:** Track shift hours across custom time windows (e.g., past 7 days).
  * **One-Click Shift Approvals:** Review shift logs (Date, Check-In/Check-Out timestamps) and approve them to verify shift status.
* **Razorpay Subscription Console:**
  * Buy and renew subscription plans (Starter, Growth, Enterprise) natively inside the app using UPI, credit cards, or net banking.
  * **Active Subscription Expiry Banners:** High-visibility warnings at the top of the dashboard when a renewal date is approaching.
* **Universal Metrics Dashboard:** Complete pipeline tracking (Total Leads, Outreach, Meeting Fixed, Quotation Sent, Closed) to monitor company-wide sales performance.
* **Bulk Lead Import & Export:** Import leads from spreadsheets or export filtered lead lists (Hot/Meeting Fixed) to CSV format.

---

## 3. INSIDE ADMIN STAFF ROLES
These are the employees registered under the purchased company. Their features are restricted to prevent data leaks.

### A. MANAGERS (Manager 1 & Manager 2)
* **Who they are:** Team leaders, regional directors, or operations heads.
* **Their core role:** Lead distribution, assigning tasks to staff, creating pricing quotes, and monitoring sales pipeline stages.

#### Exclusive Features & Capabilities:
* **Spreadsheet Ingestion Mapping Engine:**
  * Bulk import raw leads from Excel (`.xlsx`), CSV, or PDF files.
  * **Automatic Ingestion Fallback:** Samples the first 5 rows of unrecognized spreadsheets and runs content regex tests (checking numbers, Google Maps URLs, address formats) to automatically map column indices.
  * **Column Mapping Screen:** Grid interface to manually map spreadsheet columns (Company, Name, Phone, Email, Address, Maps Location) before import.
* **Bulk Sheet Batch Operations:**
  * **Assign Sheet to Staff:** Bulk-assign all leads in a specific sheet tag (e.g., *"September Inbound Leads"*) to a specific caller/meeting employee in one click.
  * **Bulk Sheet Deletion:** Wipe out entire imported spreadsheet files in one click, protected by double-verification modals.
* **Lead Lifecycle Operations:** Add, edit, catalog, or delete leads at any stage of the sales pipeline.
* **Corporate Quotation & PDF Generator Engine:**
  * Auto-generates unique sequential quotation numbers (`QT-YYYYMMDD-XXX`).
  * Autofills service line descriptions using "Services Pitched" on the lead.
  * Dynamic line items table (adjustable quantities, custom unit prices).
  * **GST Tax Brackets Dropdown:** Select individual tax percentages (0%, 5%, 12%, 18%, 28%) per row.
  * Real-time computed Subtotal, GST Tax Value, and Grand Total amounts.
  * Pixel-perfect PDF rendering styles (branded blue headers, clean client details card, terms and conditions box, and custom footers).
  * Opens native system share-sheet to send quotation PDFs via WhatsApp, Email, or Slack instantly.
  * Automatically saves quotation totals back to the lead’s `quotation_amount` record.

---

### B. CALLING STAFF (Inside Sales / Tele-callers)
* **Who they are:** Call center reps or inside sales teams.
* **Their core role:** Dialing lead lists, pre-qualifying prospects, and scheduling face-to-face visits.

#### Exclusive Features & Capabilities:
* **Shift Check-In & Check-Out:** Direct shift toggle buttons at the top of the dashboard to record attendance.
* **Outbound Pipeline Dashboard:** Focused dashboard showing **Hot Leads** needing prompt calls and **Pending Meetings**.
* **Single-Touch Dialing:** Launch native device phone dialers in one click (`tel:` schema).
* **Smart Post-Call Automation loop:** 
  * Monitors mobile app state events as a `WidgetsBindingObserver`.
  * The exact moment they hang up a phone call and return to the app, the app **automatically opens a "Post-Call Actions" console** prompting them to instantly:
    1. **Send WhatsApp Summary:** Opens a WhatsApp selector with pre-filled message templates. Automatically replaces personalization tags (e.g., replaces `%name%` with the client's actual name).
    2. **Schedule next Follow-Up:** Date picker to schedule next follow-up dates and record timeline notes.
    3. **Log Outcome:** Categorizes interest levels (Hot/Warm/Cold).
* **Meeting Fixed Scheduler:** Mark lead status to *Meeting Fixed* and assign it directly to a local Meeting Staff member.
* **Activity Timelines:** Add notes and logs to the lead's history page.

---

### C. MEETING STAFF (Field Force / Field Sales)
* **Who they are:** Local sales reps or business development executives.
* **Their core role:** Traveling to scheduled face-to-face meetings and securing sales.

#### Exclusive Features & Capabilities:
* **Shift Check-In & Check-Out:** Quick check-in/out button on the dashboard to record field shifts.
* **My Assigned Meetings Dashboard:** Displays only tasks and meetings assigned to them.
* **Route Mapping Locator:** Instantly opens their system's default navigation map to plot driving routes using the client's saved address or Google Maps URL.
* **Geofenced Arrival Verification ("Reached"):**
  * When field meeting staff arrive at a client's location, they click the purple **"Reached"** button.
  * The app utilizes the device's GPS (`geolocator`) to request high-accuracy coordinates.
  * It records the **exact Latitude and Longitude**, stamps the **precise arrival date and time**, and updates the lead status to *Meeting Finished*.
  * This creates a verified **"Meeting Verification"** section on the lead details screen for Admins to verify locations on Google Maps.
* **WhatsApp Templates Selector:** Send predefined WhatsApp texts after meetings.
