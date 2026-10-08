# SourceTheVIN — Functional Test Plan

|                      |                                               |
| -------------------- | --------------------------------------------- |
| **Application**      | SourceTheVIN (trade-in intake & appraisal)    |
| **Build / commit**   | `__________` (record the deployed commit SHA) |
| **Test environment** | Deployed cloud (Netlify web + Render API)     |
| **Tester**           | `__________`                                  |
| **Test dates**       | `__________` to `__________`                  |
| **Document version** | 1.0                                           |

---

## 1. Introduction

### 1.1 Purpose

This document gives a tester step-by-step functional test cases for SourceTheVIN, run against the deployed cloud environment. Each case has an expected result taken from the application's actual behaviour and on-screen text. Record **Pass**, **Fail** or **Blocked** for every case, and log a defect for every failure.

### 1.2 Scope

**In scope**

- Sign-in, sessions, forced password change and seller self-registration
- Seller dashboard and the six-step trade-in wizard (VIN decode, vehicle info, condition, payoff, photos, review & submit)
- Trade Desk queue, submission detail, valuation workspace, offers and counter-offers, ending a trade
- Seller offer responses (accept / decline / counter)
- Messages, in-app notifications and email notifications
- Audit trail
- Administrator user management (invite, approve/reject requests, role/status changes, password resets)
- Role-based access control and data isolation between sellers
- Responsive layout (desktop and mobile width)

**Out of scope**

- Load, performance and penetration testing
- Internal behaviour of third-party services (NHTSA vPIC, Cloudinary, Resend, MongoDB) beyond what is visible in the app
- Unit tests (covered by CI)

### 1.3 Roles under test

| Role          | Home page      | Summary                                                     |
| ------------- | -------------- | ----------------------------------------------------------- |
| Seller        | `/dashboard`   | Dealership staff who submit trade-ins and respond to offers |
| Trade Desk    | `/desk/queue`  | Appraisers who value submissions and send offers            |
| Administrator | `/admin/users` | Manage users and approve seller access requests             |

---

## 2. Test Environment & Setup

### 2.1 Environment

| Item             | Value                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| Web URL          | `https://<NETLIFY_SITE>`                                                                                   |
| API health check | `https://<RENDER_API>/health` → should return `{"status":"ok"}`                                            |
| Browsers         | Chrome (latest), Safari (latest), Firefox (latest) on desktop; Chrome/Safari on a phone or at 375 px width |
| Email            | Access to the inboxes of all test accounts (to verify notification emails)                                 |

> The Render API may "cold start" after inactivity. If the first request is slow, open the health-check URL and wait for `ok` before testing.

### 2.2 Test accounts

Ask the development team to prepare these accounts. Do **not** write real passwords into this document.

| Alias     | Role          | Status             | How to create                                              |
| --------- | ------------- | ------------------ | ---------------------------------------------------------- |
| `ADMIN1`  | Administrator | Active             | `create-admin` script (dev team)                           |
| `DESK1`   | Trade Desk    | Active             | Invited by ADMIN1 (test ADM-01)                            |
| `DESK2`   | Trade Desk    | Active             | Invited by ADMIN1 (optional, for multi-user notifications) |
| `SELLER1` | Seller        | Active             | Invited by ADMIN1 (test ADM-02)                            |
| `SELLER2` | Seller        | Active             | Self-registered and approved (tests REG-01, ADM-04)        |
| `SELLER3` | Seller        | Pending → Rejected | Self-registered (tests REG-01, ADM-05)                     |

Use real mailbox addresses you control (e.g. plus-addressing `tester+seller1@yourdomain`) so notification emails can be checked.

### 2.3 Test data

| Data            | Value                                         | Purpose                                |
| --------------- | --------------------------------------------- | -------------------------------------- |
| Valid VIN (A)   | `1HGCM82633A004352`                           | Honda Accord — valid checksum          |
| Valid VIN (B)   | `1FTFW1ET9DFC10312`                           | Second vehicle, for queue/search tests |
| Valid VIN (C)   | Any real 17-character VIN                     | Third vehicle                          |
| Short VIN       | `1HGCM8263`                                   | Fewer than 17 characters               |
| VIN with I/O/Q  | `1HGCM82633A00435O` (letter O at end)         | Invalid characters                     |
| Bad checksum    | `1HGCM82633A004353`                           | Checksum hint should show "invalid"    |
| Undecodable VIN | `00000000000000000`                           | Decode returns no make/model           |
| Photos          | 12 JPEG/PNG images (car photos, 1–10 MB each) | Wizard step 5                          |
| Long text       | A string of 2,001 characters                  | Message length limit                   |

### 2.4 Entry criteria

- Health check returns `ok`.
- The web URL loads the sign-in page over HTTPS.
- ADMIN1 can sign in.
- The tester has access to all test inboxes.

### 2.5 Exit criteria

- All test cases executed (Pass / Fail / Blocked recorded).
- No open **Critical** or **High** defects, or each one has a sign-off from the product owner.
- The Test Summary (section 6) is complete and signed.

### 2.6 Defect severity

| Severity | Definition                                               | Example                                     |
| -------- | -------------------------------------------------------- | ------------------------------------------- |
| Critical | Blocks a core flow, data loss, or security/access breach | Seller can view another seller's submission |
| High     | Core feature works incorrectly with no workaround        | Offer accepted but status does not change   |
| Medium   | Feature works incorrectly but a workaround exists        | Search misses a matching row                |
| Low      | Cosmetic, wording, minor layout                          | Label misaligned on mobile                  |

---

## 3. How to Record Results

Each test case table has these columns:

- **ID**: unique reference to quote in defect reports.
- **Steps**: what to do.
- **Expected result**: what must happen. Text in quotes must match what the app shows.
- **Result**: write **P** (Pass), **F** (Fail) or **B** (Blocked).
- **Notes / Defect**: what actually happened, plus the defect ID if one was raised.

Unless stated otherwise, start each case signed in as the role shown in the section heading.

---

## 4. Test Cases

### 4.1 Authentication & Sessions (AUTH)

