import { DEFAULT_INITIAL_PASSWORD, type AppState, type AppUser, type AuditEntry, type MccCenter } from "@/lib/app-data";
import { mysqlPool } from "@/lib/db";
import type {
  Animal,
  Farmer,
  FarmerPayment,
  MilkCollection,
  MilkBatch,
  Phase2Summary,
  QualityTest,
  VeterinaryRecord,
  CollectionRequest,
  CowRegistrationAuthorization,
  CowRegistrationSession,
  BreedType,
} from "@/lib/phase2-data";
import type { UserRole } from "@/lib/app-data";
import type { RowDataPacket } from "mysql2";
import { createHash, randomInt } from "node:crypto";

function parseMccIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as string[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

type CowRegistrationInput = Pick<Animal, "animalId" | "farmerId" | "tagNumber" | "breed" | "sex" | "status">;

function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

export async function createCowRegistrationBatch(input: {
  batchId: string;
  farmerId: string;
  requestedBy: string;
  cows: CowRegistrationInput[];
}): Promise<{ batchId: string; expiresAt: string }> {
  if (!input.batchId || !input.farmerId || !input.requestedBy || !input.cows.length) {
    throw new Error("Select a farmer and add at least one cow.");
  }
  const tags = input.cows.map((cow) => cow.tagNumber.trim().toLowerCase());
  if (new Set(tags).size !== tags.length) throw new Error("Cow tag numbers must be unique within the batch.");
  for (const cow of input.cows) {
    if (!cow.animalId || cow.farmerId !== input.farmerId || !cow.tagNumber.trim() || !cow.breed?.trim() || !cow.sex) {
      throw new Error("Every cow requires a unique tag number, breed, sex, and the selected farmer.");
    }
  }

  const connection = await mysqlPool.getConnection();
  try {
    await connection.beginTransaction();
    const [farmerRows] = await connection.execute<RowDataPacket[]>(
      "SELECT farmer_id FROM farmers WHERE farmer_id = ? AND status = 'ACTIVE' FOR UPDATE",
      [input.farmerId],
    );
    if (!farmerRows.length) throw new Error("The selected farmer was not found.");
    const [existingTags] = await connection.execute<RowDataPacket[]>(
      `SELECT tag_number FROM animals WHERE LOWER(tag_number) IN (${input.cows.map(() => "?").join(",")})`,
      input.cows.map((cow) => cow.tagNumber.trim().toLowerCase()),
    );
    if (existingTags.length) throw new Error(`Cow tag already exists: ${String(existingTags[0].tag_number)}.`);
    const [existingBatch] = await connection.execute<RowDataPacket[]>(
      "SELECT batch_id FROM cow_registration_batches WHERE batch_id = ? LIMIT 1",
      [input.batchId],
    );
    if (existingBatch.length) throw new Error("This cow-registration batch already exists.");

    const otp = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const createdAt = new Date();
    const authorizationSessionId = `AUTH-SESSION-${Date.now()}-${randomInt(1000, 9999)}`;
    await connection.execute(
      `INSERT INTO cow_registration_batches
       (batch_id, authorization_session_id, farmer_id, requested_by, cow_count, status, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, 'PENDING_AUTHORIZATION', ?, ?)`,
      [input.batchId, authorizationSessionId, input.farmerId, input.requestedBy, input.cows.length, createdAt, expiresAt],
    );
    await connection.execute(
      `INSERT INTO cow_registration_authorizations
       (authorization_session_id, batch_id, farmer_id, otp_hash, otp_code, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [authorizationSessionId, input.batchId, input.farmerId, hashOtp(otp), otp, createdAt, expiresAt],
    );
    for (const cow of input.cows) {
      await connection.execute(
        `INSERT INTO cow_registration_batch_items (batch_id, animal_id, tag_number, breed, sex)
         VALUES (?, ?, ?, ?, ?)`,
        [input.batchId, cow.animalId, cow.tagNumber.trim(), String(cow.breed).trim(), cow.sex],
      );
    }
    await connection.commit();
    console.info(`Cow registration OTP ${otp} generated for farmer ${input.farmerId}; deliver to the farmer phone.`);
    return { batchId: input.batchId, expiresAt: expiresAt.toISOString() };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listCowRegistrationAuthorizations(user: AppUser): Promise<CowRegistrationAuthorization[]> {
  if (user.role !== "FARMER") return [];
  await mysqlPool.execute(
    `UPDATE cow_registration_batches b
     JOIN cow_registration_authorizations a ON a.batch_id = b.batch_id
     SET b.status = 'EXPIRED', a.status = 'EXPIRED'
     WHERE b.status = 'PENDING_AUTHORIZATION' AND a.expires_at <= NOW() AND a.status = 'PENDING'`,
  );
  const [rows] = await mysqlPool.execute<RowDataPacket[]>(
    `SELECT b.batch_id, b.farmer_id, f.full_name AS farmer_name, b.requested_by,
            u.full_name AS requested_by_name, b.status, a.otp_code, b.created_at, b.expires_at,
            COUNT(bc.id) AS cow_count,
            GROUP_CONCAT(bc.tag_number ORDER BY bc.id SEPARATOR ',') AS cow_tags
     FROM cow_registration_batches b
     JOIN cow_registration_authorizations a ON a.batch_id = b.batch_id
     JOIN farmers f ON f.farmer_id = b.farmer_id
     LEFT JOIN users u ON u.uid = b.requested_by
     LEFT JOIN cow_registration_batch_items bc ON bc.batch_id = b.batch_id
     WHERE f.user_id = ? AND b.status IN ('PENDING_AUTHORIZATION', 'EXPIRED')
     GROUP BY b.batch_id, b.farmer_id, f.full_name, b.requested_by, u.full_name, b.status,
              a.otp_code, b.created_at, b.expires_at
     ORDER BY b.created_at DESC`,
    [user.uid],
  );
  return rows.map((row) => ({
    batchId: String(row.batch_id),
    farmerId: String(row.farmer_id),
    farmerName: String(row.farmer_name),
    requestedBy: String(row.requested_by),
    requestedByName: String(row.requested_by_name ?? row.requested_by),
    cowCount: Number(row.cow_count ?? 0),
    cowTags: row.cow_tags ? String(row.cow_tags).split(",") : [],
    status: row.status as CowRegistrationAuthorization["status"],
    otpCode: String(row.otp_code),
    createdAt: new Date(row.created_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
  }));
}

export async function listCowRegistrationSessions(): Promise<CowRegistrationSession[]> {
  await mysqlPool.execute(
    `UPDATE cow_registration_batches b
     JOIN cow_registration_authorizations a ON a.batch_id = b.batch_id
     SET b.status = 'EXPIRED', a.status = 'EXPIRED'
     WHERE b.status = 'PENDING_AUTHORIZATION' AND a.status = 'PENDING' AND a.expires_at <= NOW()`,
  );
  const [rows] = await mysqlPool.execute<RowDataPacket[]>(
    `SELECT b.batch_id, b.farmer_id, f.full_name AS farmer_name, f.phone AS farmer_phone,
            b.requested_by, u.full_name AS requested_by_name, b.status, a.authorization_session_id,
            a.otp_code, a.created_at, a.expires_at, a.verified_at, a.used_at, a.failed_attempts,
            COUNT(bc.id) AS cow_count,
            GROUP_CONCAT(bc.tag_number ORDER BY bc.id SEPARATOR ',') AS cow_tags
     FROM cow_registration_batches b
     JOIN cow_registration_authorizations a ON a.batch_id = b.batch_id
     JOIN farmers f ON f.farmer_id = b.farmer_id
     LEFT JOIN users u ON u.uid = b.requested_by
     LEFT JOIN cow_registration_batch_items bc ON bc.batch_id = b.batch_id
     GROUP BY b.batch_id, b.farmer_id, f.full_name, f.phone, b.requested_by, u.full_name,
              b.status, a.authorization_session_id, a.otp_code, a.created_at, a.expires_at,
              a.verified_at, a.used_at, a.failed_attempts
     ORDER BY a.created_at DESC`,
  );
  return rows.map((row) => ({
    batchId: String(row.batch_id),
    farmerId: String(row.farmer_id),
    farmerName: String(row.farmer_name),
    farmerPhone: String(row.farmer_phone),
    requestedBy: String(row.requested_by),
    requestedByName: String(row.requested_by_name ?? row.requested_by),
    authorizationSessionId: String(row.authorization_session_id),
    cowCount: Number(row.cow_count ?? 0),
    cowTags: row.cow_tags ? String(row.cow_tags).split(",") : [],
    status: row.status as CowRegistrationSession["status"],
    otpCode: String(row.otp_code),
    createdAt: new Date(row.created_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
    verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : undefined,
    usedAt: row.used_at ? new Date(row.used_at).toISOString() : undefined,
    failedAttempts: Number(row.failed_attempts ?? 0),
  }));
}

export async function listBreedTypes(): Promise<BreedType[]> {
  const [rows] = await mysqlPool.execute<RowDataPacket[]>(
    "SELECT id, breed_name FROM breed_types WHERE status = 'ACTIVE' ORDER BY breed_name",
  );
  return rows.map((row) => ({ id: Number(row.id), name: String(row.breed_name) }));
}

export async function createBreedType(name: string, createdBy: string): Promise<BreedType> {
  const normalized = name.trim();
  if (!normalized) throw new Error("Breed type name is required.");
  await mysqlPool.execute(
    "INSERT INTO breed_types (breed_name, created_by) VALUES (?, ?)",
    [normalized, createdBy],
  );
  const [rows] = await mysqlPool.execute<RowDataPacket[]>(
    "SELECT id, breed_name FROM breed_types WHERE breed_name = ?",
    [normalized],
  );
  const row = rows[0];
  if (!row) throw new Error("Breed type could not be created.");
  return { id: Number(row.id), name: String(row.breed_name) };
}

export async function verifyCowRegistrationBatch(input: {
  batchId: string;
  otp: string;
  requestedBy: string;
}): Promise<{ registeredCount: number; batchId: string }> {
  if (!/^\d{6}$/.test(input.otp)) throw new Error("Enter the six-digit authorization OTP.");
  const connection = await mysqlPool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT b.*, a.otp_hash, a.expires_at AS authorization_expires_at, a.status AS authorization_status
       FROM cow_registration_batches b
       JOIN cow_registration_authorizations a ON a.batch_id = b.batch_id
       WHERE b.batch_id = ? AND b.requested_by = ? FOR UPDATE`,
      [input.batchId, input.requestedBy],
    );
    const authorization = rows[0];
    if (!authorization) throw new Error("Registration authorization was not found.");
    if (authorization.status !== "PENDING_AUTHORIZATION" || authorization.authorization_status !== "PENDING") {
      throw new Error("This cow-registration batch is no longer awaiting authorization.");
    }
    if (new Date(authorization.authorization_expires_at).getTime() <= Date.now()) {
      await connection.execute("UPDATE cow_registration_batches SET status = 'EXPIRED' WHERE batch_id = ?", [input.batchId]);
      await connection.execute("UPDATE cow_registration_authorizations SET status = 'EXPIRED' WHERE batch_id = ?", [input.batchId]);
      throw new Error("The authorization OTP has expired.");
    }
    if (hashOtp(input.otp) !== String(authorization.otp_hash)) {
      await connection.execute("UPDATE cow_registration_authorizations SET failed_attempts = failed_attempts + 1 WHERE batch_id = ?", [input.batchId]);
      throw new Error("Invalid authorization OTP.");
    }
    const [batchCows] = await connection.execute<RowDataPacket[]>(
      "SELECT * FROM cow_registration_batch_items WHERE batch_id = ? ORDER BY id",
      [input.batchId],
    );
    if (!batchCows.length) throw new Error("This registration batch has no cows.");
    const [duplicateTags] = await connection.execute<RowDataPacket[]>(
      "SELECT tag_number FROM animals WHERE tag_number IN (?)",
      [batchCows.map((cow) => cow.tag_number)],
    );
    if (duplicateTags.length) throw new Error(`Cow tag already exists: ${String(duplicateTags[0].tag_number)}.`);
    for (const cow of batchCows) {
      await connection.execute(
        `INSERT INTO animals (animal_id, farmer_id, tag_number, breed, sex, status, registration_batch_id)
         VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)`,
        [cow.animal_id, authorization.farmer_id, cow.tag_number, cow.breed, cow.sex, input.batchId],
      );
    }
    await connection.execute("UPDATE cow_registration_batches SET status = 'REGISTERED', authorized_at = NOW() WHERE batch_id = ?", [input.batchId]);
    await connection.execute("UPDATE cow_registration_authorizations SET status = 'USED', verified_at = NOW(), used_at = NOW() WHERE batch_id = ?", [input.batchId]);
    await connection.commit();
    return { registeredCount: batchCows.length, batchId: input.batchId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function toUser(row: any): AppUser {
  return {
    uid: String(row.uid),
    username: String(row.username ?? row.email),
    fullName: String(row.full_name),
    email: String(row.email),
    password: String(row.password),
    mustChangePassword: Boolean(row.must_change_password),
    role: row.role as AppUser["role"],
    mccIds: parseMccIds(row.mcc_ids),
    status: row.status as AppUser["status"],
  };
}

function toMcc(row: any): MccCenter {
  return {
    mccId: String(row.mcc_id),
    mccCode: String(row.mcc_code),
    name: String(row.name),
    description: String(row.description ?? ""),
    district: String(row.district ?? ""),
    sector: String(row.sector ?? ""),
    cell: String(row.cell ?? ""),
    village: String(row.village ?? ""),
    phone: String(row.phone ?? ""),
    email: String(row.email ?? ""),
    managerUserId: row.manager_user_id ? String(row.manager_user_id) : undefined,
    status: row.status as MccCenter["status"],
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function toAudit(row: any): AuditEntry {
  return {
    auditId: String(row.audit_id),
    userId: String(row.user_id),
    action: String(row.action),
    module: String(row.module),
    entityType: String(row.entity_type),
    entityId: String(row.entity_id),
    description: String(row.description),
    timestamp: String(row.timestamp ?? new Date().toISOString()),
  };
}

export async function readDatabaseState(): Promise<AppState> {
  const [userRows] = await mysqlPool.execute(`SELECT * FROM users ORDER BY id DESC`);
  const [mccRows] = await mysqlPool.execute(`SELECT * FROM mccs ORDER BY id DESC`);
  const [auditRows] = await mysqlPool.execute(`SELECT * FROM audit_logs ORDER BY id DESC`);
  const [settingRows] = await mysqlPool.execute(`SELECT key_name, value_text FROM settings`);

  const settingsMap = Object.fromEntries(
    (settingRows as any[]).map((row) => [row.key_name, row.value_text]),
  );

  return {
    users: (userRows as any[]).map(toUser),
    mccs: (mccRows as any[]).map(toMcc),
    auditLogs: (auditRows as any[]).map(toAudit),
    settings: {
      projectName: String(settingsMap.projectName ?? "Digital Milk Collection System"),
      milkPrice: Number(settingsMap.milkPrice ?? 620),
      mccSharePercent: Number(settingsMap.mccSharePercent ?? 10),
      collectorSharePercent: Number(settingsMap.collectorSharePercent ?? 5),
      timezone: String(settingsMap.timezone ?? "UTC"),
      notificationEmail: String(settingsMap.notificationEmail ?? "notify@milk.local"),
    },
  };
}

export async function saveDatabaseState(state: AppState): Promise<void> {
  const connection = await mysqlPool.getConnection();

  try {
    await connection.beginTransaction();

    for (const user of state.users) {
      await connection.execute(
        `INSERT INTO users (uid, username, full_name, email, password, role, mcc_ids, status, must_change_password)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           username = VALUES(username),
           full_name = VALUES(full_name),
           email = VALUES(email),
           password = VALUES(password),
           role = VALUES(role),
           mcc_ids = VALUES(mcc_ids),
           status = VALUES(status),
           must_change_password = VALUES(must_change_password)`,
        [user.uid, user.username ?? user.email, user.fullName, user.email, user.password, user.role, JSON.stringify(user.mccIds ?? []), user.status, user.mustChangePassword ? 1 : 0],
      );
    }

    for (const mcc of state.mccs) {
      await connection.execute(
        `INSERT INTO mccs (mcc_id, mcc_code, name, description, district, sector, cell, village, phone, email, manager_user_id, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           description = VALUES(description),
           district = VALUES(district),
           sector = VALUES(sector),
           cell = VALUES(cell),
           village = VALUES(village),
           phone = VALUES(phone),
           email = VALUES(email),
           manager_user_id = VALUES(manager_user_id),
           status = VALUES(status),
           updated_at = NOW()`,
        [
          mcc.mccId,
          mcc.mccCode,
          mcc.name,
          mcc.description,
          mcc.district,
          mcc.sector,
          mcc.cell,
          mcc.village,
          mcc.phone,
          mcc.email,
          mcc.managerUserId ?? null,
          mcc.status,
          mcc.createdAt,
        ],
      );
    }

    for (const audit of state.auditLogs) {
      await connection.execute(
        `INSERT INTO audit_logs (audit_id, user_id, action, module, entity_type, entity_id, description, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           user_id = VALUES(user_id),
           action = VALUES(action),
           module = VALUES(module),
           entity_type = VALUES(entity_type),
           entity_id = VALUES(entity_id),
           description = VALUES(description),
           timestamp = VALUES(timestamp)`,
        [audit.auditId, audit.userId, audit.action, audit.module, audit.entityType, audit.entityId, audit.description, audit.timestamp],
      );
    }

    await connection.execute(
      `INSERT INTO settings (key_name, value_text) VALUES (?, ?) ON DUPLICATE KEY UPDATE value_text = VALUES(value_text)`,
      ["projectName", state.settings.projectName],
    );
    await connection.execute(
      `INSERT INTO settings (key_name, value_text) VALUES (?, ?) ON DUPLICATE KEY UPDATE value_text = VALUES(value_text)`,
      ["milkPrice", String(state.settings.milkPrice)],
    );
    for (const [key, value] of [["mccSharePercent", state.settings.mccSharePercent ?? 10], ["collectorSharePercent", state.settings.collectorSharePercent ?? 5]]) {
      await connection.execute(
        `INSERT INTO settings (key_name, value_text) VALUES (?, ?) ON DUPLICATE KEY UPDATE value_text = VALUES(value_text)`,
        [key, String(value)],
      );
    }
    await connection.execute(
      `INSERT INTO settings (key_name, value_text) VALUES (?, ?) ON DUPLICATE KEY UPDATE value_text = VALUES(value_text)`,
      ["timezone", state.settings.timezone],
    );
    await connection.execute(
      `INSERT INTO settings (key_name, value_text) VALUES (?, ?) ON DUPLICATE KEY UPDATE value_text = VALUES(value_text)`,
      ["notificationEmail", state.settings.notificationEmail],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateMccByAdmin(input: {
  mccId: string;
  name: string;
  district: string;
}): Promise<void> {
  const name = input.name.trim();
  const district = input.district.trim();
  if (!input.mccId || !name || !district) {
    throw new Error("MCC name and district are required.");
  }

  const [result] = await mysqlPool.execute(
    "UPDATE mccs SET name = ?, district = ?, updated_at = NOW() WHERE mcc_id = ?",
    [name, district, input.mccId],
  );
  if ((result as { affectedRows?: number }).affectedRows !== 1) {
    throw new Error("MCC was not found.");
  }
}

export async function loginUser(email: string, password: string): Promise<AppUser | null> {
  const [rows] = await mysqlPool.execute(`SELECT * FROM users WHERE (email = ? OR username = ?) AND password = ? LIMIT 1`, [email, email, password]);
  const row = (rows as any[])[0];
  return row ? toUser(row) : null;
}

export async function changeUserPassword(uid: string, currentPassword: string, newPassword: string): Promise<void> {
  if (!uid || !currentPassword || newPassword.length < 8) {
    throw new Error("A new password of at least 8 characters is required.");
  }
  const [result] = await mysqlPool.execute(
    "UPDATE users SET password = ?, must_change_password = 0 WHERE uid = ? AND password = ?",
    [newPassword, uid, currentPassword],
  );
  if ((result as { affectedRows?: number }).affectedRows !== 1) {
    throw new Error("The current password is incorrect.");
  }
}

export async function getUserByUid(uid: string): Promise<AppUser | null> {
  const [rows] = await mysqlPool.execute("SELECT * FROM users WHERE uid = ? LIMIT 1", [uid]);
  const row = (rows as any[])[0];
  return row ? toUser(row) : null;
}

export async function updateUserByAdmin(input: Pick<AppUser, "uid" | "fullName" | "email" | "role" | "status"> & { password?: string }): Promise<void> {
  await mysqlPool.execute(
    `UPDATE users SET full_name = ?, email = ?, role = ?, status = ?, password = COALESCE(?, password), must_change_password = CASE WHEN ? IS NULL THEN must_change_password ELSE 1 END WHERE uid = ?`,
    [input.fullName, input.email, input.role, input.status, input.password || null, input.password || null, input.uid],
  );
}

export async function createUser(input: Pick<AppUser, "uid" | "fullName" | "email" | "password" | "role" | "mccIds" | "status">): Promise<void> {
  await mysqlPool.execute(
    `INSERT INTO users (uid, username, full_name, email, password, role, mcc_ids, status, must_change_password)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [input.uid, input.email, input.fullName, input.email, input.password, input.role, JSON.stringify(input.mccIds ?? []), input.status],
  );
}

export async function deleteUserByAdmin(uid: string): Promise<void> {
  await mysqlPool.execute("DELETE FROM users WHERE uid = ?", [uid]);
}

export async function listAuditLogsForAdmin(): Promise<AuditEntry[]> {
  const [rows] = await mysqlPool.execute("SELECT * FROM audit_logs ORDER BY id DESC");
  return (rows as any[]).map(toAudit);
}

export async function appendAuditEntryToDatabase(entry: Omit<AuditEntry, "auditId" | "timestamp">, userId = "system"): Promise<void> {
  const auditId = `audit-${Date.now()}`;
  const timestamp = new Date().toISOString();

  await mysqlPool.execute(
    `INSERT INTO audit_logs (audit_id, user_id, action, module, entity_type, entity_id, description, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [auditId, userId, entry.action, entry.module, entry.entityType, entry.entityId, entry.description, timestamp],
  );
}

function toFarmer(row: any): Farmer {
  return {
    farmerId: String(row.farmer_id),
    userId: row.user_id ? String(row.user_id) : undefined,
    fullName: String(row.full_name),
    nationalId: row.national_id ? String(row.national_id) : undefined,
    phone: String(row.phone),
    email: row.email ? String(row.email) : undefined,
    district: row.district ? String(row.district) : undefined,
    sector: row.sector ? String(row.sector) : undefined,
    village: row.village ? String(row.village) : undefined,
    cell: row.cell ? String(row.cell) : undefined,
    mccId: String(row.mcc_id),
    mccName: row.mcc_name ? String(row.mcc_name) : undefined,
    registeredBy: row.registered_by ? String(row.registered_by) : undefined,
    status: row.status as Farmer["status"],
    createdAt: String(row.created_at),
  };
}

function toAnimal(row: any): Animal {
  return {
    animalId: String(row.animal_id),
    farmerId: String(row.farmer_id),
    tagNumber: String(row.tag_number),
    breed: row.breed ? String(row.breed) : undefined,
    sex: row.sex as Animal["sex"],
    dateOfBirth: row.date_of_birth ? String(row.date_of_birth).slice(0, 10) : undefined,
    status: row.status as Animal["status"],
    registrationBatchId: row.registration_batch_id ? String(row.registration_batch_id) : undefined,
    createdAt: String(row.created_at),
  };
}

function toCollection(row: any): MilkCollection {
  return {
    collectionId: String(row.collection_id),
    farmerId: String(row.farmer_id),
    animalId: row.animal_id ? String(row.animal_id) : undefined,
    mccId: String(row.mcc_id),
    collectionDate: new Date(row.collection_date).toISOString(),
    litres: Number(row.litres),
    fatPercentage: row.fat_percentage === null ? undefined : Number(row.fat_percentage),
    temperatureC: row.temperature_c === null ? undefined : Number(row.temperature_c),
    acceptanceStatus: row.acceptance_status as MilkCollection["acceptanceStatus"],
    collectorAcceptanceStatus: (row.collector_acceptance_status ?? row.acceptance_status) as MilkCollection["collectorAcceptanceStatus"],
    mccAcceptanceStatus: (row.mcc_acceptance_status ?? row.acceptance_status) as MilkCollection["mccAcceptanceStatus"],
    mccComment: row.mcc_comment ? String(row.mcc_comment) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    collectedBy: String(row.collected_by),
    collectorName: row.collector_name ? String(row.collector_name) : undefined,
    collectorMccName: row.collector_mcc_name ? String(row.collector_mcc_name) : undefined,
  };
}

function toVeterinaryRecord(row: any): VeterinaryRecord {
  return {
    recordId: String(row.record_id),
    animalId: String(row.animal_id),
    visitDate: String(row.visit_date).slice(0, 10),
    diagnosis: String(row.diagnosis),
    treatment: row.treatment ? String(row.treatment) : undefined,
    medicine: row.medicine ? String(row.medicine) : undefined,
    withdrawalUntil: row.withdrawal_until ? String(row.withdrawal_until).slice(0, 10) : undefined,
    veterinarianId: String(row.veterinarian_id),
    notes: row.notes ? String(row.notes) : undefined,
    clearanceStatus: (row.clearance_status ?? "ACTIVE") as VeterinaryRecord["clearanceStatus"],
  };
}

function toQualityTest(row: any): QualityTest {
  return {
    testId: String(row.test_id),
    collectionId: String(row.collection_id),
    acidity: row.acidity === null ? undefined : Number(row.acidity),
    density: row.density === null ? undefined : Number(row.density),
    adulterationDetected: Boolean(row.adulteration_detected),
    result: row.result as QualityTest["result"],
    testedBy: String(row.tested_by),
    testedAt: String(row.tested_at),
  };
}

function toBatch(row: any): MilkBatch {
  return {
    batchId: String(row.batch_id),
    mccId: String(row.mcc_id),
    batchDate: String(row.batch_date).slice(0, 10),
    totalLitres: Number(row.total_litres),
    destination: row.destination ? String(row.destination) : undefined,
    status: row.status as MilkBatch["status"],
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
    collectionIds: row.collection_ids ? String(row.collection_ids).split(",") : [],
  };
}

function toPayment(row: any): FarmerPayment {
  return {
    paymentId: String(row.payment_id),
    farmerId: String(row.farmer_id),
    periodStart: String(row.period_start).slice(0, 10),
    periodEnd: String(row.period_end).slice(0, 10),
    litres: Number(row.litres),
    ratePerLitre: Number(row.rate_per_litre),
    amount: Number(row.amount),
    status: row.status as FarmerPayment["status"],
    paidAt: row.paid_at ? String(row.paid_at) : undefined,
    processedBy: String(row.processed_by),
    createdAt: String(row.created_at),
  };
}

export async function listFarmers(): Promise<Farmer[]> {
  const [rows] = await mysqlPool.execute("SELECT * FROM farmers ORDER BY id DESC");
  return (rows as any[]).map(toFarmer);
}

export async function listAnimals(): Promise<Animal[]> {
  const [rows] = await mysqlPool.execute("SELECT * FROM animals ORDER BY id DESC");
  return (rows as any[]).map(toAnimal);
}

export async function listCollections(): Promise<MilkCollection[]> {
  const [rows] = await mysqlPool.execute("SELECT * FROM milk_collections ORDER BY collection_date DESC, id DESC LIMIT 200");
  return (rows as any[]).map(toCollection);
}

export async function listVeterinaryRecords(): Promise<VeterinaryRecord[]> {
  const [rows] = await mysqlPool.execute("SELECT * FROM veterinary_records ORDER BY visit_date DESC, id DESC LIMIT 200");
  return (rows as any[]).map(toVeterinaryRecord);
}

export async function listQualityTests(): Promise<QualityTest[]> {
  const [rows] = await mysqlPool.execute("SELECT * FROM quality_tests ORDER BY tested_at DESC, id DESC LIMIT 200");
  return (rows as any[]).map(toQualityTest);
}

export async function listBatches(): Promise<MilkBatch[]> {
  const [rows] = await mysqlPool.execute("SELECT * FROM milk_batches ORDER BY batch_date DESC, id DESC LIMIT 200");
  return (rows as any[]).map(toBatch);
}

export async function listPayments(): Promise<FarmerPayment[]> {
  const [rows] = await mysqlPool.execute("SELECT * FROM farmer_payments ORDER BY created_at DESC, id DESC LIMIT 200");
  return (rows as any[]).map(toPayment);
}

export async function getScopedPhase2Data(user: AppUser): Promise<{
  farmers: Farmer[];
  animals: Animal[];
  collections: MilkCollection[];
  veterinaryRecords: VeterinaryRecord[];
  qualityTests: QualityTest[];
  batches: MilkBatch[];
  payments: FarmerPayment[];
  milkPrice: number;
  mccSharePercent: number;
  collectorSharePercent: number;
  collectionRequests: CollectionRequest[];
  cowRegistrationAuthorizations: CowRegistrationAuthorization[];
  mccs: MccCenter[];
  breedTypes: BreedType[];
  summary: Phase2Summary;
}> {
  const role: UserRole = user.role;
  let farmerFilter = "";
  let farmerParams: string[] = [];
  let collectionFilter = "";
  let collectionParams: string[] = [];
  let vetFilter = "";
  let vetParams: string[] = [];

  if (role === "FARMER") {
    farmerFilter = " WHERE f.user_id = ?";
    farmerParams = [user.uid];
    collectionFilter = " WHERE farmer_id = (SELECT farmer_id FROM farmers WHERE user_id = ?)";
    collectionParams = [user.uid];
    vetFilter = " WHERE animal_id IN (SELECT animal_id FROM animals WHERE farmer_id = (SELECT farmer_id FROM farmers WHERE user_id = ?))";
    vetParams = [user.uid];
  } else if (role === "MILK_COLLECTOR") {
    farmerFilter = " WHERE f.registered_by = ? OR f.farmer_id IN (SELECT farmer_id FROM milk_collection_requests WHERE collector_id = ? AND status IN ('PENDING', 'ACCEPTED'))";
    farmerParams = [user.uid, user.uid];
    collectionFilter = " WHERE collected_by = ?";
    collectionParams = [user.uid];
    vetFilter = " WHERE animal_id IN (SELECT a.animal_id FROM animals a JOIN farmers f ON f.farmer_id = a.farmer_id WHERE f.registered_by = ?)";
    vetParams = [user.uid];
  } else if (role === "VETERINARY_OFFICER") {
    vetFilter = " WHERE veterinarian_id = ?";
    vetParams = [user.uid];
  }

  const farmerQuery = `SELECT f.*, m.name AS mcc_name FROM farmers f LEFT JOIN mccs m ON m.mcc_id = f.mcc_id${farmerFilter} ORDER BY f.id DESC`;
  const animalQuery = role === "FARMER"
    ? "SELECT * FROM animals WHERE farmer_id = (SELECT farmer_id FROM farmers WHERE user_id = ?) ORDER BY id DESC"
    : role === "MILK_COLLECTOR"
      ? "SELECT a.* FROM animals a JOIN farmers f ON f.farmer_id = a.farmer_id WHERE f.registered_by = ? OR f.farmer_id IN (SELECT farmer_id FROM milk_collection_requests WHERE collector_id = ? AND status = 'ACCEPTED') ORDER BY a.id DESC"
    : "SELECT * FROM animals ORDER BY id DESC";
  const collectionQuery = `SELECT c.*, u.full_name AS collector_name, m.name AS collector_mcc_name FROM milk_collections c LEFT JOIN users u ON u.uid = c.collected_by LEFT JOIN mccs m ON JSON_CONTAINS(u.mcc_ids, JSON_QUOTE(m.mcc_id))${collectionFilter.replace(" WHERE ", " WHERE ")} ORDER BY c.collection_date DESC, c.id DESC LIMIT 200`;
  const vetQuery = `SELECT * FROM veterinary_records${vetFilter} ORDER BY visit_date DESC, id DESC LIMIT 200`;
  const qualityQuery = role === "MILK_COLLECTOR"
    ? "SELECT q.* FROM quality_tests q JOIN milk_collections c ON c.collection_id = q.collection_id WHERE c.collected_by = ? ORDER BY q.tested_at DESC"
    : role === "FARMER"
      ? "SELECT q.* FROM quality_tests q JOIN milk_collections c ON c.collection_id = q.collection_id WHERE c.farmer_id = (SELECT farmer_id FROM farmers WHERE user_id = ?) ORDER BY q.tested_at DESC"
      : "SELECT * FROM quality_tests ORDER BY tested_at DESC";
  const qualityParams = role === "MILK_COLLECTOR" ? [user.uid] : role === "FARMER" ? [user.uid] : [];
  const batchSelect = "SELECT b.*, GROUP_CONCAT(bc.collection_id ORDER BY bc.collection_id SEPARATOR ',') AS collection_ids FROM milk_batches b LEFT JOIN milk_batch_collections bc ON bc.batch_id = b.batch_id";
  const [farmerRows, animalRows, collectionRows, vetRows, qualityRows, batchRows, paymentRows, settingRows, requestRows, mccRows, breedRows] = await Promise.all([
    mysqlPool.execute(farmerQuery, farmerParams),
    mysqlPool.execute(animalQuery, role === "FARMER" ? [user.uid] : role === "MILK_COLLECTOR" ? [user.uid, user.uid] : []),
    mysqlPool.execute(collectionQuery, collectionParams),
    mysqlPool.execute(vetQuery, vetParams),
    mysqlPool.execute(qualityQuery, qualityParams),
    role === "FARMER"
      ? mysqlPool.execute(`${batchSelect} WHERE 1 = 0 GROUP BY b.id`)
      : role === "MILK_COLLECTOR"
        ? mysqlPool.execute(`${batchSelect} WHERE b.created_by = ? GROUP BY b.id ORDER BY b.batch_date DESC, b.id DESC LIMIT 200`, [user.uid])
      : mysqlPool.execute(`${batchSelect} GROUP BY b.id ORDER BY b.batch_date DESC, b.id DESC LIMIT 200`),
    role === "FARMER"
      ? mysqlPool.execute("SELECT * FROM farmer_payments WHERE farmer_id = (SELECT farmer_id FROM farmers WHERE user_id = ?) ORDER BY created_at DESC", [user.uid])
      : mysqlPool.execute("SELECT * FROM farmer_payments ORDER BY created_at DESC, id DESC LIMIT 200"),
    mysqlPool.execute("SELECT key_name, value_text FROM settings WHERE key_name IN ('milkPrice', 'mccSharePercent', 'collectorSharePercent')"),
    role === "FARMER"
      ? mysqlPool.execute("SELECT r.*, u.full_name AS collector_name, m.name AS mcc_name FROM milk_collection_requests r JOIN users u ON u.uid = r.collector_id LEFT JOIN mccs m ON JSON_CONTAINS(u.mcc_ids, JSON_QUOTE(m.mcc_id)) WHERE r.farmer_id = (SELECT farmer_id FROM farmers WHERE user_id = ?) ORDER BY r.requested_at DESC", [user.uid])
      : role === "MILK_COLLECTOR"
        ? mysqlPool.execute("SELECT r.*, u.full_name AS collector_name, m.name AS mcc_name FROM milk_collection_requests r JOIN users u ON u.uid = r.collector_id LEFT JOIN mccs m ON JSON_CONTAINS(u.mcc_ids, JSON_QUOTE(m.mcc_id)) WHERE r.collector_id = ? ORDER BY r.requested_at DESC", [user.uid])
        : mysqlPool.execute("SELECT r.*, u.full_name AS collector_name, m.name AS mcc_name FROM milk_collection_requests r JOIN users u ON u.uid = r.collector_id LEFT JOIN mccs m ON JSON_CONTAINS(u.mcc_ids, JSON_QUOTE(m.mcc_id)) ORDER BY r.requested_at DESC LIMIT 200"),
    mysqlPool.execute("SELECT * FROM mccs WHERE status = 'ACTIVE' ORDER BY name"),
    mysqlPool.execute("SELECT id, breed_name FROM breed_types WHERE status = 'ACTIVE' ORDER BY breed_name"),
  ]);
  const farmers = (farmerRows[0] as any[]).map(toFarmer);
  const animals = (animalRows[0] as any[]).map(toAnimal);
  const collections = (collectionRows[0] as any[]).map(toCollection);
  const veterinaryRecords = (vetRows[0] as any[]).map(toVeterinaryRecord);
  const qualityTests = (qualityRows[0] as any[]).map(toQualityTest);
  const batches = (batchRows[0] as any[]).map(toBatch);
  const payments = (paymentRows[0] as any[]).map(toPayment);
  const settings = Object.fromEntries((settingRows[0] as any[]).map((row) => [row.key_name, row.value_text]));
  const milkPrice = Number(settings.milkPrice ?? 620);
  return {
    farmers,
    animals,
    collections,
    veterinaryRecords,
    qualityTests,
    batches,
    payments,
    milkPrice,
    mccSharePercent: Number(settings.mccSharePercent ?? 10),
    collectorSharePercent: Number(settings.collectorSharePercent ?? 5),
    collectionRequests: (requestRows[0] as any[]).map((row) => ({ requestId: String(row.request_id), farmerId: String(row.farmer_id), collectorId: String(row.collector_id), status: row.status, requestedAt: String(row.requested_at), respondedAt: row.responded_at ? String(row.responded_at) : undefined, collectorName: row.collector_name ? String(row.collector_name) : undefined, mccName: row.mcc_name ? String(row.mcc_name) : undefined })),
    cowRegistrationAuthorizations: await listCowRegistrationAuthorizations(user),
    mccs: (mccRows[0] as any[]).map((row) => ({ mccId: String(row.mcc_id), mccCode: String(row.mcc_code), name: String(row.name), description: String(row.description ?? ""), district: String(row.district ?? ""), sector: String(row.sector ?? ""), cell: String(row.cell ?? ""), village: String(row.village ?? ""), phone: String(row.phone ?? ""), email: String(row.email ?? ""), managerUserId: row.manager_user_id ? String(row.manager_user_id) : undefined, status: row.status, createdAt: String(row.created_at), updatedAt: row.updated_at ? String(row.updated_at) : undefined })),
    breedTypes: (breedRows[0] as any[]).map((row) => ({ id: Number(row.id), name: String(row.breed_name) })),
    summary: {
      farmers: farmers.length,
      animals: animals.length,
      collectionsToday: collections.filter((item) => item.collectionDate.slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
      litresToday: collections.filter((item) => item.acceptanceStatus === "ACCEPTED").reduce((total, item) => total + item.litres, 0),
      pendingQualityTests: qualityTests.filter((item) => item.result === "PENDING").length,
      openBatches: batches.filter((item) => item.status === "OPEN").length,
      pendingPayments: payments.filter((item) => item.status === "PENDING").length,
    },
  };
}

export async function createFarmer(input: Omit<Farmer, "createdAt">): Promise<void> {
  if (!input.username || !input.email || !input.fullName || !input.phone || !input.nationalId || !input.mccId) {
    throw new Error("Farmer name, username, email, phone, national ID, and MCC ID are required.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    throw new Error("Enter a valid farmer email address.");
  }
  const username = input.username;
  const password = DEFAULT_INITIAL_PASSWORD;
  const email = input.email;
  const connection = await mysqlPool.getConnection();
  try {
    await connection.beginTransaction();
    const userId = input.userId ?? `farmer-${Date.now()}`;
    const [duplicates] = await connection.execute(
      `SELECT u.uid FROM users u LEFT JOIN farmers f ON f.user_id = u.uid
       WHERE u.username = ? OR u.email = ? OR f.phone = ? OR f.national_id = ? LIMIT 1`,
      [username, email, input.phone, input.nationalId],
    );
    if ((duplicates as any[]).length) throw new Error("This farmer is already registered. Check the username, email, phone, or national ID.");
    await connection.execute(
      `INSERT INTO users (uid, username, full_name, email, password, role, mcc_ids, status, must_change_password)
       VALUES (?, ?, ?, ?, ?, 'FARMER', JSON_ARRAY(?), 'ACTIVE', 1)`,
      [userId, username, input.fullName, email, password, input.mccId],
    );
    await connection.execute(
      `INSERT INTO farmers (farmer_id, user_id, registered_by, full_name, national_id, phone, email, district, sector, cell, village, mcc_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [input.farmerId, userId, input.registeredBy ?? null, input.fullName, input.nationalId ?? null, input.phone, email, input.district ?? null, input.sector ?? null, input.cell ?? null, input.village ?? null, input.mccId, input.status],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

}

export async function listActiveCollectors(): Promise<Array<{ uid: string; fullName: string }>> {
    const [rows] = await mysqlPool.execute("SELECT uid, full_name FROM users WHERE role = 'MILK_COLLECTOR' AND status = 'ACTIVE' ORDER BY full_name");
    return (rows as any[]).map((row) => ({ uid: String(row.uid), fullName: String(row.full_name) }));
}

export async function createCollectionRequest(farmerId: string, collectorId: string): Promise<void> {
    if (!farmerId || !collectorId) throw new Error("Select a milk collector.");
    await mysqlPool.execute(
      `INSERT INTO milk_collection_requests (request_id, farmer_id, collector_id, status)
       VALUES (?, ?, ?, 'PENDING')`,
      [`REQ-COL-${Date.now()}`, farmerId, collectorId],
    );
}

export async function decideCollectionRequest(requestId: string, collectorId: string, status: "ACCEPTED" | "REJECTED"): Promise<void> {
    const [result] = await mysqlPool.execute(
      "UPDATE milk_collection_requests SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE request_id = ? AND collector_id = ? AND status = 'PENDING'",
      [status, requestId, collectorId],
    );
    if ((result as { affectedRows?: number }).affectedRows !== 1) throw new Error("Collection request is no longer pending.");
}

export async function cancelCollectionRequest(requestId: string, farmerId: string): Promise<void> {
  const [result] = await mysqlPool.execute(
    "DELETE FROM milk_collection_requests WHERE request_id = ? AND farmer_id = ? AND status = 'PENDING'",
    [requestId, farmerId],
  );
  if ((result as { affectedRows?: number }).affectedRows !== 1) throw new Error("Only pending requests can be cancelled.");
}

export async function listCollectors(): Promise<Array<{ uid: string; fullName: string }>> {
  const [rows] = await mysqlPool.execute("SELECT uid, full_name FROM users WHERE role = 'MILK_COLLECTOR' AND status = 'ACTIVE' ORDER BY full_name");
  return (rows as any[]).map((row) => ({ uid: String(row.uid), fullName: String(row.full_name) }));
}

export async function verifyFarmerForCollector(farmerId: string, collectorId: string): Promise<Farmer | null> {
  const [rows] = await mysqlPool.execute("SELECT * FROM farmers WHERE farmer_id = ? AND registered_by = ? LIMIT 1", [farmerId, collectorId]);
  const row = (rows as any[])[0];
  return row ? toFarmer(row) : null;
}

export async function createAnimal(input: Omit<Animal, "createdAt">): Promise<void> {
  if (!input.farmerId || !input.tagNumber || !input.breed || !input.sex || !input.status) {
    throw new Error("Farmer ID, cow tag number, breed, sex, and status are required.");
  }

  await mysqlPool.execute(
    `INSERT INTO animals (animal_id, farmer_id, tag_number, breed, sex, date_of_birth, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [input.animalId, input.farmerId, input.tagNumber, input.breed ?? null, input.sex, input.dateOfBirth ?? null, input.status],
  );
}

export async function updateFarmerForCollector(input: Pick<Farmer, "farmerId" | "fullName" | "phone" | "email" | "nationalId">, collectorId: string, allFarmers = false): Promise<void> {
  await mysqlPool.execute(
    `UPDATE farmers f LEFT JOIN users u ON u.uid = f.user_id
     SET f.full_name = ?, f.phone = ?, f.email = ?, f.national_id = ?, u.full_name = ?, u.email = ?
     WHERE f.farmer_id = ? ${allFarmers ? "" : "AND f.registered_by = ?"}`,
    [input.fullName, input.phone, input.email ?? null, input.nationalId ?? null, input.fullName, input.email ?? null, input.farmerId, ...(allFarmers ? [] : [collectorId])],
  );
}

export async function deleteFarmerForCollector(farmerId: string, collectorId: string, allFarmers = false): Promise<void> {
  const connection = await mysqlPool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(`SELECT user_id FROM farmers WHERE farmer_id = ? ${allFarmers ? "" : "AND registered_by = ?"}`, [farmerId, ...(allFarmers ? [] : [collectorId])]);
    const userId = (rows as any[])[0]?.user_id;
    if (!(rows as any[])[0]) throw new Error("Farmer was not found in your records.");
    await connection.execute("DELETE FROM animals WHERE farmer_id = ?", [farmerId]);
    await connection.execute(`DELETE FROM farmers WHERE farmer_id = ? ${allFarmers ? "" : "AND registered_by = ?"}`, [farmerId, ...(allFarmers ? [] : [collectorId])]);
    if (userId) await connection.execute("DELETE FROM users WHERE uid = ? AND role = 'FARMER'", [userId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateAnimalForCollector(input: Pick<Animal, "animalId" | "tagNumber" | "breed" | "sex">, collectorId: string, allFarmers = false): Promise<void> {
  await mysqlPool.execute(`UPDATE animals a JOIN farmers f ON f.farmer_id = a.farmer_id SET a.tag_number = ?, a.breed = ?, a.sex = ? WHERE a.animal_id = ? ${allFarmers ? "" : "AND f.registered_by = ?"}`, [input.tagNumber, input.breed ?? null, input.sex, input.animalId, ...(allFarmers ? [] : [collectorId])]);
}

export async function deleteAnimalForCollector(animalId: string, collectorId: string, allFarmers = false): Promise<void> {
  await mysqlPool.execute(`DELETE a FROM animals a JOIN farmers f ON f.farmer_id = a.farmer_id WHERE a.animal_id = ? ${allFarmers ? "" : "AND f.registered_by = ?"}`, [animalId, ...(allFarmers ? [] : [collectorId])]);
}

export async function createCollection(input: MilkCollection): Promise<void> {
  if (!input.collectionId || !input.farmerId || !input.mccId || !input.collectionDate || input.litres <= 0 || input.fatPercentage === undefined || input.temperatureC === undefined || !input.acceptanceStatus || !input.collectedBy) {
    throw new Error("Farmer, MCC, collection date, litres, fat percentage, temperature, status, and collector are required.");
  }
  if (input.animalId) {
    const [rows] = await mysqlPool.execute<RowDataPacket[]>(
      "SELECT 1 FROM veterinary_records WHERE animal_id = ? AND COALESCE(clearance_status, 'ACTIVE') <> 'CLEARED' AND (withdrawal_until IS NULL OR withdrawal_until > CURDATE()) LIMIT 1",
      [input.animalId],
    );
    if (rows.length) throw new Error("Milk cannot be collected from a cow under treatment or milk withdrawal.");
  }
  await mysqlPool.execute(
    `INSERT INTO milk_collections (collection_id, farmer_id, animal_id, mcc_id, collection_date, litres, fat_percentage, temperature_c, acceptance_status, collector_acceptance_status, mcc_acceptance_status, notes, collected_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [input.collectionId, input.farmerId, input.animalId ?? null, input.mccId, input.collectionDate, input.litres, input.fatPercentage ?? null, input.temperatureC ?? null, "PENDING", input.collectorAcceptanceStatus, "PENDING", input.notes ?? null, input.collectedBy],
  );
}

export async function createVeterinaryRecord(input: VeterinaryRecord): Promise<void> {
  if (!input.recordId || !input.animalId || !input.visitDate || !input.diagnosis || !input.treatment || !input.medicine || !input.withdrawalUntil || !input.veterinarianId) {
    throw new Error("Cow, visit date, diagnosis, treatment, medicine, recovery date, and veterinarian are required.");
  }
  if (input.withdrawalUntil < input.visitDate) {
    throw new Error("Recovery or milk-clearance date cannot be before the visit date.");
  }
  await mysqlPool.execute(
    `INSERT INTO veterinary_records (record_id, animal_id, visit_date, diagnosis, treatment, medicine, withdrawal_until, veterinarian_id, notes, clearance_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
    [input.recordId, input.animalId, input.visitDate, input.diagnosis, input.treatment ?? null, input.medicine ?? null, input.withdrawalUntil ?? null, input.veterinarianId, input.notes ?? null],
  );
}

export async function updateVeterinaryRecordDates(recordId: string, visitDate: string, withdrawalUntil: string): Promise<void> {
  if (!recordId || !visitDate || !withdrawalUntil) {
    throw new Error("Visit date and recovery or milk-clearance date are required.");
  }
  if (withdrawalUntil < visitDate) {
    throw new Error("Recovery or milk-clearance date cannot be before the visit date.");
  }
  const [result] = await mysqlPool.execute(
    "UPDATE veterinary_records SET visit_date = ?, withdrawal_until = ? WHERE record_id = ?",
    [visitDate, withdrawalUntil, recordId],
  );
  if ((result as { affectedRows?: number }).affectedRows !== 1) {
    throw new Error("Veterinary record was not found.");
  }
}

export async function clearVeterinaryRecord(recordId: string): Promise<void> {
  if (!recordId) throw new Error("Veterinary record is required.");
  const [result] = await mysqlPool.execute(
    "UPDATE veterinary_records SET clearance_status = 'CLEARED', withdrawal_until = '1000-01-01' WHERE record_id = ?",
    [recordId],
  );
  if ((result as { affectedRows?: number }).affectedRows !== 1) {
    throw new Error("Veterinary record was not found.");
  }
}

export async function createQualityTest(input: QualityTest): Promise<void> {
  if (!input.collectionId) throw new Error("A collection must be selected for this quality test.");
  const connection = await mysqlPool.getConnection();
  try {
    await connection.beginTransaction();
    const [restricted] = await connection.execute<RowDataPacket[]>(
      `SELECT 1
       FROM milk_collections c
       JOIN veterinary_records v ON v.animal_id = c.animal_id
       WHERE c.collection_id = ?
         AND COALESCE(v.clearance_status, 'ACTIVE') <> 'CLEARED'
         AND (v.withdrawal_until IS NULL OR v.withdrawal_until > CURDATE())
       LIMIT 1`,
      [input.collectionId],
    );
    if (restricted.length) throw new Error("Milk from a cow under treatment cannot be accepted.");
    await connection.execute(
      `INSERT INTO quality_tests (test_id, collection_id, acidity, density, adulteration_detected, result, tested_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [input.testId, input.collectionId, input.acidity ?? null, input.density ?? null, input.adulterationDetected, input.result, input.testedBy],
    );
    await connection.execute(
      "UPDATE milk_collections SET acceptance_status = ?, mcc_acceptance_status = ?, mcc_comment = ? WHERE collection_id = ?",
      [input.result === "PASS" ? "ACCEPTED" : input.result === "FAIL" ? "REJECTED" : "PENDING", input.result === "PASS" ? "ACCEPTED" : input.result === "FAIL" ? "REJECTED" : "PENDING", input.comment ?? null, input.collectionId],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

}

export async function createBatchQualityTest(input: QualityTest & { batchId: string }): Promise<void> {
    const result = input.result === "PASS" ? "ACCEPTED" : input.result === "FAIL" ? "REJECTED" : "PENDING";
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();
      const [collections] = await connection.execute<RowDataPacket[]>(
        "SELECT c.collection_id FROM milk_collections c JOIN milk_batch_collections bc ON bc.collection_id = c.collection_id WHERE bc.batch_id = ?",
        [input.batchId],
      );
      if (!collections.length) throw new Error("This batch has no linked milk collections.");
      const [batchRows] = await connection.execute<RowDataPacket[]>(
        "SELECT status FROM milk_batches WHERE batch_id = ? LIMIT 1",
        [input.batchId],
      );
      if (!batchRows.length) throw new Error("This batch was not found.");
      if (batchRows[0].status !== "OPEN") throw new Error("This batch has already received an MCC decision.");
      for (const collection of collections) {
        const [restricted] = await connection.execute<RowDataPacket[]>(
          `SELECT 1
           FROM milk_collections c
           JOIN veterinary_records v ON v.animal_id = c.animal_id
           WHERE c.collection_id = ?
             AND COALESCE(v.clearance_status, 'ACTIVE') <> 'CLEARED'
             AND (v.withdrawal_until IS NULL OR v.withdrawal_until > CURDATE())
           LIMIT 1`,
          [collection.collection_id],
        );
        if (restricted.length) throw new Error("A batch contains milk from a cow under treatment and cannot be accepted.");
        const [existingTests] = await connection.execute<RowDataPacket[]>(
          "SELECT test_id FROM quality_tests WHERE collection_id = ? ORDER BY tested_at DESC LIMIT 1",
          [collection.collection_id],
        );
        if (existingTests.length) {
          await connection.execute(
            "UPDATE quality_tests SET acidity = ?, density = ?, adulteration_detected = ?, result = ?, tested_by = ? WHERE test_id = ?",
            [input.acidity ?? null, input.density ?? null, input.adulterationDetected, input.result, input.testedBy, existingTests[0].test_id],
          );
        } else {
          await connection.execute(
            `INSERT INTO quality_tests (test_id, collection_id, acidity, density, adulteration_detected, result, tested_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [`${input.testId}-${String(collection.collection_id)}`, collection.collection_id, input.acidity ?? null, input.density ?? null, input.adulterationDetected, input.result, input.testedBy],
          );
        }
        await connection.execute(
          "UPDATE milk_collections SET acceptance_status = ?, mcc_acceptance_status = ?, mcc_comment = ? WHERE collection_id = ?",
          [result, result, input.comment ?? null, collection.collection_id],
        );
      }
      await connection.execute("UPDATE milk_batches SET status = ? WHERE batch_id = ?", [result, input.batchId]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
}

export async function createBatch(input: MilkBatch): Promise<void> {
  const connection = await mysqlPool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO milk_batches (batch_id, mcc_id, batch_date, total_litres, destination, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [input.batchId, input.mccId, input.batchDate, input.totalLitres, input.destination ?? null, input.status, input.createdBy],
    );
    for (const collectionId of input.collectionIds ?? []) {
      await connection.execute("INSERT INTO milk_batch_collections (batch_id, collection_id) VALUES (?, ?)", [input.batchId, collectionId]);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteBatch(batchId: string, user: AppUser): Promise<void> {
  const connection = await mysqlPool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT batch_id, created_by FROM milk_batches WHERE batch_id = ? LIMIT 1",
      [batchId],
    );
    const batch = rows[0];
    if (!batch) throw new Error("Batch was not found.");
    if (user.role === "MILK_COLLECTOR" && String(batch.created_by) !== user.uid) {
      throw new Error("You can only delete batches created by your account.");
    }
    if (user.role === "MILK_COLLECTOR" && ["ACCEPTED", "REJECTED"].includes(String(batch.status))) {
      throw new Error("MCC-approved batches cannot be deleted or modified.");
    }

    await connection.execute("DELETE FROM milk_batch_collections WHERE batch_id = ?", [batchId]);
    await connection.execute("DELETE FROM milk_batches WHERE batch_id = ?", [batchId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateRejectedBatchComment(batchId: string, comment: string): Promise<void> {
  const trimmedComment = comment.trim();
  if (!trimmedComment) throw new Error("A comment is required.");
  const connection = await mysqlPool.getConnection();
  try {
    await connection.beginTransaction();
    const [batches] = await connection.execute<RowDataPacket[]>(
      "SELECT status FROM milk_batches WHERE batch_id = ? LIMIT 1",
      [batchId],
    );
    if (!batches[0]) throw new Error("Batch was not found.");
    if (batches[0].status !== "REJECTED") throw new Error("Only rejected batches can receive a follow-up comment.");
    const [result] = await connection.execute<RowDataPacket[]>(
      "SELECT collection_id FROM milk_batch_collections WHERE batch_id = ?",
      [batchId],
    );
    if (!result.length) throw new Error("This batch has no linked milk collections.");
    await connection.execute(
      "UPDATE milk_collections SET mcc_comment = ? WHERE collection_id IN (SELECT collection_id FROM milk_batch_collections WHERE batch_id = ?)",
      [trimmedComment, batchId],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function createPayment(input: FarmerPayment): Promise<void> {
  await mysqlPool.execute(
    `INSERT INTO farmer_payments (payment_id, farmer_id, period_start, period_end, litres, rate_per_litre, amount, status, processed_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [input.paymentId, input.farmerId, input.periodStart, input.periodEnd, input.litres, input.ratePerLitre, input.amount, input.status, input.processedBy],
  );
}

export async function updatePaymentShares(mccSharePercent: number, collectorSharePercent: number): Promise<void> {
  if (!Number.isFinite(mccSharePercent) || !Number.isFinite(collectorSharePercent) || mccSharePercent < 0 || collectorSharePercent < 0 || mccSharePercent + collectorSharePercent > 100) {
    throw new Error("Payment shares must be non-negative and total no more than 100%.");
  }

  await mysqlPool.execute(
    "INSERT INTO settings (key_name, value_text) VALUES (?, ?), (?, ?) ON DUPLICATE KEY UPDATE value_text = VALUES(value_text)",
    ["mccSharePercent", String(mccSharePercent), "collectorSharePercent", String(collectorSharePercent)],
  );
}

export async function listAccountingRecords(): Promise<{ expenseTypes: string[]; expenses: Array<{ expenseId: string; expenseDate: string; expenseName: string; expenseType: string; amount: number }> }> {
    const [typeRows] = await mysqlPool.execute("SELECT type_name FROM expense_types ORDER BY type_name");
    const [expenseRows] = await mysqlPool.execute("SELECT expense_id, expense_date, expense_name, expense_type, amount FROM expenses ORDER BY expense_date DESC, id DESC");
    return {
      expenseTypes: (typeRows as any[]).map((row) => String(row.type_name)),
      expenses: (expenseRows as any[]).map((row) => ({ expenseId: String(row.expense_id), expenseDate: String(row.expense_date).slice(0, 10), expenseName: String(row.expense_name), expenseType: String(row.expense_type), amount: Number(row.amount) })),
    };
  }

export async function createExpenseType(typeName: string, createdBy: string): Promise<void> {
    if (!typeName.trim()) throw new Error("Expense type is required.");
    await mysqlPool.execute("INSERT INTO expense_types (type_name, created_by) VALUES (?, ?)", [typeName.trim(), createdBy]);
  }

export async function createExpense(input: { expenseId: string; expenseDate: string; expenseName: string; expenseType: string; amount: number; recordedBy: string }): Promise<void> {
    if (!input.expenseDate || !input.expenseName.trim() || !input.expenseType.trim() || !Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Date, expense name, type, and a positive amount are required.");
    await mysqlPool.execute("INSERT INTO expenses (expense_id, expense_date, expense_name, expense_type, amount, recorded_by) VALUES (?, ?, ?, ?, ?, ?)", [input.expenseId, input.expenseDate, input.expenseName.trim(), input.expenseType.trim(), input.amount, input.recordedBy]);
  }

  export async function listAdministrationRequests(): Promise<Array<{ requestId: string; requestedBy: string; requestType: string; details: string; status: string; createdAt: string }>> {
    const [rows] = await mysqlPool.execute("SELECT request_id, requested_by, request_type, details, status, created_at FROM administration_requests ORDER BY created_at DESC, id DESC");
    return (rows as any[]).map((row) => ({ requestId: String(row.request_id), requestedBy: String(row.requested_by), requestType: String(row.request_type), details: String(row.details), status: String(row.status), createdAt: String(row.created_at) }));
  }

  export async function createAdministrationRequest(input: { requestId: string; requestedBy: string; requestType: string; details: string }): Promise<void> {
    if (!["MISSION", "PERMISSION", "MATERIAL", "COMPUTER"].includes(input.requestType) || !input.details.trim()) throw new Error("Select a request type and provide details.");
    await mysqlPool.execute("INSERT INTO administration_requests (request_id, requested_by, request_type, details) VALUES (?, ?, ?, ?)", [input.requestId, input.requestedBy, input.requestType, input.details.trim()]);
  }

  export async function decideAdministrationRequest(requestId: string, status: "APPROVED" | "REJECTED", approvedBy: string): Promise<void> {
    await mysqlPool.execute("UPDATE administration_requests SET status = ?, approved_by = ?, approved_at = NOW() WHERE request_id = ? AND status = 'PENDING'", [status, approvedBy, requestId]);
  }

export async function getPhase2Summary(): Promise<Phase2Summary> {
  const [rows] = await mysqlPool.query(`
    SELECT
      (SELECT COUNT(*) FROM farmers WHERE status = 'ACTIVE') AS farmers,
      (SELECT COUNT(*) FROM animals WHERE status = 'ACTIVE') AS animals,
      (SELECT COUNT(*) FROM milk_collections WHERE DATE(collection_date) = CURDATE()) AS collectionsToday,
      (SELECT COALESCE(SUM(litres), 0) FROM milk_collections WHERE DATE(collection_date) = CURDATE() AND acceptance_status = 'ACCEPTED') AS litresToday,
      (SELECT COUNT(*) FROM quality_tests WHERE result = 'PENDING') AS pendingQualityTests,
      (SELECT COUNT(*) FROM milk_batches WHERE status = 'OPEN') AS openBatches,
      (SELECT COUNT(*) FROM farmer_payments WHERE status = 'PENDING') AS pendingPayments
  `);
  const row = (rows as any[])[0] ?? {};
  return {
    farmers: Number(row.farmers ?? 0),
    animals: Number(row.animals ?? 0),
    collectionsToday: Number(row.collectionsToday ?? 0),
    litresToday: Number(row.litresToday ?? 0),
    pendingQualityTests: Number(row.pendingQualityTests ?? 0),
    openBatches: Number(row.openBatches ?? 0),
    pendingPayments: Number(row.pendingPayments ?? 0),
  };
}
