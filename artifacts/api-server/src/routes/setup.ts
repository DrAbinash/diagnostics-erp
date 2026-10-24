import { Router } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// POST /api/setup — complete initial setup wizard
router.post("/", async (req, res) => {
  try {
    const { clinic, network, admin } = req.body;
    
    if (!clinic?.name || !admin?.username || !admin?.pin) {
      res.status(400).json({ error: "clinic.name, admin.username, and admin.pin are required" });
      return;
    }
    
    // Check if setup already complete
    const existing = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, "clinic"))
      .limit(1);
    
    if (existing[0]?.value && (existing[0].value as any).name) {
      res.status(400).json({ error: "Setup already complete. Use /api/settings to update." });
      return;
    }
    
    const now = new Date();
    
    // Save clinic settings
    await db
      .insert(settingsTable)
      .values({
        key: "clinic",
        value: {
          name: clinic.name,
          address: clinic.address || "",
          phone: clinic.phone || "",
          email: clinic.email || "",
          logoUrl: clinic.logoUrl || "",
          timezone: clinic.timezone || "Asia/Kolkata",
          locale: clinic.locale || "en-IN",
        },
        updated_at: now,
        updated_by: "setup-wizard",
      })
      .onConflictDoUpdate({
        target: settingsTable.key,
        set: {
          value: {
            name: clinic.name,
            address: clinic.address || "",
            phone: clinic.phone || "",
            email: clinic.email || "",
            logoUrl: clinic.logoUrl || "",
            timezone: clinic.timezone || "Asia/Kolkata",
            locale: clinic.locale || "en-IN",
          },
          updated_at: now,
          updated_by: "setup-wizard",
        },
      });
    
    // Save network settings
    await db
      .insert(settingsTable)
      .values({
        key: "network",
        value: {
          publicUrl: network?.publicUrl || "",
          nasHost: network?.nasHost || "",
          apiPort: network?.apiPort || 8200,
          webPort: network?.webPort || 3100,
          dicomPort: network?.dicomPort || 6433,
        },
        updated_at: now,
        updated_by: "setup-wizard",
      })
      .onConflictDoUpdate({
        target: settingsTable.key,
        set: {
          value: {
            publicUrl: network?.publicUrl || "",
            nasHost: network?.nasHost || "",
            apiPort: network?.apiPort || 8200,
            webPort: network?.webPort || 3100,
            dicomPort: network?.dicomPort || 6433,
          },
          updated_at: now,
          updated_by: "setup-wizard",
        },
      });
    
    // Create admin user (simplified — in production, hash the PIN)
    const { usersTable } = await import("@workspace/db");
    const { hashPin } = await import("../lib/pinHash");
    
    await db.insert(usersTable).values({
      email: admin.username,
      name: admin.name || admin.username,
      pin_hash: hashPin(admin.pin),
      role: "admin",
      created_at: now,
      updated_at: now,
    });
    
    res.json({ ok: true, message: "Setup complete" });
  } catch (error: any) {
    console.error("Setup failed:", error);
    res.status(500).json({ error: error.message || "Setup failed" });
  }
});

// GET /api/setup/status — check if setup is needed
router.get("/status", async (_req, res) => {
  try {
    const clinicRow = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, "clinic"))
      .limit(1);
    
    const clinic = clinicRow[0]?.value as any;
    const setupComplete = !!(clinic?.name && clinic.name.trim().length > 0);
    
    res.json({ setupComplete });
  } catch (error) {
    console.error("Failed to check setup status:", error);
    res.status(500).json({ error: "Failed to check setup status" });
  }
});

export { router as setupRouter };