| ID      | Title                     | Preconditions                            | Steps                                                                                            | Expected result                                                                             | Result | Notes / Defect |
| ------- | ------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ------ | -------------- |
| AUTH-01 | Unauthenticated redirect  | Signed out                               | Open `<WEB_URL>/dashboard`                                                                       | Redirected to `/login` sign-in page                                                         |        |                |
| AUTH-02 | Seller sign-in            | SELLER1 active, password already changed | Enter SELLER1 email and password, click **Sign in**                                              | Button shows "Signing in…", then lands on `/dashboard` (Seller dashboard)                   |        |                |
| AUTH-03 | Trade Desk sign-in        | DESK1 active                             | Sign in as DESK1                                                                                 | Lands on `/desk/queue` (Submission queue)                                                   |        |                |
| AUTH-04 | Admin sign-in             | ADMIN1 active                            | Sign in as ADMIN1                                                                                | Lands on `/admin/users` (Users & roles)                                                     |        |                |
| AUTH-05 | Wrong password            | —                                        | Enter a valid email and a wrong password                                                         | Error "Invalid email or password"; stays on sign-in page                                    |        |                |
| AUTH-06 | Unknown email             | —                                        | Enter an email with no account                                                                   | Error "Invalid email or password" (does not reveal whether the account exists)              |        |                |
| AUTH-07 | Pending account blocked   | SELLER3 pending                          | Sign in as SELLER3                                                                               | Error "Account is not active"                                                               |        |                |
| AUTH-08 | Suspended account blocked | A suspended user (see ADM-08)            | Sign in as the suspended user                                                                    | Error "Account is not active"                                                               |        |                |
| AUTH-09 | Show / hide password      | —                                        | Type a password, click the eye button                                                            | Password becomes visible; button label toggles between "Show password" and "Hide password"  |        |                |
| AUTH-10 | Session survives reload   | Signed in as any role                    | Press browser refresh                                                                            | Still signed in on the same page                                                            |        |                |
| AUTH-11 | Session survives new tab  | Signed in                                | Open the web URL in a new tab                                                                    | Signed in automatically, on the role's home page                                            |        |                |
| AUTH-12 | Sign out                  | Signed in                                | Click **Sign out**                                                                               | Returned to `/login`; pressing Back or opening `/dashboard` does not show protected content |        |                |
| AUTH-13 | Single active session     | SELLER1 signed in on Browser A           | Sign in as SELLER1 on Browser B (or private window). Wait over 15 min on Browser A, or reload it | Browser A is signed out (only the newest session stays valid)                               |        |                |
| AUTH-14 | Role route guard — seller | Signed in as SELLER1                     | Open `/desk/queue`, then `/admin/users`                                                          | Each time redirected back to `/dashboard`                                                   |        |                |
| AUTH-15 | Role route guard — desk   | Signed in as DESK1                       | Open `/dashboard`, then `/admin/users`                                                           | Redirected to `/desk/queue`                                                                 |        |                |
| AUTH-16 | Role route guard — admin  | Signed in as ADMIN1                      | Open `/dashboard`, then `/desk/queue`                                                            | Redirected to `/admin/users`                                                                |        |                |
| AUTH-17 | Unknown path              | Signed in                                | Open `/does-not-exist`                                                                           | Redirected to the role's home page                                                          |        |                |

### 4.2 Forced Password Change (PWD)

| ID     | Title                       | Preconditions                          | Steps                                                                                             | Expected result                                                                                               | Result | Notes / Defect |
| ------ | --------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------ | -------------- |
| PWD-01 | Redirect to change password | User just invited (temporary password) | Sign in with the temporary password                                                               | Taken to `/change-password` with text "You're using a temporary password. Choose a new password to continue." |        |                |
| PWD-02 | Cannot bypass               | On `/change-password`                  | Manually open the role's home URL (e.g. `/dashboard`)                                             | Redirected back to `/change-password`                                                                         |        |                |
| PWD-03 | Wrong current password      | On `/change-password`                  | Enter a wrong temporary password and a valid new password (10+ chars), click **Set new password** | Error "Current password is incorrect"                                                                         |        |                |
| PWD-04 | New password too short      | On `/change-password`                  | Enter correct temporary password and a 9-character new password                                   | Request rejected; password not changed (note the message shown)                                               |        |                |
| PWD-05 | Successful change           | On `/change-password`                  | Enter correct temporary password and a new password of 10+ characters                             | Button shows "Updating…", then lands on the role's home page                                                  |        |                |
| PWD-06 | New password works          | PWD-05 done                            | Sign out, sign in with the new password                                                           | Signed in directly to the home page (no change prompt)                                                        |        |                |
| PWD-07 | Old password rejected       | PWD-05 done                            | Sign in with the old temporary password                                                           | "Invalid email or password"                                                                                   |        |                |

### 4.3 Seller Self-Registration (REG)

| ID     | Title                          | Preconditions          | Steps                                                                                                                                                         | Expected result                                                                                                  | Result | Notes / Defect |
| ------ | ------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------ | -------------- |
| REG-01 | Request seller access          | Signed out             | On `/login` click **Request seller access**. Fill Email, Password (10+ chars), Dealership name, Dealer license number, Phone. Click **Request seller access** | Button shows "Submitting…", then "Request received" with a pending-approval message and a "Back to sign in" link |        |                |
| REG-02 | Admin & desk notified          | REG-01 done            | Sign in as ADMIN1 and DESK1; check bell and inbox                                                                                                             | Each has a new-seller-registration notification (in-app and email)                                               |        |                |
| REG-03 | Pending account cannot sign in | REG-01 done            | Sign in with the new account                                                                                                                                  | "Account is not active"                                                                                          |        |                |
| REG-04 | Duplicate email                | Account already exists | Submit the form with an existing email                                                                                                                        | Error "An account with this email already exists"                                                                |        |                |
| REG-05 | Short password                 | —                      | Submit with a 9-character password                                                                                                                            | Request rejected; no account created (note the message shown)                                                    |        |                |
| REG-06 | Missing "optional" fields      | —                      | Leave Dealership name and Dealer license number blank, fill the rest                                                                                          | **Watch item:** labels say "(optional)" but the server requires them. Record what happens                        |        |                |
| REG-07 | Missing phone                  | —                      | Leave Phone blank                                                                                                                                             | Request rejected; no account created                                                                             |        |                |
| REG-08 | Invalid email                  | —                      | Enter `not-an-email`                                                                                                                                          | Request rejected; no account created                                                                             |        |                |

