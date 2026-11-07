/**
 * Request-level: the first-run setup wizard has to create an admin whose PIN can
 * actually be signed into.
 *
 * Two defects here are invisible to a reader of the route until it executes:
 *  1. `setup.ts` awaited `import("../lib/pinHash")`, a module NO commit in this
 *     repository ever contained. The dynamic import throws inside the handler, so
 *     POST /api/setup answered 500 on every call - on the one screen a fresh
 *     installation cannot avoid.
 *  2. it wrote `pin_hash`, which is not a column on `users`; the login path
 *     (`portal.ts`) compares the stored value with bcrypt against `users.pin`, and
 *     the bootstrap seeder in `index.ts` writes bcrypt at cost 12 into that same
 *     column. A wizard that stores the PIN any other way produces an account
 *     nobody can sign into, and a grep-style test would happily pass on it.
 *
 * Both were typecheck errors (`TS2307`, `TS2769`) - which is how they were found -
 * so this test's real job is the semantics: the stored value must be a bcrypt hash
 * of the PIN the operator typed, and a second run must still refuse.
 *
 * The clinic/network settings rows this route refuses to overwrite are captured
 * before the test and restored afterwards, so running it against a database that
 * already has a clinic configured leaves that configuration exactly as it found it.
 */
import { describe, expect, test, beforeAll, afterAll } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createTestApp, hasDatabaseUrl } from "../testSupport/apiTestApp";
import { db } from "@workspace/db";
import { settingsTable, usersTable } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";

describe.skipIf(!hasDatabaseUrl())("setup wizard creates a signable-in admin", () => {
  let app: Express;
  const marker = `vitest-setup-${randomUUID().slice(0, 8)}`;
  const adminEmail = `${marker}@vitest.invalid`;
  const plainPin = "481516";
  type SettingRow = typeof settingsTable.$inferSelect;
  let priorClinic: SettingRow | null = null;
  let priorNetwork: SettingRow | null = null;
  let adminRowId = 0;

  beforeAll(async () => {
    app = await createTestApp();
    const [clinic] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, "clinic"))
      .limit(1);
    const [network] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, "network"))
      .limit(1);
    priorClinic = clinic ?? null;
    priorNetwork = network ?? null;
    await db.delete(settingsTable).where(inArray(settingsTable.key, ["clinic", "network"]));
    await db.delete(usersTable).where(eq(usersTable.email, adminEmail));
  });

  afterAll(async () => {
    if (adminRowId) await db.delete(usersTable).where(eq(usersTable.id, adminRowId));
    await db.delete(settingsTable).where(inArray(settingsTable.key, ["clinic", "network"]));
    for (const row of [priorClinic, priorNetwork]) {
      if (!row) continue;
      await db
        .insert(settingsTable)
        .values({
          key: row.key,
          value: row.value,
          updated_at: row.updated_at,
          updated_by: row.updated_by,
        })
        .onConflictDoUpdate({
          target: settingsTable.key,
          set: { value: row.value, updated_at: row.updated_at, updated_by: row.updated_by },
        });
    }
  });

  test("the wizard completes, and the PIN it stores verifies against the login path", async () => {
    const res = await request(app)
      .post("/api/setup")
      .send({
        clinic: { name: `${marker} Clinic`, timezone: "Asia/Kolkata" },
        network: { publicUrl: "http://127.0.0.1:3100" },
        admin: { username: adminEmail, name: "Wizard Admin", pin: plainPin },
      });

    // Before the fix this was 500 with "Cannot find module '../lib/pinHash'".
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });

    const [admin] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, adminEmail))
      .limit(1);
    if (!admin) throw new Error("the wizard reported ok but created no user row");
    adminRowId = admin.id;

    // Stored as a hash, never the typed PIN.
    expect(admin.pin).not.toBe(plainPin);
    expect(admin.pin).not.toBeNull();
    expect(String(admin.pin)).toMatch(/^\$2[aby]\$/);
    // And the hash is of THIS pin, verified the way portal.ts verifies it.
    await expect(bcrypt.compare(plainPin, String(admin.pin))).resolves.toBe(true);
    expect(admin.role).toBe("admin");
    expect(admin.isActive).toBe(true);
  });

  test("a second run refuses instead of silently re-running the wizard", async () => {
    const res = await request(app)
      .post("/api/setup")
      .send({
        clinic: { name: `${marker} Again` },
        admin: { username: adminEmail, pin: "999999" },
      });
    expect(res.status).toBe(400);
    expect(String(res.body?.error)).toMatch(/already complete/i);
  });
});
