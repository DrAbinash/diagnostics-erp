# CARE USB Emergency Billing

Portable emergency billing for USB drives. Use ONLY when CARE (NAS) and DS225+ are both down.

## Structure

```
usb-emergency/
├── runtime/          # Node.js portable binary
├── app/
│   └── server.mjs    # Bundled server (SQLite-based)
├── public/           # Static UI files
├── data/
│   ├── seed/         # Master data from CARE USB seed
│   └── emergency.db  # SQLite database (created on first run)
├── export/           # CSV exports for reconciliation
├── receipts/         # Printed receipts
├── START-EMERGENCY.bat
└── START-EMERGENCY.sh
```

## Build

```bash
# From diagnostics-billing root
cd usb-emergency
npm install
npm run build
```

## Usage

1. **Prepare** (while CARE works):
   - CARE → Settings → Billing → Emergency Billing → Download USB seed
   - Copy seed files to `data/seed/`

2. **Emergency**:
   - Plug USB into any PC
   - Double-click `START-EMERGENCY.bat`
   - Browser opens at `http://127.0.0.1:8898/`
   - Login with CARE credentials from seed

3. **Recovery**:
   - End session
   - Download CSV from `export/`
   - Upload to CARE → Settings → Emergency Billing → Import

## Features

- Billing only (no accounts, no expenses)
- SQLite database (zero-config, file-based)
- Portable Node.js runtime (no installation)
- Compatible with CARE emergency reconciliation
- Bill numbering: `EMG-YYYYMMDD-XXXXX`
- Idempotent imports (UUID-based)