### 4.4 Administrator — User Management (ADM)

| ID     | Title                                    | Preconditions                        | Steps                                                                                                         | Expected result                                                                                                                                                       | Result | Notes / Defect |
| ------ | ---------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------- |
| ADM-01 | Invite Trade Desk user                   | ADMIN1 signed in                     | Click **+ Invite user**. Enter email, Role = Trade Desk. Click **Create account**                             | Yellow box "New temporary password for {email}… It won't be shown again." User appears in table as Trade Desk / Active. Invite email received with temporary password |        |                |
| ADM-02 | Invite Seller                            | ADMIN1                               | Invite with Role = Seller; fill Dealership name, License #, Phone                                             | Account created; seller fields shown only when Seller is selected; temp password shown once and emailed                                                               |        |                |
| ADM-03 | Seller invite without phone              | ADMIN1                               | Invite as Seller with Phone blank                                                                             | Rejected; no account created                                                                                                                                          |        |                |
| ADM-04 | Approve seller request                   | SELLER2 pending                      | In the pending-request banner "{email} ({dealership}) requested seller access · {license}", click **Approve** | Banner disappears; user status becomes Active; SELLER2 receives approval notification/email; SELLER2 can now sign in                                                  |        |                |
| ADM-05 | Reject seller request                    | SELLER3 pending                      | Click **Reject** on SELLER3's banner                                                                          | Banner disappears; user removed from table; SELLER3 receives a rejection email. **Note:** no confirmation dialog appears                                              |        |                |
| ADM-06 | Duplicate invite                         | ADMIN1                               | Invite an email that already exists                                                                           | Error; no duplicate created                                                                                                                                           |        |                |
| ADM-07 | Change role                              | DESK2 exists                         | Click **Edit** on DESK2. Select Seller role. Click **Save**                                                   | Role updated in table. DESK2 receives a role-changed notification. Next sign-in, DESK2 lands on `/dashboard`                                                          |        |                |
| ADM-08 | Suspend user                             | SELLER1 signed in on another browser | ADMIN1 edits SELLER1, Status = Suspended, **Save**                                                            | Status badge "Suspended". On SELLER1's browser, the next action/reload signs them out or shows an error. SELLER1 cannot sign in ("Account is not active")             |        |                |
| ADM-09 | Reactivate user                          | ADM-08 done                          | Edit SELLER1, Status = Active, **Save**                                                                       | Badge "Active"; SELLER1 can sign in again; status-change notification received                                                                                        |        |                |
| ADM-10 | Cannot edit self                         | ADMIN1                               | Click **Edit** on own row (marked "(you)")                                                                    | Role and status controls disabled with note "You can't change your own role or status…"                                                                               |        |                |
| ADM-11 | Reset password                           | SELLER1 signed in elsewhere          | Click **Reset password** on SELLER1                                                                           | New temporary password shown once and emailed. SELLER1's other session is signed out. Next sign-in forces `/change-password`. **Note:** no confirmation dialog        |        |                |
| ADM-12 | Dismiss temp password                    | Temp password box shown              | Click **Dismiss**                                                                                             | Box disappears and the password cannot be viewed again                                                                                                                |        |                |
| ADM-13 | Unknown user id                          | ADMIN1                               | Open `/admin/users/000000000000000000000000`                                                                  | "User not found."                                                                                                                                                     |        |                |
| ADM-14 | Tenant panel                             | ADMIN1 on any edit page              | Look at the side panel                                                                                        | "Tenant & environment" panel shows Tenant ID, Environment, Active users, Transport "HTTPS / TLS"                                                                      |        |                |
| ADM-15 | Save unchanged pending user (watch item) | A pending seller exists              | Open **Edit** for the pending user and click **Save** without changing anything                               | **Watch item:** status dropdown shows "Active"; saving may activate the user without the approval email. Record behaviour                                             |        |                |

### 4.5 Seller Dashboard (DASH)

| ID      | Title                  | Preconditions                 | Steps                                       | Expected result                                                                                      | Result | Notes / Defect |
| ------- | ---------------------- | ----------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------ | -------------- |
| DASH-01 | Empty dashboard        | New seller, no submissions    | Sign in                                     | "Trade-in submission" card with **Enter VIN →** button; Recent submissions is empty                  |        |                |
| DASH-02 | Start new submission   | —                             | Click **Enter VIN →**                       | Opens wizard Step 1 (`/wizard/new/1`). No draft appears on the dashboard yet                         |        |                |
| DASH-03 | Draft listed           | A draft exists (WIZ-07)       | Return to dashboard                         | Row shows vehicle (year make model), reference ID `STV-YYYY-NNNNN`, badge "Draft", **Delete** button |        |                |
| DASH-04 | Resume draft           | Draft saved at step 4         | Click the draft row                         | Opens the wizard at the step where it was left                                                       |        |                |
| DASH-05 | Delete draft — cancel  | Draft exists                  | Click **Delete**, then Cancel in the dialog | Dialog text "Delete the draft for {vehicle}? This cannot be undone."; draft remains                  |        |                |
| DASH-06 | Delete draft — confirm | Draft exists                  | Click **Delete**, confirm                   | Shows "Deleting…", then row disappears                                                               |        |                |
| DASH-07 | Submitted row          | Submission submitted          | View dashboard                              | Badge "New"; no Delete button; clicking opens `/submissions/:id`                                     |        |                |
| DASH-08 | Status badges          | Submissions in various states | View dashboard                              | Labels: Draft, New, Offer sent, Accepted, Declined match each submission's state                     |        |                |
| DASH-09 | List limit             | Seller has 11+ submissions    | View dashboard                              | Only the 10 most recent are listed (known limit)                                                     |        |                |

### 4.6 Trade-in Wizard (WIZ)

**Step 1 — VIN**

