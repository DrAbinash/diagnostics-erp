import { Router } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAdminRole } from "../middleware/requireStaffAuth";

const router = Router();

// GET /api/settings — public-safe subset (clinic, branding)
router.get("/", async (_req, res) => {
  try {
    const rows = await db.select().from(settingsTable);
    const settings: Record<string, any> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    // Return only public-safe groups
    res.json({
      clinic: settings.clinic || {},
      branding: settings.branding || {},
      network: {
        publicUrl: settings.network?.publicUrl || "",
      },
    });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// GET /api/settings/admin — full settings (admin only)
router.get("/admin", requireAdminRole, async (_req, res) => {
  try {
    const rows = await db.select().from(settingsTable);
    const settings: Record<string, any> = {};
    for (const row of rows) {
      settings[row.key] = {
        value: row.value,
        updatedAt: row.updated_at,
        updatedBy: row.updated_by,
      };
    }
    res.json({ settings });
  } catch (error) {
    console.error("Failed to fetch admin settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// PUT /api/settings — merge partial update (admin only)
router.put("/", requireAdminRole, async (req, res) => {
  try {
    const updates = req.body as Record<string, any>;
    const staffId = (req as any).staffSession?.subjectId || "system";
    
    for (const [key, value] of Object.entries(updates)) {
      await db
        .insert(settingsTable)
        .values({
          key,
          value: value as any,
          updated_at: new Date(),
          updated_by: staffId,
        })
        .onConflictDoUpdate({
          target: settingsTable.key,
          set: {
            value: value as any,
            updated_at: new Date(),
            updated_by: staffId,
          },
        });
    }
    
    res.json({ ok: true, message: "Settings updated" });
  } catch (error) {
    console.error("Failed to update settings:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// POST /api/settings/test-smtp — test SMTP configuration (admin only)
router.post("/test-smtp", requireAdminRole, async (req, res) => {
  try {
    const { host, port, user, pass, from } = req.body;
    if (!host || !port || !from) {
      res.status(400).json({ error: "host, port, and from are required" });
      return;
    }
    
    // Basic SMTP connectivity test (no actual email sent)
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    });
    
    await transporter.verify();
    res.json({ ok: true, message: "SMTP connection successful" });
  } catch (error: any) {
    res.status(400).json({ ok: false, error: error.message || "SMTP connection failed" });
  }
});

// GET /api/settings/status — check if setup is complete
router.get("/status", async (_req, res) => {
  try {
    const clinicRow = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, "clinic"))
      .limit(1);
    
    const clinic = clinicRow[0]?.value as any;
    const setupComplete = clinic?.name && clinic.name.trim().length > 0;
    
    res.json({ setupComplete });
  } catch (error) {
    console.error("Failed to check setup status:", error);
    res.status(500).json({ error: "Failed to check setup status" });
  }
});

export { router as settingsRouter };
