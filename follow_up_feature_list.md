# Follow Up App — Complete Product Feature List & Handbook

Welcome! This document outlines **every single feature** built into the **Follow Up App (Sales Pipeline & Field Force Tracker)**. It is designed to help onboard new developers, testers, and business interns by giving them a 100% complete view of the application’s functionality, technical components, and user workflows.

---

## 1. Core Architecture & Multi-Tenant Database Sandbox
* **Supabase Integration:** The app is powered by a robust backend using `supabase_flutter`. All data models (leads, profiles, attendance logs, subscriptions, message templates) are synced in real-time.
* **Tenant Isolation (Multi-Tenancy):**
  * Companies are separated via a unique `tenant_id` (Company ID).
  * **Company Info Sharing:** Owners/Admins can view and copy their unique **Company ID** from the "Company Info" menu and share it with employees so they register directly into the company’s isolated sandbox.
* **Cross-Platform Responsive Design:** Built using Flutter (Material 3 with custom Inter typography). It features optimized layouts for compact mobile screens and larger tablet/desktop displays.

---

## 2. Hierarchical Role-Based Access Control (RBAC)
The app implements a custom security hierarchy that dynamically restricts or enables features based on user roles (`UserRole` enum in `app_user.dart`):

| User Role | Core Responsibility | Dashboard View | Permitted Actions |
| :--- | :--- | :--- | :--- |
| **Super Admin** | Platform maintenance, direct database queries, global audits. | Super Admin Dashboard | SQL console access, company approvals, raw query execution, table metadata browser. |
| **Admin (Owner / CXO)** | Full business operations, team management, billing, and system settings. | Full Business Metrics | Bulk import/export leads, manage company users, approve employee attendance, manage subscriptions, view entire company statistics. |
| **Manager 1 & Manager 2** | Lead ingestion, pipeline scheduling, and sales supervision. | Full Pipeline Metrics | Add, edit, bulk import, and delete leads. Generate and share PDF quotations. Bulk assign sheet leads to calling/meeting staff. |
| **Calling Staff** | Outbound outreach, lead classification, and setting up initial meetings. | Outbound Pipeline | Add leads, schedule follow-ups, classify leads (Hot/Warm/Cold), fixed meetings assignment to meeting staff. Requires daily check-in. |
| **Meeting Staff** | Visual/Field visits, client check-ins, closing deals. | My Assigned Meetings | View assigned meetings list. **Arrival Verification check-in** (GPS validation) at client location. Requires daily check-in. |

---

## 3. Intelligent Lead Ingestion & Column Mapping
Instead of forcing a rigid Excel format, the app has a smart ingestion engine that makes importing easy:
* **Multi-Format Support:** Picks and processes Excel (`.xlsx`), CSV, and PDF documents natively via `file_picker`, `excel`, and `csv` packages.
* **PDF Heuristic Extraction:** Extracts email and phone numbers from raw, unstructured PDF text using intelligent line analysis and pattern detection.
* **Auto-Detection Matching Algorithm:** 
  * If file headers do not match template labels exactly, the system extracts a sample of the first 5 rows.
  * It performs **content analysis** on these sample cells (regex tests for phone formats, URL pattern matching for Google Maps links, word length metrics for company/addresses) to automatically guess which column contains what data.
* **Visual Column Mapping Screen:** Displays a live table preview allowing users to manually map columns (Company, Name, Phone, Email, Address, Maps Location) before import.
* **Duplicate Protection:** Scans all imported rows against existing database records. Automatically skips duplicate telephone numbers or matching company names and shows an import summary dialog (e.g., *"Imported 45 leads. Skipped 4 duplicates."*).
* **Batch Sheet Tags:** Prompts the user to give the imported sheet a batch name (e.g., *"September Leads"*), which is automatically added as a tag to all imported leads for quick filtering.

---

## 4. Bulk Sheet Management Operations
Located in the "Manage Sheets" menu, Admins and Managers have bulk operations to orchestrate thousands of leads instantly:
* **Batch Statistics:** Lists every imported spreadsheet batch tag along with the total count of active leads in that batch.
* **One-Click Sheet Assignment:** Allows Admins/Managers to select an entire batch tag and bulk-assign all matching leads to a specific calling or meeting staff member with a single click.
* **Bulk Sheet Deletion:** Allows permanent wiping of an entire batch of leads (useful for rolling back bad imports or cleaning up old databases) protected by double-verification modals.

---

## 5. Rich Actionable Leads Dashboard
* **Dynamic Header Banners:**
  * **Attendance Alert:** Reminds Calling and Meeting employees to check in if they haven't started their shift.
  * **Subscription Alert:** Displays warning banners to Admins when their company subscription is nearing expiry.
* **Unified Metrics Widgets:** Shows visual counter summaries (Total Leads, Outreach, Meeting Fixed, Quotation Sent, Closed) with modern, rounded cards.
* **Category Filters:** Segment leads instantly into **Hot Leads** (calling priority), **Warm Leads**, or **Cold Leads**.
* **Swipe-to-Refresh:** Integrated with Pull-to-Refresh features for real-time lead updates from Supabase.

---

## 6. Interaction Console & Post-Call Automation Loop
Selecting a lead loads a detailed interaction hub packed with operational features:
* **Single-Touch Communication Launchers:**
  * **Call:** Launches native device dialer with the client's phone number.
  * **Email:** Launches native email client with pre-filled sender addresses.
  * **Chat:** Launches WhatsApp directly using web fallback (`wa.me`) to prevent app crashes.
  * **Map:** Instantly plots the client's Google Maps link or raw street address onto the device's default GPS mapping application.