| ID     | Title                      | Preconditions   | Steps                                           | Expected result                                                                                          | Result | Notes / Defect |
| ------ | -------------------------- | --------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------ | -------------- |
| WIZ-01 | Header & cancel            | On Step 1       | Look at header; click **Cancel**                | "STEP 1 OF 6" with progress bar; no Back button; Cancel returns to dashboard                             |        |                |
| WIZ-02 | Auto-uppercase & length    | Step 1          | Type `1hgcm82633a004352`                        | Shows uppercase; helper shows "17 characters · checksum valid"; field accepts no more than 17 characters |        |                |
| WIZ-03 | Decode disabled when short | Step 1          | Type the short VIN                              | **Decode VIN** disabled; helper shows character count                                                    |        |                |
| WIZ-04 | Bad checksum is advisory   | Step 1          | Type the bad-checksum VIN                       | Helper shows "checksum invalid" but **Decode VIN** is still enabled                                      |        |                |
| WIZ-05 | Invalid characters         | Step 1          | Enter VIN with letter O, click **Decode VIN**   | Decode rejected with an error; no draft created                                                          |        |                |
| WIZ-06 | Undecodable VIN            | Step 1          | Enter `00000000000000000`, click **Decode VIN** | "This VIN could not be decoded. Check the characters and try again."; no draft appears on dashboard      |        |                |
| WIZ-07 | Successful decode          | Step 1          | Enter VIN A, click **Decode VIN**               | Moves to Step 2. Draft now appears on dashboard with a reference ID                                      |        |                |
| WIZ-08 | Re-decode existing draft   | Draft at Step 2 | Click **← Back** to Step 1, enter VIN B, decode | Step 2 now shows VIN B's vehicle; same reference ID (no new draft)                                       |        |                |

**Step 2 — Vehicle info**

| ID     | Title               | Preconditions | Steps                                            | Expected result                                                                                                                                | Result | Notes / Defect |
| ------ | ------------------- | ------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------- |
| WIZ-09 | Prefill from decode | WIZ-07        | Inspect Step 2                                   | "Decoded from vPIC" badge; heading with year/make/model/trim; VIN shown; Year, Make, Model, Trim, Drivetrain, Engine prefilled where available |        |                |
| WIZ-10 | Edit fields         | Step 2        | Enter Mileage `45210`, Color `Silver`; edit Trim | Values accepted                                                                                                                                |        |                |
| WIZ-11 | Invalid year        | Step 2        | Enter Year `1800`, click **Continue**            | Not saved / error shown (year must be 1900 to next year)                                                                                       |        |                |
| WIZ-12 | Decimal mileage     | Step 2        | Enter Mileage `100.5`, click **Continue**        | Rejected (mileage must be a whole number). **Watch item:** may show generic "Something went wrong. Please try again."                          |        |                |
| WIZ-13 | Continue            | Valid data    | Click **Continue**                               | Shows "Saving…", moves to Step 3                                                                                                               |        |                |

**Step 3 — Condition**

| ID     | Title                  | Preconditions | Steps                                                                                                                       | Expected result                                                                                                                                        | Result | Notes / Defect |
| ------ | ---------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | -------------- |
| WIZ-14 | Defaults               | Step 3        | Inspect                                                                                                                     | Subtitle "Answer honestly — it drives the offer."; Runs & drives has no selection; Structural = "Clean — no known damage"; Tires and Windshield = Good |        |                |
| WIZ-15 | Warning light "Other"  | Step 3        | Choose Warning lights = Other                                                                                               | "Which warning light?" text field appears; choosing None or Check engine hides it                                                                      |        |                |
| WIZ-16 | Cosmetic multi-select  | Step 3        | Select Dents and Curbed wheels, then deselect Dents                                                                         | Only Curbed wheels remains selected                                                                                                                    |        |                |
| WIZ-17 | All options selectable | Step 3        | Select Runs & drives = Starts only, Structural = "Prior accident — needs repair", Tires = Poor, Windshield = Fair; Continue | Moves to Step 4; values retained when going Back                                                                                                       |        |                |
| WIZ-18 | Nothing required       | Step 3        | Leave Runs & drives blank, click Continue                                                                                   | Moves to Step 4                                                                                                                                        |        |                |

**Step 4 — Trade & payoff**

| ID     | Title             | Preconditions | Steps                                                                                                                               | Expected result                                                                                                                                                               | Result | Notes / Defect |
| ------ | ----------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------- |
| WIZ-19 | Fields present    | Step 4        | Inspect                                                                                                                             | Customer's expected allowance ($), Lien / payoff status (default "No lien — clear title"), Payoff amount, Title available?, Lienholder, Seller notes / disclosures (optional) |        |                |
| WIZ-20 | Active lien entry | Step 4        | Lien = "Active lien — payoff required", Payoff `12000`, Lienholder `Ally`, Title = "With lienholder", Allowance `18000`, notes text | Accepted; **Continue to photos** opens Step 5                                                                                                                                 |        |                |
| WIZ-21 | Negative amount   | Step 4        | Enter `-100` in Payoff amount                                                                                                       | Rejected / not saved                                                                                                                                                          |        |                |

**Autosave, navigation, resume**

| ID     | Title            | Preconditions | Steps                                           | Expected result                                                                | Result | Notes / Defect |
| ------ | ---------------- | ------------- | ----------------------------------------------- | ------------------------------------------------------------------------------ | ------ | -------------- |
| WIZ-22 | Autosave         | Step 3 or 4   | Change a field, wait 2 seconds, reload the page | Change is kept                                                                 |        |                |
| WIZ-23 | Save & exit      | Step 4        | Click **Save & exit**                           | Returns to dashboard; draft listed; reopening resumes at Step 4 with data kept |        |                |
| WIZ-24 | Back button      | Step 4        | Click **← Back** twice                          | Shows Step 3 then Step 2 with previously entered data                          |        |                |
| WIZ-25 | Invalid step URL | Draft exists  | Open `/wizard/{id}/9`                           | Redirected to dashboard                                                        |        |                |

**Step 5 — Photos**

