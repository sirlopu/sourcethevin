# SourceTheVIN — User's Guide

**Version 1.0**

---

## 1. Introduction

SourceTheVIN is a trade-in intake and appraisal tool for car dealerships. Dealership staff enter a vehicle's VIN, describe its condition and payoff, and upload photos. The Trade Desk reviews each submission, works out a valuation and sends a purchase offer. The seller can accept, decline or propose a different amount. Every step is tracked, and everyone involved is notified in the app and by email.

### 1.1 Who uses SourceTheVIN

| Role              | What you do                                                    | Your home page   |
| ----------------- | -------------------------------------------------------------- | ---------------- |
| **Seller**        | Submit trade-ins, track their status, respond to offers        | Seller dashboard |
| **Trade Desk**    | Review submissions, value vehicles, send and negotiate offers  | Submission queue |
| **Administrator** | Invite users, approve seller requests, manage roles and access | Users & roles    |

### 1.2 What you need

- A modern web browser (Chrome, Safari, Firefox or Edge) on a computer, tablet or phone.
- For sellers: a phone or tablet with a camera makes photo capture easiest.
- The SourceTheVIN web address from your administrator: `https://<YOUR_SOURCETHEVIN_URL>`

---

## 2. Getting Started

### 2.1 Getting an account

There are two ways to get an account:

**Invited by an administrator.** You'll receive an email with a temporary password. Go to the sign-in page, sign in with your email and that temporary password, then choose your own password (see 2.3).

**Requesting seller access yourself.**

1. On the sign-in page, click **Request seller access**.
2. Enter your email, a password (at least 10 characters), your dealership name, dealer license number and phone number.
3. Click **Request seller access**. You'll see "Request received".
4. An administrator reviews your request. You'll get an email when you're approved, and then you can sign in.

> Fill in every field, including dealership name and license number, even though they are marked "(optional)". The request will not go through without them.

### 2.2 Signing in

1. Go to the SourceTheVIN web address.
2. Enter your **Email** and **Password**. Click the eye icon to show or hide what you've typed.
3. Click **Sign in**. You're taken to your home page.

You stay signed in when you reload or reopen the browser. Signing in on another device or browser signs out your previous session.

### 2.3 Changing a temporary password

If you were invited, or an administrator reset your password, you'll be asked to choose a new one before you can continue:

1. Enter the **Temporary password** from your email.
2. Enter a **New password** of at least 10 characters.
3. Click **Set new password**.

### 2.4 Signing out

Click **Sign out** at the top right of any page.

### 2.5 Notifications

The bell icon at the top of each page shows how many unread notifications you have (up to "9+"). It updates automatically about every 20 seconds.

- Click the bell to see your 20 most recent notifications. Unread ones are tinted blue.
- Click a notification to mark it read and go straight to the related page.
- Click **Mark all read** to clear them all.

You also receive an email for each notification, so you'll know when something needs your attention even when you're not signed in.

---

## 3. Seller Guide

### 3.1 Your dashboard

Your dashboard shows:

- A **Trade-in submission** card with an **Enter VIN →** button to start a new trade-in.
- **Recent submissions**: your 10 most recent trade-ins with the vehicle, reference ID (for example `STV-2026-00042`) and status.

| Status         | Meaning                                                                       |
| -------------- | ----------------------------------------------------------------------------- |
| **Draft**      | Not yet submitted. Click it to keep working, or click **Delete** to remove it |
| **New**        | Submitted and waiting for the Trade Desk                                      |
| **Offer sent** | The Trade Desk has made you an offer. Open it to respond                      |
| **Accepted**   | The trade is agreed                                                           |
| **Declined**   | The trade has ended without agreement                                         |

### 3.2 Submitting a trade-in

Click **Enter VIN →**. The trade-in wizard has six steps. A progress bar shows where you are. Use **← Back** to return to an earlier step, and **Save & exit** to finish later.

Your work is saved automatically as you type. A draft appears on your dashboard as soon as the VIN has been decoded.

#### Step 1 — VIN

1. Type or paste the 17-character VIN. Letters are converted to capitals automatically.
2. Under the field you'll see a character count and, once you reach 17, whether the VIN's check digit is valid. An "invalid" checksum is only a warning; check for typos.
3. Click **Decode VIN**.

