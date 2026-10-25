# CARE Ultra-Emergency Billing (USB) — User Guide

**Version:** 1.0  
**Date:** October 2026  
**Use ONLY when:** CARE (NAS) and DS225+ Emergency Billing are BOTH down

---

## Table of Contents

1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Preparation (While CARE Works)](#preparation)
4. [Emergency Setup](#emergency-setup)
5. [Using the System](#using-the-system)
6. [Recovery (When CARE is Back)](#recovery)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

---

## Overview

CARE Ultra-Emergency Billing is a **portable, self-contained billing system** that runs from a USB drive on any clinic PC. It requires:

-  No NAS
- ❌ No Docker
- ❌ No network/LAN
-  No internet
- ❌ No installation

**Just plug in the USB and double-click to start billing.**

### When to Use

| Scenario | Use This? |
|----------|-----------|
| CARE (NAS) is down, DS225+ works |  Use DS225+ |
| Both CARE and DS225+ are down | ✅ **Use USB Emergency** |
| Network outage, NAS still running | ❌ Access NAS directly |
| Power outage (laptop + USB) | ✅ **Use USB Emergency** |
| Remote camp/outreach | ✅ **Use USB Emergency** |

---

## System Requirements

### Hardware
- USB drive (any size, 8GB+ recommended)
- Any Windows/Linux/Mac PC
- Laptop or desktop with USB port

### Software
- **Node.js v22** (portable, included in runtime folder)
- Modern web browser (Chrome, Edge, Firefox)

### Files Included
```
care-usb-emergency/
├── runtime/node.exe          ← Portable Node.js (85MB)
├── app/server.mjs            ← Server application
├── public/index.html         ← Web interface
├── data/seed/                ← Master data from CARE
├── export/                   ← CSV exports for reconciliation
├── receipts/                 ← Printed receipts
├── START-EMERGENCY.bat       ← Windows launcher
└── START-EMERGENCY.sh        ← Linux/Mac launcher
```

---

## Preparation (While CARE Works)

**Do this BEFORE the emergency, while CARE is still running.**

### Step 1: Download USB Seed

1. Login to CARE as **super_admin**
2. Go to **Settings → Billing → Emergency Billing**
3. Click **"Download USB Seed"**
4. Save the zip file (e.g., `CARE_ULTRA_EMERGENCY_SEED_20261025.zip`)

### Step 2: Extract Seed Files

Extract the zip and copy these files to your USB drive:

```
data/seed/
├── tests.csv                      ← Test catalogue
├── doctors.csv                    ← Doctor list
└── CARE_EMERGENCY_MASTER_V1.json  ← Full master snapshot
```

### Step 3: Add Node.js Runtime

1. Download Node.js v22 portable:
   - **Windows:** https://nodejs.org/dist/v22.11.0/node-v22.11.0-win-x64.zip
   - **Linux:** https://nodejs.org/dist/v22.11.0/node-v22.11.0-linux-x64.tar.xz
   - **Mac:** https://nodejs.org/dist/v22.11.0/node-v22.11.0-darwin-x64.tar.gz

2. Extract and copy the executable:
   - **Windows:** Copy `node.exe` to `runtime/node.exe`
   - **Linux/Mac:** Copy `node` to `runtime/node`

### Step 4: Test the Setup

1. Double-click `START-EMERGENCY.bat` (Windows) or run `./START-EMERGENCY.sh` (Linux/Mac)
2. Browser should open at `http://127.0.0.1:8898/`
3. Login with default credentials: **owner / 1234**
4. Verify you can see tests and doctors from the seed
5. Close the server (Ctrl+C in the terminal)

### Step 5: Keep Backup Copies

**Keep TWO USB drives** with identical content. Store one in a secure location.

**Refresh the seed** after any of these changes:
- New tests added/removed
- Test prices changed
- New doctors added
- Staff credentials changed

---

## Emergency Setup

### Step 1: Plug In the USB

Insert the USB drive into any reception PC.

### Step 2: Start the Server

**Windows:**
```
Double-click: START-EMERGENCY.bat
```

**Linux/Mac:**
```bash
chmod +x START-EMERGENCY.sh
./START-EMERGENCY.sh
```

A terminal window will open showing:
```
CARE Ultra-Emergency Billing (USB)
Use ONLY if CARE and DS225+ are both down.

Server running at http://127.0.0.1:8898/
Database: E:\care-usb-emergency\data\emergency.db

Press Ctrl+C to stop.
```

### Step 3: Open the Web Interface

The browser should automatically open to:
```
http://127.0.0.1:8898/
```

If it doesn't open automatically, manually navigate to the URL above.

### Step 4: Login

**Default credentials** (if no seed loaded):
- Username: `owner`
- PIN: `1234`

**With seed loaded:**
- Use any CARE staff username and PIN from the seed

### Step 5: Start Emergency Session

**Only admin/super_admin can start sessions:**

1. Click **"Start Session"** (top right)
2. Confirm the session start
3. Reception can now create bills

---

## Using the System

### Dashboard

After login, you'll see the dashboard with:
- **Today's Bills** count
- **Total Revenue** collected
- **Pending Amount** (unpaid bills)
- **Recent Bills** table

### Creating a New Bill

1. Click **"New Bill"** button

2. **Select Patient:**
   - Choose from existing patients (dropdown)
   - OR click **"+ New Patient"** to create one:
     - Name (required)
     - Phone
     - Age
     - Gender

3. **Select Doctor** (optional):
   - Choose referring doctor from dropdown

4. **Select Tests:**
   - Search tests by name or code
   - Check boxes for all tests to bill
   - Total updates automatically

5. **Payment:**
   - **Discount:** Enter discount amount (if any)
   - **Amount Received:** Enter cash/UPI/card amount
   - **Payment Method:** Select Cash, UPI, or Card
   - **Due Amount:** Shows remaining balance

6. Click **"Create Bill"**

7. **Print Receipt:**
   - Bill details display automatically
   - Click **"Print Receipt"** for thermal printer
   - Receipt shows: Bill No, Patient, Tests, Total, Paid, Due, UUID

### Bill Numbering

Bills are numbered: `EMG-YYYYMMDD-XXXXX`

Example: `EMG-20261025-00001`

### Voiding a Bill

**Never delete bills.** Void with a reason:

1. Find the bill in "Recent Bills"
2. Click **"Void"**
3. Enter void reason (required)
4. Bill marked as voided but kept for audit

### Viewing a Bill

1. Click **"View"** on any bill
2. See full details: patient, tests, payments
3. Print receipt if needed

### Export CSV for Reconciliation

When ready to sync back to CARE:

1. Click **"Export CSV"** button
2. CSV saved to `export/` folder on USB
3. Filename: `CARE_EMERGENCY_BILLING_[timestamp].csv`

---

## Recovery (When CARE is Back)

### Step 1: End Emergency Session

**Only admin/super_admin can end sessions:**

1. Click **"End Session"** (top right)
2. Confirm session end
3. No more bills can be created

### Step 2: Export Final CSV

1. Click **"Export CSV"**
2. Confirm file exists in `export/` folder
3. Copy CSV to a safe location (email, cloud, etc.)

### Step 3: Stop the Server

1. Close the browser
2. In the terminal, press **Ctrl+C**
3. Wait for "Stopped" message
4. Safely eject USB

### Step 4: Import to CARE

1. Login to CARE as **super_admin**
2. Go to **Settings → Billing → Emergency Billing**
3. Click **"Upload CSV"**
4. Select the exported CSV file
5. **Preview** the import:
   - Check patient matches (EXACT/PROBABLE/NEW/CONFLICT)
   - Resolve any CONFLICT patients manually
6. Click **"Import Safe"**
7. Verify bills appear in CARE

### Step 5: Verify Import

- Same file imported twice = **0 extra bills** (idempotent)
- Check bill count matches USB export
- Verify total revenue matches
- Do NOT manually type the same visits into CARE

---

## Troubleshooting

### Server Won't Start

**Error:** "Node.js was not found"

**Solution:**
- Check `runtime/node.exe` exists
- If missing, download Node.js v22 portable and copy to `runtime/`
- OR install Node.js v22 on the PC: https://nodejs.org/

### Browser Won't Open

**Solution:**
- Manually open browser
- Navigate to: `http://127.0.0.1:8898/`
- Check firewall isn't blocking localhost

### Login Fails

**Error:** "Invalid credentials"

**Solution:**
- Try default: `owner / 1234`
- If seed was loaded, use CARE credentials from seed
- Check `data/seed/CARE_EMERGENCY_MASTER_V1.json` exists

### Can't See Tests/Doctors

**Solution:**
- Check `data/seed/` folder has seed files
- Verify `tests.csv` and `doctors.csv` are present
- Restart server after adding seed files

### Database Locked

**Error:** "database is locked"

**Solution:**
- Close all browser tabs
- Restart server (Ctrl+C, then run again)
- If persistent, delete `data/emergency.db` and restart (loses unsynced bills)

### Export CSV Empty

**Solution:**
- Check bills were created (see dashboard count)
- Verify session was started before billing
- Check `data/emergency.db` file size > 0

---

## FAQ

### Q: Can I use this if DS225+ is working?

**A:** No. If DS225+ emergency billing is available, use that instead. USB emergency is ONLY for when both CARE and DS225+ are down.

### Q: What happens if I lose the USB drive?

**A:** Paper receipts are your backup. Each receipt has a UUID that can be manually entered into CARE if needed.

### Q: Can multiple PCs use the same USB simultaneously?

**A:** No. The USB database is file-based and doesn't support concurrent access. Use one PC at a time.

### Q: How long can I run emergency billing?

**A:** Indefinitely. The SQLite database can handle thousands of bills. However, sync back to CARE as soon as possible.

### Q: Can I edit a bill after creating it?

**A:** No. Bills are immutable. Void incorrect bills with a reason and create new ones.

### Q: What if I forget to end the session?

**A:** The session stays active. End it before exporting CSV for reconciliation.

### Q: Can I use this for non-emergency billing?

**A:** No. This is designed ONLY for emergencies. Regular billing should use CARE or DS225+.

### Q: How do I update the seed data?

**A:** Download a new USB seed from CARE and replace files in `data/seed/`. Keep two USB drives and update both.

### Q: What about accounts and expenses?

**A:** USB emergency is **billing only**. No accounts, expenses, or commission tracking. Those are handled in CARE after reconciliation.

### Q: Can I print receipts on a thermal printer?

**A:** Yes. The receipt is formatted for 80mm thermal printers. Use browser print (Ctrl+P) and select your thermal printer.

---

## Security Notes

- **Never share the USB drive** with unauthorized personnel
- **Keep backup copies** in secure locations
- **Change default PIN** (owner/1234) after first use
- **Delete seed files** from PC after copying to USB
- **Encrypt USB** if storing patient data long-term (optional)

---

## Support

For issues or questions:
- Check this guide first
- Review CARE documentation: `docs/DS225_EMERGENCY_BILLING_ARCHITECTURE.md`
- Contact system administrator

---

**Remember:** This is NOT a second ERP. It's an ultra-emergency fallback for when all other systems are down. Sync back to CARE as soon as possible.