| ID     | Title                   | Preconditions    | Steps                               | Expected result                                                                                                                                                   | Result | Notes / Defect |
| ------ | ----------------------- | ---------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------- |
| WIZ-26 | Slots & counter         | Step 5           | Inspect                             | 12 slots: Front, Rear, Driver side, Passenger side, Interior, Odometer, VIN label, Dash, Damage 1–4. Text "0 of 12 captured · compressed on device before upload" |        |                |
| WIZ-27 | Review disabled under 6 | Step 5           | Upload 5 photos                     | Counter "5 of 12…"; **Review & submit →** disabled                                                                                                                |        |                |
| WIZ-28 | Upload 6th photo        | 5 uploaded       | Upload a 6th                        | Counter "6 of 12…"; **Review & submit →** enabled                                                                                                                 |        |                |
| WIZ-29 | Capture next            | Some slots empty | Click "Capture {next slot}"         | File picker opens for the next empty slot                                                                                                                         |        |                |
| WIZ-30 | Replace a photo         | Front uploaded   | Tap Front, choose a different image | Front thumbnail is replaced; count does not increase                                                                                                              |        |                |
| WIZ-31 | Large photo             | Step 5           | Upload a ~10 MB photo               | Uploads successfully (compressed before upload)                                                                                                                   |        |                |
| WIZ-32 | Mobile camera           | Phone browser    | Tap a slot                          | Phone offers camera / photo library; captured photo uploads                                                                                                       |        |                |
| WIZ-33 | Non-image file          | Step 5           | Try to select a PDF                 | Picker does not allow it, or upload fails with "Photo upload failed. Please try again."                                                                           |        |                |

**Step 6 — Review & submit**

| ID     | Title                    | Preconditions | Steps                                                                           | Expected result                                                                                                                                                                   | Result | Notes / Defect |
| ------ | ------------------------ | ------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------- |
| WIZ-34 | Summary                  | 6+ photos     | Click **Review & submit →**                                                     | Summary cards for Vehicle (VIN, Mileage, Drivetrain / engine), Condition, Trade & payoff, Photos "n of 12" match entered data                                                     |        |                |
| WIZ-35 | Submit                   | Step 6        | Click **Submit**                                                                | "Submitted" confirmation with reference ID, VIN, vehicle, mileage, "n uploaded" photos, Status "● New", and "You'll get an in-app and email notification when an offer is ready." |        |                |
| WIZ-36 | Post-submit buttons      | WIZ-35        | Click **Back to dashboard**; then repeat and click **Start another submission** | Dashboard shows the submission as "New"; Start another opens Step 1                                                                                                               |        |                |
| WIZ-37 | Desk notified            | WIZ-35        | Check DESK1 and ADMIN1 bell & email                                             | New-submission notification received by each                                                                                                                                      |        |                |
| WIZ-38 | Cannot edit after submit | Submitted     | Open `/wizard/{id}/2` directly                                                  | Cannot edit (redirect or error); data unchanged                                                                                                                                   |        |                |

### 4.7 Trade Desk Queue (QUEUE)

Prepare 3+ submitted trade-ins (VINs A, B, C) from SELLER1 and SELLER2.

| ID       | Title                                         | Preconditions               | Steps                                                                             | Expected result                                                                                                                   | Result | Notes / Defect |
| -------- | --------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------- |
| QUEUE-01 | Queue loads                                   | DESK1                       | Open `/desk/queue`                                                                | Title "Submission queue"; newest first; columns ID, Vehicle (with last 6 of VIN), Miles, Seller (dealership · email), Age, Status |        |                |
| QUEUE-02 | New count pill                                | Submissions with status New | Inspect header                                                                    | "● {n} new" equals number of rows with status New                                                                                 |        |                |
| QUEUE-03 | Drafts excluded                               | SELLER1 has a draft         | Inspect queue                                                                     | Draft does not appear                                                                                                             |        |                |
| QUEUE-04 | Search by reference ID                        | —                           | Type a reference ID                                                               | Only that row shown                                                                                                               |        |                |
| QUEUE-05 | Search by VIN / vehicle / seller / dealership | —                           | Search each in turn (e.g. last 6 of VIN, "Accord", seller email, dealership name) | Matching rows shown each time                                                                                                     |        |                |
| QUEUE-06 | No match                                      | —                           | Search `zzzz`                                                                     | "No submissions match these filters."                                                                                             |        |                |
| QUEUE-07 | Date range                                    | —                           | Switch through Last 24 hours / Last 7 days (default) / Last 30 days / All time    | Rows filtered accordingly; default is Last 7 days                                                                                 |        |                |
| QUEUE-08 | Open detail                                   | —                           | Click an ID                                                                       | Opens `/desk/submissions/:id`                                                                                                     |        |                |
| QUEUE-09 | Mobile layout                                 | 375 px width                | View queue                                                                        | Rows shown as cards, no horizontal scrolling                                                                                      |        |                |

### 4.8 Trade Desk — Submission Detail & Valuation (DESK)