* **Predefined WhatsApp Message Selector:** Opens a slide-up menu containing customizable text templates.
  * Includes **variable substitution logic** (automatically replacing template tags like `%name%` with the lead's actual name before launching WhatsApp).
* **Post-Call Automation Loop:** 
  * The app registers as a native `WidgetsBindingObserver` to monitor app lifecycle states.
  * When a staff member finishes calling a client and returns to the app (resumes state), the app **automatically intercepts** the return and slides up a **"Post-Call Actions"** console.
  * The employee is immediately prompted with three quick-actions:
    1. **Send WhatsApp Summary** (selects text template).
    2. **Schedule Next Follow-Up** (opens date picker).
    3. **Log Outcome** (moves the lead status or category).
* **Geofenced Client Check-In ("Reached"):**
  * When field meeting staff arrive at a client's location, they click the purple **"Reached"** button.
  * The app utilizes the device's GPS (`geolocator`) to request high-accuracy coordinates.
  * It records the **exact Latitude and Longitude**, stamps the **precise arrival date and time**, and updates the lead status to *Meeting Finished*.
  * Admins/Executives can view a verified **"Meeting Verification"** section on the lead details screen and click the coordinate link to see exactly where the employee checked in on Google Maps.

---

## 7. Interactive Quotation & PDF Generator Engine
The app acts as a complete invoicing and quotation tool for the sales team:
* **Customizable Quotation Metadata:** Generates unique sequential transaction numbers automatically (e.g., `QT-YYYYMMDD-XXX`) and supports selecting custom quote validity dates.
* **Service Autofill:** Automatically reads the list of "Services Pitched" on the lead and pre-fills them as lines inside the item sheet.
* **Dynamic Line Items Grid:**
  * Supports adding/removing unlimited product/service rows.
  * Allows customizable line descriptions, unit quantities (supporting decimals), and individual unit prices.
  * **Multi-Tiered GST Calculations:** Select individual tax percentages (0%, 5%, 12%, 18%, 28%) per item via standard dropdowns.
* **Real-Time Financial Totals:** Instantly calculates the Subtotal (excluding tax), Total GST Tax Amount, and Grand Total at the bottom of the screen.
* **Professional PDF Rendering Stylesheet:**
  * Generates pixel-perfect corporate quotations using `syncfusion_flutter_pdf`.
  * Features a modern blue branding top band, aligned columns, zebra-striped row tables, light-grey sender/billing address panels, and a dedicated terms/conditions box.
* **Direct System Sharing:** Automatically saves the rendered PDF to the temporary directory and opens the native device share-picker (e.g., share to WhatsApp, attach to Gmail, print, or AirDrop).
* **Lead Record Synchronization:** Automatically saves the grand total back to the lead’s `quotation_amount` field in the database.

---

## 8. GPS-Aware Field Force Attendance System
Allows calling and meeting employees to record their shifts while giving Admins/Owners complete auditing power:
* **One-Tap Check-In / Check-Out:** Direct shift toggle buttons located at the top of the main dashboard.
* **Status Flags:** Logs check-ins as *Present* with live states (*Approved* or *Pending Approval*).
* **Manager Attendance Approvals Console:**
  * Admins can access a dedicated approvals screen.
  * **Employee Filter Dropdown:** View logs for specific employees or everyone in the company.
  * **Date-Range Pickers:** Audit attendance across custom time windows (e.g., past 7 days).
  * **One-Click Approval:** Managers can visually review pending shifts (date, check-in, and check-out timestamps) and approve them instantly.

---

## 9. Super Admin Developer Console (SQL Console)
Designed for advanced debugging, data exports, and bulk backend operations:
* **Raw SQL Editor:** Super Admins can write and run standard Postgres SQL queries directly on Supabase.
* **Database Tables Sidebar:** Quick-reference explorer showing active schema tables:
  * `profiles` (users & credentials)
  * `leads` (sales pipeline)
  * `attendance` (employee logs)
  * `subscriptions` (company plans)
  * `app_settings` / `message_templates`
* **Useful Query Templates:** One-click template insertions for rapid audits:
  * *All Leads:* Fetch full database lead registers.
  * *Pending Approvals:* List unapproved user registrations.
  * *Active Subs:* Review active subscriptions.
  * *Lead Stats:* Count leads grouped by pipeline stage.
* **Raw CSV Query Exporter:** Serializes query outputs into standard CSV arrays and triggers the system file share sheet.

---

## 10. Multi-Tiered Monetization & Billing Engine
Controls billing for company owners to monetize organizational logins:
* **Razorpay Payment Gateway:** Integrated with the `razorpay_flutter` package to execute secure digital credit card, UPI, and net banking collections.
* **Subscription Tiers:**
  * **Starter Plan:** 1 Manager, 2 Staff logins.
  * **Growth Plan:** 2 Managers, 5 Staff logins.
  * **Enterprise Plan:** Unlimited organizational logins.
* **Account Pausing Rules:**
  * If a company subscription expires:
    * The Owner (Admin) is automatically routed to the **Subscription Plans Screen** to complete payment.
    * Employees (Calling/Meeting staff) are locked out and automatically redirected to an **Account Paused Screen** notifying them to contact their company administrator.
    * Super Admins bypass subscription blocks for testing and global administration.