> **VIN tips:** VINs never contain the letters I, O or Q (they're easily confused with 1 and 0). The VIN is on the driver-side dashboard (visible through the windshield), the driver's door jamb, and the registration and title documents.

If you see "This VIN could not be decoded", check each character and try again. If you see "Unable to reach the VIN decode service", wait a moment and try again.

#### Step 2 — Vehicle info

The year, make, model, trim, drivetrain and engine are filled in from the VIN decode. Check them, correct anything that's wrong, and enter:

- **Mileage** (whole miles, as shown on the odometer)
- **Color**

Click **Continue**.

#### Step 3 — Condition

Answer honestly. The condition drives the offer.

| Question                      | Options                                                                             |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| Mechanical — runs & drives?   | Yes / Starts only / No                                                              |
| Warning lights on?            | None / Check engine / Other (then describe which light)                             |
| Structural / accident history | Clean — no known damage / Prior accident — repaired / Prior accident — needs repair |
| Cosmetic                      | Select any that apply: Minor scratches, Dents, Curbed wheels, Interior wear         |
| Tire condition                | Good / Fair / Poor                                                                  |
| Windshield                    | Good / Fair / Poor                                                                  |

#### Step 4 — Trade & payoff

- **Customer's expected allowance**: what the customer hopes to get for the vehicle.
- **Lien / payoff status**: "No lien — clear title" or "Active lien — payoff required".
- **Payoff amount** and **Lienholder**: fill these in if there's an active lien.
- **Title available?**: In hand / With lienholder / Lost / duplicate needed.
- **Seller notes / disclosures**: anything the Trade Desk should know (up to 2,000 characters).

Click **Continue to photos**.

#### Step 5 — Photos

There are 12 photo slots: Front, Rear, Driver side, Passenger side, Interior, Odometer, VIN label, Dash, and Damage 1–4.

- Tap a slot to take a photo or choose one from your device. On a phone you can use the camera directly.
- Tap **Capture {slot}** to fill the next empty slot.
- To replace a photo, tap its slot again.
- Photos are compressed on your device before uploading, so large photos are fine.

**You need at least 6 photos to continue.** More photos usually mean a more accurate offer. Use the Damage slots for close-ups of any damage.

Click **Review & submit →**.

#### Step 6 — Review & submit

Check the summary of the vehicle, condition, trade & payoff and photos. Use **← Back** to fix anything. When you're ready, click **Submit**.

You'll see a **Submitted** confirmation with your reference ID. The Trade Desk is notified straight away, and you'll get an in-app and email notification when an offer is ready.

> Once submitted, a trade-in can no longer be edited. Use **Messages** (3.5) to send the Trade Desk any corrections.

### 3.3 Saving, resuming and deleting drafts

- Click **Save & exit** at any step to return to the dashboard.
- Click the draft on your dashboard to continue where you left off.
- Click **Delete** next to a draft and confirm to remove it permanently. Only drafts can be deleted.

### 3.4 Responding to an offer

When the Trade Desk sends an offer, you'll be notified. Open the submission from the notification or your dashboard. The **Offer received** card shows the amount, the expiry date and time, the offer version (v1, v2…) and any terms.

You have three choices:

- **Accept offer**: agrees the trade. Your name, the date and time, and the offer version are recorded. You'll see a timeline of the trade and the Trade Desk will contact you to arrange drop-off and payoff.
- **Decline**: ends the trade.
- **Propose a different amount**: enter your counter amount and an optional note, then click **Send counter-offer**. The Trade Desk reviews it and either accepts it, or declines it and may send a new offer.

> Offers have an expiry time. If you try to respond after it, you'll see "This offer has expired". Message the Trade Desk to ask for a new offer.

If the Trade Desk sends a revised offer, it replaces the previous one. Only the latest offer can be accepted.

### 3.5 Messages

Every submission has a **Messages** section at the bottom of the page. Use it to talk to the Trade Desk about that trade-in. Type your message (up to 2,000 characters) and click **Send**. The other side is notified. Messages are kept as a history of the trade.

---

## 4. Trade Desk Guide

### 4.1 The submission queue

Your home page lists submitted trade-ins, newest first. Drafts that sellers haven't submitted don't appear.

- The **● n new** pill shows how many submissions are waiting for a first offer.
- **Search** by reference ID, VIN, vehicle, seller email or dealership name.
- **Date range**: Last 24 hours, Last 7 days (default), Last 30 days or All time.
- Each row shows the reference ID, vehicle and last 6 of the VIN, mileage, seller and dealership, age since submission, and status.

Click a reference ID to open the submission.

> The queue shows up to 50 submissions at a time, and search only covers those. Narrow the date range to find older items.

### 4.2 Reviewing a submission

The detail page shows:

- **Photos**: click any thumbnail (or select it and press Enter) to view it full-screen. Close with ×, Escape, or by clicking outside the image.
- **Vehicle & condition** and **Trade & payoff**: everything the seller entered.
- **Internal notes**: notes for the Trade Desk only. Click **Save notes**. Sellers never see these.

> Save your internal notes **after** saving the valuation. Saving the valuation can clear notes that were saved earlier.

### 4.3 Valuation workspace

The valuation workspace is internal and never shown to the seller.

1. **Bid references**: enter a source (e.g. an auction or wholesale buyer) and amount, then click **+ Add**. Add as many as you have. Remove one with its remove button.
2. **Estimated expenses**: Transport, Recon, Arbitration / condition, Other.
3. **Target margin**.
4. Click **Save valuation**.

The **Recommended max acquisition** is calculated as:

> **Best bid − total expenses − target margin**

For example, a best bid of $15,500, expenses of $1,400 and a margin of $1,000 give a recommended maximum of $13,100.

#### Buyer override

If you need to go above the recommended maximum, record an override: enter the amount and a reason (required), then click **Log override**. The override is written to the audit trail with your name and time.

### 4.4 Sending an offer

In the **Offer** panel:

1. Enter the **Offer amount**.
2. Set **Expires**. It defaults to 24 hours from now. Make sure it's in the future.
3. Add **Terms / notes** if needed. These are visible to the seller.
4. Click **Send offer to seller**.

The seller is notified and the status changes to **Offer sent**. To revise an offer, send a new one. It replaces the previous offer and gets the next version number.

### 4.5 Handling a counter-offer

When a seller proposes a different amount, you're notified and the submission goes back to **New**. The Offer panel shows "Seller countered" with their amount and note.

- **Accept counter**: agrees the trade at the seller's amount.
- **Decline**: declines the counter. The trade stays open so you can send a new offer.

### 4.6 Ending a trade

To stop negotiating, click **End negotiation** and confirm. The trade is marked **Declined**, the seller is notified, and no further offers or counters are possible.

### 4.7 Audit trail

Click **View audit trail →** on a submission to see a timestamped record of every key event: who did it, and what happened. Events include Submitted, Limit overridden, Offer sent, Offer countered, Offer accepted, Offer declined and Trade ended.

### 4.8 Messages

Use the **Messages** section at the bottom of each submission to talk with the seller. The seller is notified of each message.

---

## 5. Administrator Guide

### 5.1 Users & roles

Your home page lists every user with their organisation, role, status and last activity. Your own account is marked "(you)".

### 5.2 Inviting a user

1. Click **+ Invite user**.
2. Enter the email and choose a role: **Seller**, **Trade Desk** or **Administrator**.
3. For sellers, also enter the dealership name, license number and phone (phone is required).
4. Click **Create account**.

A temporary password appears in a yellow box and is emailed to the user. **It won't be shown again.** Click **Dismiss** when you're done. The user must choose a new password the first time they sign in.

### 5.3 Approving or rejecting seller requests

Pending requests appear as banners at the top of the page, showing the email, dealership and license number.

- **Approve**: activates the account and emails the seller.
- **Reject**: deletes the request and emails the applicant. This happens immediately, with no confirmation, so check before you click.

> Always use **Approve** for pending sellers rather than editing their status. Approve sends the welcome notification.

### 5.4 Changing a user's role or status

1. Click **Edit** on the user's row.
2. Choose a role: Seller ("Submit & track trade-ins"), Trade Desk ("Value & make offers") or Administrator ("Manage users").
3. Choose a status: **Active** or **Suspended**. Suspended users are blocked immediately and can't sign in.
4. Click **Save**. The user is notified.

You can't change your own role or status. Ask another administrator.

### 5.5 Resetting a password

Click **Reset password** on the user's row. This happens immediately, with no confirmation. A new temporary password is shown once and emailed to the user, they are signed out everywhere, and they must choose a new password at their next sign-in.

---

## 6. Reference

### 6.1 Submission statuses

| Status shown | Meaning                                         | Who acts next                |
| ------------ | ----------------------------------------------- | ---------------------------- |
| Draft        | Being filled in by the seller                   | Seller                       |
| New          | Submitted, or a seller counter-offer is waiting | Trade Desk                   |
| Offer sent   | Trade Desk offer waiting for a response         | Seller                       |
| Accepted     | Trade agreed                                    | Trade Desk arranges drop-off |
| Declined     | Trade ended without agreement                   | —                            |

### 6.2 Offer statuses

| Status     | Meaning                                    |
| ---------- | ------------------------------------------ |
| Pending    | Waiting for a response                     |
| Accepted   | Agreed                                     |
| Declined   | Turned down                                |
| Superseded | Replaced by a newer offer or counter-offer |

### 6.3 Troubleshooting

| Message or problem                        | What to do                                                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| "Invalid email or password"               | Check your email and password. Ask an administrator to reset your password if needed                                      |
| "Account is not active"                   | Your seller request hasn't been approved yet, or your account has been suspended. Contact an administrator                |
| "Current password is incorrect"           | Enter the temporary password exactly as it appears in your email                                                          |
| "This VIN could not be decoded"           | Check every character; remember VINs never contain I, O or Q                                                              |
| "Unable to reach the VIN decode service"  | Wait a minute and try again                                                                                               |
| "Photo upload failed. Please try again."  | Check your connection and try the photo again                                                                             |
| **Review & submit** is greyed out         | Upload at least 6 photos                                                                                                  |
| "This offer has expired"                  | Message the Trade Desk to request a new offer                                                                             |
| "This offer is no longer pending"         | The offer has already been answered or replaced. Reload the page                                                          |
| "Something went wrong. Please try again." | Check every field is filled in correctly (e.g. whole numbers for mileage, passwords at least 10 characters) and try again |
| Signed out unexpectedly                   | You may have signed in elsewhere, or your password was reset. Sign in again                                               |
| First page load is slow                   | The server may be waking up. Wait a few seconds                                                                           |

### 6.4 Support

For help, contact your SourceTheVIN administrator or `<SUPPORT_EMAIL>`.