| ID      | Title                                        | Preconditions                                                                        | Steps                                                                                                             | Expected result                                                                                                                                                                                    | Result | Notes / Defect |
| ------- | -------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------- |
| DESK-01 | Header                                       | Detail open                                                                          | Inspect                                                                                                           | "← Back to queue", "View audit trail →", reference ID, status badge, vehicle, "VIN · from {seller email}, {dealership}"                                                                            |        |                |
| DESK-02 | Data matches seller input                    | Detail open                                                                          | Compare to wizard entries                                                                                         | Vehicle & condition (Mileage, Drivetrain, Runs & drives, Warning lights, Structural, Cosmetic, Tires, Windshield) and Trade & payoff (Customer expectation, Lien payoff, Title, Seller note) match |        |                |
| DESK-03 | Photo lightbox                               | Detail open                                                                          | Click a thumbnail; close with ×; reopen and press Esc; reopen and click backdrop; focus thumbnail and press Enter | Full-screen image with slot caption opens/closes each way                                                                                                                                          |        |                |
| DESK-04 | Internal notes                               | —                                                                                    | Type notes, click **Save notes**, reload                                                                          | Notes retained; marked "Not visible to seller"                                                                                                                                                     |        |                |
| DESK-05 | Notes hidden from seller                     | DESK-04                                                                              | Sign in as the seller, open the submission                                                                        | Internal notes not visible anywhere                                                                                                                                                                |        |                |
| DESK-06 | Add bid references                           | —                                                                                    | Add Source "Manheim" $15000 and "ACV" $15500 via **+ Add**                                                        | Both rows listed with "Xh ago" age                                                                                                                                                                 |        |                |
| DESK-07 | Remove bid reference                         | DESK-06                                                                              | Remove "Manheim"                                                                                                  | Row removed                                                                                                                                                                                        |        |                |
| DESK-08 | Invalid bid                                  | —                                                                                    | Click **+ Add** with blank source or negative amount                                                              | Nothing is added                                                                                                                                                                                   |        |                |
| DESK-09 | Recommended max                              | Bids 15500 (best); Transport 300, Recon 800, Arbitration 200, Other 100; Margin 1000 | Click **Save valuation**                                                                                          | "Recommended max acquisition" = 15500 − 1400 − 1000 = **$13,100**; formula breakdown shown                                                                                                         |        |                |
| DESK-10 | Negative recommendation                      | —                                                                                    | Set margin larger than best bid, save                                                                             | Negative value shown (allowed)                                                                                                                                                                     |        |                |
| DESK-11 | Valuation persists                           | DESK-09                                                                              | Reload page                                                                                                       | Bids, expenses, margin, recommended max retained                                                                                                                                                   |        |                |
| DESK-12 | Notes kept after valuation save (watch item) | Notes saved (DESK-04)                                                                | Change an expense, click **Save valuation**, reload                                                               | **Watch item:** internal notes may be wiped by Save valuation. Record result                                                                                                                       |        |                |
| DESK-13 | Override validation                          | —                                                                                    | Click **Log override** with blank amount; then amount with blank reason                                           | "Enter a valid override amount."; then "An override reason is required."                                                                                                                           |        |                |
| DESK-14 | Log override                                 | —                                                                                    | Amount `14000`, reason "Clean Carfax, strong demand", **Log override**                                            | "Last override: $14,000 by … — "Clean Carfax, strong demand""; audit trail has "Limit overridden" entry                                                                                            |        |                |
| DESK-15 | Valuation hidden from seller                 | —                                                                                    | As seller, open the submission                                                                                    | No bids, expenses, margin, recommendation or override visible                                                                                                                                      |        |                |

### 4.9 Offers & Negotiation (OFFER)

| ID       | Title                            | Preconditions                                                       | Steps                                                                   | Expected result                                                                                                                                                                      | Result | Notes / Defect |
| -------- | -------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | -------------- |
| OFFER-01 | Offer validation                 | DESK1, submission "New"                                             | Click **Send offer to seller** with blank amount; then `0`              | "Enter a valid offer amount."                                                                                                                                                        |        |                |
| OFFER-02 | Expiry default                   | —                                                                   | Inspect Expires field                                                   | Defaults to about 24 hours from now                                                                                                                                                  |        |                |
| OFFER-03 | Send offer                       | —                                                                   | Amount `13000`, terms "Subject to inspection", **Send offer to seller** | Offer panel shows "v1 · $13,000", pending, expiry; status badge "Offer sent"; seller notified (bell + email)                                                                         |        |                |
| OFFER-04 | Seller sees offer                | OFFER-03                                                            | As seller open the submission                                           | "Offer received" card, "Awaiting your response", amount, "Expires {date} · v1", terms; **Accept offer**, **Decline**, **Propose a different amount**                                 |        |                |
| OFFER-05 | Revised offer supersedes         | OFFER-03                                                            | Desk sends a new offer $13,500                                          | Panel shows v2 · $13,500; seller sees v2 only                                                                                                                                        |        |                |
| OFFER-06 | Counter validation               | Seller viewing offer                                                | Click **Propose a different amount**, enter `0`, **Send counter-offer** | "Enter a valid counter amount."                                                                                                                                                      |        |                |
| OFFER-07 | Seller counter                   | —                                                                   | Counter `14500`, note "Recent new tires", **Send counter-offer**        | Seller sees "We've received your counter-offer and are reviewing it."; desk notified; desk status returns to New                                                                     |        |                |
| OFFER-08 | Desk sees counter                | OFFER-07                                                            | Desk opens detail                                                       | "Seller countered: "Recent new tires"" with amount, **Accept counter** and **Decline** buttons                                                                                       |        |                |
| OFFER-09 | Desk declines counter            | OFFER-08                                                            | Click **Decline**                                                       | Counter declined; submission stays open (New); desk can send a new offer                                                                                                             |        |                |
| OFFER-10 | Desk accepts counter             | New counter pending                                                 | Click **Accept counter**                                                | Status "Accepted"; seller notified; no new-offer form                                                                                                                                |        |                |
| OFFER-11 | Seller accepts offer             | Fresh submission with pending offer                                 | Seller clicks **Accept offer**                                          | "Offer accepted" with timeline ("Accepted by {email}", "Offer sent · v1 · $X · expires …", "Submitted") and "Next: we'll contact you to arrange drop-off and payoff."; desk notified |        |                |
| OFFER-12 | Seller declines offer            | Fresh submission with pending offer                                 | Seller clicks **Decline**                                               | "Trade declined" view; desk notified; submission status Declined                                                                                                                     |        |                |
| OFFER-13 | Expired offer                    | Desk sends offer with expiry ~2 minutes ahead; wait until it passes | Seller clicks **Accept offer**                                          | Error "This offer has expired". **Watch item:** buttons are still shown after expiry                                                                                                 |        |                |
| OFFER-14 | Past expiry allowed (watch item) | —                                                                   | Desk sets Expires to yesterday and sends                                | **Watch item:** the app allows this. Record behaviour                                                                                                                                |        |                |
| OFFER-15 | End negotiation                  | Submission open                                                     | Desk clicks **End negotiation**, confirms                               | Dialog "End this trade? No further offers or counters will be possible."; status Declined; seller notified and sees "Trade declined"                                                 |        |                |
| OFFER-16 | Resolved trade locked            | Accepted or declined submission                                     | Desk opens detail                                                       | No new-offer form; any attempt fails with "This trade has already been resolved"                                                                                                     |        |                |
| OFFER-17 | Double action                    | Seller has offer open in two tabs                                   | Accept in tab 1, then Decline in tab 2                                  | Tab 2 shows "This offer is no longer pending"                                                                                                                                        |        |                |

### 4.10 Messages (MSG)

| ID     | Title                    | Preconditions                  | Steps                                                 | Expected result                                                      | Result | Notes / Defect |
| ------ | ------------------------ | ------------------------------ | ----------------------------------------------------- | -------------------------------------------------------------------- | ------ | -------------- |
| MSG-01 | Empty thread             | New submission                 | Open messages (seller or desk)                        | "Kept as history for this trade only." and "No messages yet."        |        |                |
| MSG-02 | Send disabled when blank | —                              | Leave textarea empty or spaces only                   | **Send** disabled                                                    |        |                |
| MSG-03 | Seller sends             | —                              | Seller types "Keys and both fobs available", **Send** | Message appears with "{email} (seller)" and timestamp; desk notified |        |                |
| MSG-04 | Desk replies             | MSG-03                         | Desk replies                                          | Appears on both sides in order; seller notified                      |        |                |
| MSG-05 | Length limit             | —                              | Paste 2,001 characters, **Send**                      | Rejected; 2,000 characters accepted                                  |        |                |
| MSG-06 | Thread on all states     | Accepted / declined submission | Open the submission                                   | Thread still visible with full history                               |        |                |

### 4.11 Notifications (NOTIF)

| ID       | Title                    | Preconditions                            | Steps                   | Expected result                                                                                                                                                                                     | Result | Notes / Defect |
| -------- | ------------------------ | ---------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------- |
| NOTIF-01 | Badge updates            | Seller signed in, page left open         | Desk sends an offer     | Within ~20 seconds the bell badge count increases without reload                                                                                                                                    |        |                |
| NOTIF-02 | Badge cap                | User with 10+ unread                     | Inspect bell            | Badge shows "9+"                                                                                                                                                                                    |        |                |
| NOTIF-03 | Panel                    | —                                        | Click bell              | Up to 20 latest notifications; unread tinted; relative age (now, 4m, 1h, 1d)                                                                                                                        |        |                |
| NOTIF-04 | Open notification        | Unread notification                      | Click it                | Marked read; navigates to the linked page                                                                                                                                                           |        |                |
| NOTIF-05 | Mark all read            | 2+ unread                                | Click **Mark all read** | All read; badge clears; button disappears                                                                                                                                                           |        |                |
| NOTIF-06 | Close panel              | Panel open                               | Click outside           | Panel closes                                                                                                                                                                                        |        |                |
| NOTIF-07 | Emails                   | Across this test run                     | Check inboxes           | Emails received for: submission submitted, offer sent, offer accepted, offer declined, counter-offer, trade ended, message received, seller request received/approved, role changed, status changed |        |                |
| NOTIF-08 | Admin links (watch item) | ADMIN1 has a new-submission notification | Click it                | **Watch item:** link goes to a desk page and admin is redirected to `/admin/users`. Record result                                                                                                   |        |                |

### 4.12 Audit Trail (AUDIT)

| ID       | Title                    | Preconditions                            | Steps                                                     | Expected result                                                                                                                | Result | Notes / Defect |
| -------- | ------------------------ | ---------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------ | -------------- |
| AUDIT-01 | Desk view                | Submission with offer, counter, override | Desk clicks **View audit trail →**                        | "Audit trail" page, "Internal · retained for reference"; columns Timestamp, Actor "email (role)", Action, Detail; newest first |        |                |
| AUDIT-02 | Actions recorded         | Full negotiation done                    | Inspect                                                   | Entries: Submitted, Limit overridden, Offer sent, Offer countered, Offer accepted / Offer declined, Trade ended as applicable  |        |                |
| AUDIT-03 | Empty trail              | —                                        | Open audit for a submission with no events (if available) | "No activity recorded yet."                                                                                                    |        |                |
| AUDIT-04 | Seller timeline filtered | Accepted submission with override        | Seller opens submission                                   | Timeline shows only seller-safe events; no "Limit overridden" entry                                                            |        |                |
| AUDIT-05 | Back link                | Audit page                               | Click "← Back to submission"                              | Returns to desk detail                                                                                                         |        |                |

### 4.13 Access Control & Data Isolation (SEC)

| ID     | Title                        | Preconditions                              | Steps                             | Expected result                         | Result | Notes / Defect |
| ------ | ---------------------------- | ------------------------------------------ | --------------------------------- | --------------------------------------- | ------ | -------------- |
| SEC-01 | Cross-seller view            | SELLER1 submission URL `/submissions/{id}` | Sign in as SELLER2, open that URL | Not found / error; no data shown        |        |                |
| SEC-02 | Cross-seller wizard          | SELLER1 draft id                           | As SELLER2 open `/wizard/{id}/2`  | Not found / redirected; draft unchanged |        |                |
| SEC-03 | Seller cannot see audit page | Seller                                     | Open `/submissions/{id}/audit`    | Redirected to `/dashboard`              |        |                |
| SEC-04 | Admin cannot post messages   | ADMIN1                                     | View a thread (if reachable)      | No message input shown                  |        |                |
| SEC-05 | HTTPS                        | —                                          | Open web URL with `http://`       | Redirected to `https://`; padlock shown |        |                |

### 4.14 End-to-End Scenarios (E2E)

| ID     | Title               | Steps                                                                                                                              | Expected result                                                                                                                                         | Result | Notes / Defect |
| ------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------- |
| E2E-01 | Happy path          | SELLER1 submits VIN A with 8 photos → DESK1 values it, sends offer → SELLER1 accepts                                               | Every step's notifications and emails arrive; final status Accepted on dashboard, queue and detail; audit shows Submitted → Offer sent → Offer accepted |        |                |
| E2E-02 | Negotiation loop    | SELLER2 submits VIN B → desk offers $10,000 → seller counters $11,500 → desk declines counter, sends $11,000 (v3) → seller accepts | Versions increment; each superseded offer no longer actionable; final Accepted at $11,000                                                               |        |                |
| E2E-03 | Desk ends trade     | SELLER1 submits VIN C → desk sends offer → desk clicks End negotiation                                                             | Seller sees "Trade declined"; no further actions possible on either side                                                                                |        |                |
| E2E-04 | New user onboarding | Admin invites a seller → seller signs in with temp password → changes password → submits a trade-in                                | Each step succeeds in order                                                                                                                             |        |                |

### 4.15 Non-Functional Checks (NFR)

| ID     | Title                   | Steps                                                               | Expected result                                                                                       | Result | Notes / Defect |
| ------ | ----------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------ | -------------- |
| NFR-01 | Health check            | Open `<RENDER_API>/health`                                          | `{"status":"ok"}`                                                                                     |        |                |
| NFR-02 | Mobile — seller flow    | At 375 px (or a phone), complete WIZ steps 1–6                      | All controls usable; no horizontal page scroll; camera capture works                                  |        |                |
| NFR-03 | Mobile — desk & admin   | At 375 px, open queue, detail, admin users                          | Usable without horizontal page scroll                                                                 |        |                |
| NFR-04 | Cross-browser           | Repeat AUTH-02, WIZ-07, WIZ-35, OFFER-11 in Chrome, Safari, Firefox | Same results in all browsers                                                                          |        |                |
| NFR-05 | Deep link refresh       | On `/desk/submissions/{id}`, press refresh                          | Page reloads correctly (no 404)                                                                       |        |                |
| NFR-06 | Rate limit (watch item) | Reload any page rapidly ~30 times within 15 minutes                 | **Watch item:** sign-in/refresh may be blocked by the auth rate limit. Record if users get signed out |        |                |
| NFR-07 | Cold start              | After 15+ min idle, sign in                                         | Sign-in eventually succeeds; note delay                                                               |        |                |

---

## 5. Known Issues / Watch List

These were identified during code review. Test cases marked **watch item** cover them. Record the observed behaviour and raise a defect if confirmed.

| #   | Area          | Description                                                                                                                                        | Related cases          |
| --- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 1   | Valuation     | **Save valuation** may clear internal notes; **Save notes** may undo unsaved valuation edits                                                       | DESK-12                |
| 2   | Admin         | Saving an unchanged pending user can activate them without the approval email                                                                      | ADM-15                 |
| 3   | Validation    | Some server validation errors show only "Something went wrong. Please try again."                                                                  | REG-05, REG-06, WIZ-12 |
| 4   | Registration  | Dealership name and license number are labelled "(optional)" but are required                                                                      | REG-06                 |
| 5   | Offers        | Expired offers still show Accept/Decline buttons; clicking returns "This offer has expired"                                                        | OFFER-13               |
| 6   | Offers        | An offer can be sent with an expiry date in the past                                                                                               | OFFER-14               |
| 7   | Notifications | Admin notification links lead to desk pages that redirect admins away; desk users' "new seller registration" links lead to an admin page           | NOTIF-08               |
| 8   | Sessions      | Auth rate limit (30 requests / 15 min / IP) includes the refresh on every page load; offices sharing one IP may be affected                        | NFR-06                 |
| 9   | Admin         | **Reject** and **Reset password** have no confirmation dialog                                                                                      | ADM-05, ADM-11         |
| 10  | Lists         | Queue shows max 50 rows (search covers only those); dashboard max 10; admin list unpaginated                                                       | DASH-09                |
| 11  | Offers (API)  | The API does not stop a party acting on its own offer (e.g. desk accepting its own offer via direct API call). Not reachable through the normal UI | —                      |

---

## 6. Appendices

### Appendix A — Submission status lifecycle

```
 new (Draft) ──submit──▶ submitted (New) ──desk sends offer──▶ offer_sent (Offer sent)
                              ▲                                      │
                              │                                      ├─ seller accepts ──▶ accepted   (final)
                              ├──────── seller counters ◀────────────┤
                              │                                      └─ seller declines ──▶ declined  (final)
                              │
     desk declines counter ───┘      desk accepts counter ──▶ accepted (final)

 Any non-final state ── desk "End negotiation" ──▶ declined (final)
 Draft ── delete ──▶ removed
```

Offer statuses: `pending`, `accepted`, `declined`, `superseded` (replaced by a newer offer or counter).

### Appendix B — Defect log

| Defect ID | Test case | Severity | Summary | Steps to reproduce | Expected | Actual | Browser / device | Screenshot | Status |
| --------- | --------- | -------- | ------- | ------------------ | -------- | ------ | ---------------- | ---------- | ------ |
|           |           |          |         |                    |          |        |                  |            |        |
|           |           |          |         |                    |          |        |                  |            |        |
|           |           |          |         |                    |          |        |                  |            |        |

### Appendix C — Test summary

| Module    | Total   | Pass | Fail | Blocked | Not run |
| --------- | ------- | ---- | ---- | ------- | ------- |
| AUTH      | 17      |      |      |         |         |
| PWD       | 7       |      |      |         |         |
| REG       | 8       |      |      |         |         |
| ADM       | 15      |      |      |         |         |
| DASH      | 9       |      |      |         |         |
| WIZ       | 38      |      |      |         |         |
| QUEUE     | 9       |      |      |         |         |
| DESK      | 15      |      |      |         |         |
| OFFER     | 17      |      |      |         |         |
| MSG       | 6       |      |      |         |         |
| NOTIF     | 8       |      |      |         |         |
| AUDIT     | 5       |      |      |         |         |
| SEC       | 5       |      |      |         |         |
| E2E       | 4       |      |      |         |         |
| NFR       | 7       |      |      |         |         |
| **Total** | **170** |      |      |         |         |

### Appendix D — Sign-off

| Role             | Name | Signature | Date | Decision (Approve / Reject) |
| ---------------- | ---- | --------- | ---- | --------------------------- |
| Tester           |      |           |      |                             |
| Product owner    |      |           |      |                             |
| Development lead |      |           |      |                             |

**Comments:**

---

---
