import { get, ref, remove, set, update } from "firebase/database";
import { createHash, randomInt } from "node:crypto";
import { db } from "@/lib/firebase/config";
import {
  DEFAULT_INITIAL_PASSWORD,
  defaultState,
  type AppState,
  type AppUser,
  type AuditEntry,
  type MccCenter,
  type UserRole,
} from "@/lib/app-data";
import type {
  Animal,
  BreedType,
  CollectionRequest,
  CollectorBatchAssignment,
  CowRegistrationAuthorization,
  CowRegistrationSession,
  Farmer,
  FarmerPayment,
  MilkBatch,
  MilkCollection,
  Phase2Summary,
  QualityTest,
  VeterinaryRecord,
} from "@/lib/phase2-data";

type AnyRecord = Record<string, any>;

function database() {
  if (!db) throw new Error("Firebase Realtime Database is not configured.");
  return db;
}

function safeKey(key: string): string {
  if (!key || /[.#$\[\]/]/.test(key)) throw new Error("Invalid Firebase record key.");
  return key;
}

async function readTable<T extends AnyRecord>(table: string): Promise<T[]> {
  const snapshot = await get(ref(database(), table));
  const value = snapshot.val() as Record<string, T> | null;
  return value ? Object.entries(value).map(([key, row]) => ({ ...row, _key: key })) : [];
}

async function readRecord<T extends AnyRecord>(table: string, id: string): Promise<T | null> {
  const snapshot = await get(ref(database(), `${table}/${safeKey(id)}`));
  return snapshot.exists() ? (snapshot.val() as T) : null;
}

async function writeRecord(table: string, id: string, value: AnyRecord): Promise<void> {
  await set(ref(database(), `${table}/${safeKey(id)}`), value);
}

async function patchRecord(table: string, id: string, value: AnyRecord): Promise<void> {
  await update(ref(database(), `${table}/${safeKey(id)}`), value);
}

async function deleteRecord(table: string, id: string): Promise<void> {
  await remove(ref(database(), `${table}/${safeKey(id)}`));
}

function now(): string {
  return new Date().toISOString();
}

function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

function nameInitials(fullName: string): string {
  return fullName.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 3).toUpperCase() || "COL";
}

function byNewest<T extends AnyRecord>(rows: T[], field: string): T[] {
  return rows.sort((a, b) => String(b[field] ?? "").localeCompare(String(a[field] ?? "")));
}

function asUser(row: AnyRecord): AppUser {
  const { _key: _ignoredKey, ...user } = row;
  return { ...user, uid: String(row.uid), username: row.username ?? row.email, mccIds: Array.isArray(row.mccIds) ? row.mccIds : [] } as AppUser;
}

function asFarmer(row: AnyRecord): Farmer {
  return { ...row, farmerId: String(row.farmerId), fullName: String(row.fullName), phone: String(row.phone), mccId: String(row.mccId) } as Farmer;
}

function asAnimal(row: AnyRecord): Animal {
  return { ...row, animalId: String(row.animalId), farmerId: String(row.farmerId), tagNumber: String(row.tagNumber) } as Animal;
}

function asCollection(row: AnyRecord): MilkCollection {
  return { ...row, collectionId: String(row.collectionId), farmerId: String(row.farmerId), mccId: String(row.mccId), collectionDate: String(row.collectionDate) } as MilkCollection;
}

function asVeterinary(row: AnyRecord): VeterinaryRecord {
  return { ...row, recordId: String(row.recordId), animalId: String(row.animalId), veterinarianId: String(row.veterinarianId) } as VeterinaryRecord;
}

function asQuality(row: AnyRecord): QualityTest {
  return { ...row, testId: String(row.testId), collectionId: row.collectionId ? String(row.collectionId) : undefined } as QualityTest;
}

function asBatch(row: AnyRecord): MilkBatch {
  return { ...row, batchId: String(row.batchId), mccId: String(row.mccId), collectionIds: Array.isArray(row.collectionIds) ? row.collectionIds : [] } as MilkBatch;
}

function asPayment(row: AnyRecord): FarmerPayment {
  return { ...row, paymentId: String(row.paymentId), farmerId: String(row.farmerId) } as FarmerPayment;
}

export async function readDatabaseState(): Promise<AppState> {
  const storedUsers = await readTable<AnyRecord>("users");
  const missingDemoUsers = defaultState.users.filter(
    (demoUser) => !storedUsers.some((storedUser) => String(storedUser.uid ?? storedUser._key) === demoUser.uid),
  );
  if (missingDemoUsers.length) {
    await Promise.all(missingDemoUsers.map((user) => writeRecord("users", user.uid, user)));
  }
  const users = [...storedUsers, ...missingDemoUsers].map(asUser);
  const mccs = (await readTable<AnyRecord>("mccs")) as MccCenter[];
  const auditLogs = (await readTable<AnyRecord>("audit_logs")) as AuditEntry[];
  const settings = (await readRecord<AnyRecord>("settings", "values")) ?? defaultState.settings;
  if (!users.length && !mccs.length && !auditLogs.length) {
    await saveDatabaseState(defaultState);
    return defaultState;
  }
  return {
    users,
    mccs,
    auditLogs,
    settings: {
      projectName: String(settings.projectName ?? defaultState.settings.projectName),
      milkPrice: Number(settings.milkPrice ?? 620),
      mccSharePercent: Number(settings.mccSharePercent ?? 10),
      collectorSharePercent: Number(settings.collectorSharePercent ?? 5),
      timezone: String(settings.timezone ?? "UTC"),
      notificationEmail: String(settings.notificationEmail ?? ""),
    },
  };
}

export async function saveDatabaseState(state: AppState): Promise<void> {
  const writes: Promise<void>[] = [
    set(ref(database(), "users"), Object.fromEntries(state.users.map((user) => [safeKey(user.uid), user]))),
    set(ref(database(), "mccs"), Object.fromEntries(state.mccs.map((mcc) => [safeKey(mcc.mccId), mcc]))),
    set(ref(database(), "audit_logs"), Object.fromEntries(state.auditLogs.map((audit) => [safeKey(audit.auditId), audit]))),
    writeRecord("settings", "values", state.settings),
  ];
  await Promise.all(writes);
}

export async function loginUser(email: string, password: string): Promise<AppUser | null> {
  const identifier = email.trim().toLowerCase();
  const users = await readTable<AnyRecord>("users");
  const row = users.find((user) => user.status === "ACTIVE" && (String(user.email).toLowerCase() === identifier || String(user.username).toLowerCase() === identifier) && user.password === password);
  return row ? asUser(row) : null;
}

export async function getUserByUid(uid: string): Promise<AppUser | null> {
  const row = await readRecord<AnyRecord>("users", uid);
  return row ? asUser({ ...row, uid }) : null;
}

export async function changeUserPassword(uid: string, currentPassword: string, newPassword: string): Promise<void> {
  if (!uid || !currentPassword || newPassword.length < 8) throw new Error("A new password of at least 8 characters is required.");
  const user = await getUserByUid(uid);
  if (!user || user.password !== currentPassword) throw new Error("The current password is incorrect.");
  await patchRecord("users", uid, { password: newPassword, mustChangePassword: false });
}

export async function updateUserByAdmin(input: Pick<AppUser, "uid" | "fullName" | "email" | "role" | "status"> & { password?: string }): Promise<void> {
  const user = await getUserByUid(input.uid);
  if (!user) throw new Error("User was not found.");
  await patchRecord("users", input.uid, { fullName: input.fullName, email: input.email, username: input.email, role: input.role, status: input.status, ...(input.password ? { password: input.password, mustChangePassword: true } : {}) });
}

export async function createUser(input: Pick<AppUser, "uid" | "fullName" | "email" | "password" | "role" | "mccIds" | "status"> & { collectorBatchCode?: string }): Promise<void> {
  if (await readRecord("users", input.uid)) throw new Error("This user already exists.");
  await writeRecord("users", input.uid, { ...input, username: input.email, mustChangePassword: true });
}

export async function createCollectorUser(input: { uid: string; fullName: string; email: string; password: string; mccIds: string[] }): Promise<string> {
  const collectors = (await readTable<AnyRecord>("users")).filter((user) => user.role === "MILK_COLLECTOR");
  const collectorBatchCode = `BATCH-${String(collectors.length + 1).padStart(2, "0")}-${nameInitials(input.fullName)}`;
  await createUser({ ...input, role: "MILK_COLLECTOR", status: "ACTIVE", collectorBatchCode });
  return collectorBatchCode;
}

export async function deleteUserByAdmin(uid: string): Promise<void> {
  await deleteRecord("users", uid);
}

export async function updateMccByAdmin(input: { mccId: string; name: string; district: string }): Promise<void> {
  if (!(await readRecord("mccs", input.mccId))) throw new Error("MCC was not found.");
  await patchRecord("mccs", input.mccId, { name: input.name.trim(), district: input.district.trim(), updatedAt: now() });
}

export async function listAuditLogsForAdmin(): Promise<AuditEntry[]> {
  return byNewest((await readTable<AnyRecord>("audit_logs")) as AuditEntry[], "timestamp");
}

export async function appendAuditEntryToDatabase(entry: Omit<AuditEntry, "auditId" | "timestamp">, userId = "system"): Promise<void> {
  const auditId = `audit-${Date.now()}-${randomInt(1000, 9999)}`;
  await writeRecord("audit_logs", auditId, { ...entry, auditId, userId, timestamp: now() });
}

export async function createFarmer(input: Omit<Farmer, "createdAt">): Promise<void> {
  if (!input.username || !input.email || !input.fullName || !input.phone || !input.nationalId || !input.mccId) throw new Error("Farmer name, username, email, phone, national ID, and MCC ID are required.");
  const farmers = await readTable<AnyRecord>("farmers");
  if (farmers.some((farmer) => farmer.phone === input.phone || farmer.nationalId === input.nationalId)) throw new Error("This farmer is already registered.");
  const userId = input.userId ?? `farmer-${Date.now()}`;
  await createUser({ uid: userId, fullName: input.fullName, email: input.email, password: DEFAULT_INITIAL_PASSWORD, role: "FARMER", mccIds: [input.mccId], status: "ACTIVE" });
  await writeRecord("farmers", input.farmerId, { ...input, userId, createdAt: now() });
}

export async function listFarmers(): Promise<Farmer[]> {
  return byNewest((await readTable<AnyRecord>("farmers")).map(asFarmer), "createdAt");
}

export async function createAnimal(input: Omit<Animal, "createdAt">): Promise<void> {
  if (!input.farmerId || !input.tagNumber || !input.breed || !input.sex || !input.status) throw new Error("Farmer ID, cow tag number, breed, sex, and status are required.");
  const animals = await readTable<AnyRecord>("animals");
  if (animals.some((animal) => String(animal.tagNumber).toLowerCase() === input.tagNumber.toLowerCase())) throw new Error("Cow tag already exists.");
  await writeRecord("animals", input.animalId, { ...input, createdAt: now() });
}

export async function listAnimals(): Promise<Animal[]> { return byNewest((await readTable<AnyRecord>("animals")).map(asAnimal), "createdAt"); }

export async function listCollections(): Promise<MilkCollection[]> { return byNewest((await readTable<AnyRecord>("milk_collections")).map(asCollection), "collectionDate").slice(0, 200); }
export async function listVeterinaryRecords(): Promise<VeterinaryRecord[]> { return byNewest((await readTable<AnyRecord>("veterinary_records")).map(asVeterinary), "visitDate").slice(0, 200); }
export async function listQualityTests(): Promise<QualityTest[]> { return byNewest((await readTable<AnyRecord>("quality_tests")).map(asQuality), "testedAt").slice(0, 200); }
export async function listBatches(): Promise<MilkBatch[]> { return byNewest((await readTable<AnyRecord>("milk_batches")).map(asBatch), "batchDate").slice(0, 200); }
export async function listPayments(): Promise<FarmerPayment[]> { return byNewest((await readTable<AnyRecord>("farmer_payments")).map(asPayment), "createdAt").slice(0, 200); }

export async function updateFarmerForCollector(input: Pick<Farmer, "farmerId" | "fullName" | "phone" | "email" | "nationalId">, collectorId: string, allFarmers = false): Promise<void> {
  const farmer = await readRecord<AnyRecord>("farmers", input.farmerId);
  if (!farmer || (!allFarmers && farmer.registeredBy !== collectorId)) throw new Error("Farmer was not found.");
  await patchRecord("farmers", input.farmerId, input);
  if (farmer.userId) await patchRecord("users", farmer.userId, { fullName: input.fullName, email: input.email });
}

export async function deleteFarmerForCollector(farmerId: string, collectorId: string, allFarmers = false): Promise<void> {
  const farmer = await readRecord<AnyRecord>("farmers", farmerId);
  if (!farmer || (!allFarmers && farmer.registeredBy !== collectorId)) throw new Error("Farmer was not found.");
  await deleteRecord("farmers", farmerId);
  if (farmer.userId) await deleteRecord("users", farmer.userId);
}

export async function updateAnimalForCollector(input: Pick<Animal, "animalId" | "tagNumber" | "breed" | "sex">, collectorId: string, allFarmers = false): Promise<void> {
  const animal = await readRecord<AnyRecord>("animals", input.animalId);
  const farmer = animal ? await readRecord<AnyRecord>("farmers", animal.farmerId) : null;
  if (!animal || !farmer || (!allFarmers && farmer.registeredBy !== collectorId)) throw new Error("Animal was not found.");
  await patchRecord("animals", input.animalId, input);
}

export async function deleteAnimalForCollector(animalId: string, collectorId: string, allFarmers = false): Promise<void> {
  const animal = await readRecord<AnyRecord>("animals", animalId);
  const farmer = animal ? await readRecord<AnyRecord>("farmers", animal.farmerId) : null;
  if (!animal || !farmer || (!allFarmers && farmer.registeredBy !== collectorId)) throw new Error("Animal was not found.");
  await deleteRecord("animals", animalId);
}

export async function listActiveCollectors(): Promise<Array<{ uid: string; fullName: string }>> {
  return (await readTable<AnyRecord>("users")).filter((user) => user.role === "MILK_COLLECTOR" && user.status === "ACTIVE").map((user) => ({ uid: String(user.uid ?? user._key), fullName: String(user.fullName) }));
}
export const listCollectors = listActiveCollectors;

export async function verifyFarmerForCollector(farmerId: string, collectorId: string): Promise<Farmer | null> {
  const farmer = await readRecord<AnyRecord>("farmers", farmerId);
  return farmer && farmer.registeredBy === collectorId ? asFarmer(farmer) : null;
}

export async function findCowOwnerByTag(tagNumber: string): Promise<{ animal: Animal; farmer: Farmer } | null> {
  const animal = (await readTable<AnyRecord>("animals")).find((item) => item.status === "ACTIVE" && String(item.tagNumber).toLowerCase() === tagNumber.trim().toLowerCase());
  const farmer = animal ? await readRecord<AnyRecord>("farmers", animal.farmerId) : null;
  return animal && farmer && farmer.status === "ACTIVE" ? { animal: asAnimal(animal), farmer: asFarmer(farmer) } : null;
}

export async function createCollection(input: MilkCollection): Promise<void> {
  if (!input.collectionId || !input.farmerId || !input.mccId || !input.collectionDate || input.litres <= 0 || input.fatPercentage === undefined || input.temperatureC === undefined || !input.collectedBy) throw new Error("Farmer, MCC, collection date, litres, fat percentage, temperature, status, and collector are required.");
  if (input.animalId) {
    const restricted = (await readTable<AnyRecord>("veterinary_records")).some((record) => record.animalId === input.animalId && record.clearanceStatus !== "CLEARED" && (!record.withdrawalUntil || record.withdrawalUntil > new Date().toISOString().slice(0, 10)));
    if (restricted) throw new Error("Milk cannot be collected from a cow under treatment or milk withdrawal.");
  }
  await writeRecord("milk_collections", input.collectionId, { ...input, acceptanceStatus: "PENDING", mccAcceptanceStatus: "PENDING" });
}

export async function createVeterinaryRecord(input: VeterinaryRecord): Promise<void> {
  if (!input.recordId || !input.animalId || !input.visitDate || !input.diagnosis || !input.treatment || !input.medicine || !input.withdrawalUntil || !input.veterinarianId) throw new Error("Cow, visit date, diagnosis, treatment, medicine, recovery date, and veterinarian are required.");
  if (input.withdrawalUntil < input.visitDate) throw new Error("Recovery or milk-clearance date cannot be before the visit date.");
  await writeRecord("veterinary_records", input.recordId, { ...input, clearanceStatus: "ACTIVE" });
}

export async function updateVeterinaryRecordDates(recordId: string, visitDate: string, withdrawalUntil: string): Promise<void> {
  if (!recordId || !visitDate || !withdrawalUntil || withdrawalUntil < visitDate) throw new Error("Visit date and recovery or milk-clearance date are required.");
  if (!(await readRecord("veterinary_records", recordId))) throw new Error("Veterinary record was not found.");
  await patchRecord("veterinary_records", recordId, { visitDate, withdrawalUntil });
}

export async function clearVeterinaryRecord(recordId: string): Promise<void> {
  if (!(await readRecord("veterinary_records", recordId))) throw new Error("Veterinary record was not found.");
  await patchRecord("veterinary_records", recordId, { clearanceStatus: "CLEARED", withdrawalUntil: "1000-01-01" });
}

export async function createQualityTest(input: QualityTest): Promise<void> {
  if (!input.collectionId || !input.organolepticResult || input.lactometerReading === undefined || !input.alcoholTestResult) throw new Error("Collection, organoleptic result, lactometer reading, and alcohol test result are required.");
  const result = input.organolepticResult === "FAIL" || input.alcoholTestResult === "FAIL" || input.adulterationDetected ? "FAIL" : input.result;
  await writeRecord("quality_tests", input.testId, { ...input, result });
  await patchRecord("milk_collections", input.collectionId, { acceptanceStatus: result === "PASS" ? "ACCEPTED" : "REJECTED", mccAcceptanceStatus: result === "PASS" ? "ACCEPTED" : "REJECTED", mccComment: input.comment });
}

export async function createBatchQualityTest(input: QualityTest & { batchId: string }): Promise<void> {
  if (!input.comment?.trim()) throw new Error("A comment is required for the selected batch decision.");
  await createQualityTest(input);
  await patchRecord("milk_batches", input.batchId, { status: input.result === "PASS" ? "ACCEPTED" : "REJECTED", approvalComment: input.comment, approvedBy: input.testedBy, approvedAt: now() });
}

export async function createPayment(input: FarmerPayment): Promise<void> { await writeRecord("farmer_payments", input.paymentId, input); }

export async function getScopedPhase2Data(user: AppUser): Promise<any> {
  const [farmers, animals, collections, veterinaryRecords, qualityTests, batches, payments, requests, mccs, breedTypes] = await Promise.all([
    listFarmers(), listAnimals(), listCollections(), listVeterinaryRecords(), listQualityTests(), listBatches(), listPayments(), readTable<AnyRecord>("milk_collection_requests"), readTable<AnyRecord>("mccs"), listBreedTypes(),
  ]);
  const farmer = farmers.find((item) => item.userId === user.uid);
  const scopedFarmers = user.role === "FARMER" ? farmers.filter((item) => item.farmerId === farmer?.farmerId) : farmers;
  const scopedAnimals = user.role === "FARMER" ? animals.filter((item) => item.farmerId === farmer?.farmerId) : animals;
  const scopedCollections = user.role === "FARMER" ? collections.filter((item) => item.farmerId === farmer?.farmerId) : user.role === "MILK_COLLECTOR" ? collections.filter((item) => item.collectedBy === user.uid) : collections;
  const today = new Date().toISOString().slice(0, 10);
  const summary: Phase2Summary = { farmers: scopedFarmers.length, animals: scopedAnimals.length, collectionsToday: scopedCollections.filter((item) => item.collectionDate.slice(0, 10) === today).length, litresToday: scopedCollections.filter((item) => item.collectionDate.slice(0, 10) === today && item.acceptanceStatus === "ACCEPTED").reduce((sum, item) => sum + item.litres, 0), pendingQualityTests: qualityTests.filter((item) => item.result === "PENDING").length, openBatches: batches.filter((item) => item.status === "OPEN").length, pendingPayments: payments.filter((item) => item.status === "PENDING").length };
  const settings = (await readRecord<AnyRecord>("settings", "values")) ?? defaultState.settings;
  return { farmers: scopedFarmers, animals: scopedAnimals, collections: scopedCollections, veterinaryRecords, qualityTests, batches, payments, milkPrice: Number(settings.milkPrice ?? 620), mccSharePercent: Number(settings.mccSharePercent ?? 10), collectorSharePercent: Number(settings.collectorSharePercent ?? 5), collectionRequests: requests, cowRegistrationAuthorizations: await listCowRegistrationAuthorizations(user), mccs, breedTypes, summary };
}

export async function getPhase2Summary(): Promise<Phase2Summary> {
  const data = await getScopedPhase2Data({ uid: "", role: "ADMIN", fullName: "", email: "", password: "", mccIds: [], status: "ACTIVE" });
  return data.summary;
}

export async function createCollectionRequest(farmerId: string, collectorId: string): Promise<void> {
  if (!farmerId || !collectorId) throw new Error("Select a milk collector.");
  const requestId = `REQ-COL-${Date.now()}`;
  await writeRecord("milk_collection_requests", requestId, { requestId, farmerId, collectorId, status: "PENDING", requestedAt: now() });
}
export async function decideCollectionRequest(requestId: string, collectorId: string, status: "ACCEPTED" | "REJECTED"): Promise<void> { const item = await readRecord<AnyRecord>("milk_collection_requests", requestId); if (!item || item.collectorId !== collectorId || item.status !== "PENDING") throw new Error("Collection request is no longer pending."); await patchRecord("milk_collection_requests", requestId, { status, respondedAt: now() }); }
export async function cancelCollectionRequest(requestId: string, farmerId: string): Promise<void> { const item = await readRecord<AnyRecord>("milk_collection_requests", requestId); if (!item || item.farmerId !== farmerId || item.status !== "PENDING") throw new Error("Only pending requests can be cancelled."); await deleteRecord("milk_collection_requests", requestId); }

export async function listBreedTypes(): Promise<BreedType[]> { return (await readTable<AnyRecord>("breed_types")).map((row) => ({ id: Number(row.id), name: String(row.name) })); }
export async function createBreedType(name: string, createdBy: string): Promise<BreedType> { if (!name.trim()) throw new Error("Breed name is required."); const id = Date.now(); const item = { id, name: name.trim(), createdBy }; await writeRecord("breed_types", String(id), item); return item; }

export async function listCollectorBatchAssignments(): Promise<CollectorBatchAssignment[]> { return (await readTable<AnyRecord>("collector_batch_assignments")) as CollectorBatchAssignment[]; }
export async function createCollectorBatchAssignment(input: { collectorId: string; mccId: string; assignedBy: string; batchCode?: string }): Promise<CollectorBatchAssignment> { const assignmentId = `ASSIGN-${Date.now()}`; const item: CollectorBatchAssignment = { assignmentId, collectorId: input.collectorId, mccId: input.mccId, batchCode: input.batchCode?.trim() || `BATCH-${Date.now()}`, status: "ACTIVE", assignedBy: input.assignedBy, createdAt: now() }; await writeRecord("collector_batch_assignments", assignmentId, item); return item; }
export async function listCollectorBatchApprovals(): Promise<any[]> { return (await listBatches()).filter((batch) => batch.collectorId); }
export async function decideCollectorBatches(input: { batchIds: string[]; status: "ACCEPTED" | "REJECTED"; comment: string; approvedBy: string }): Promise<void> { if (input.status === "REJECTED" && !input.comment.trim()) throw new Error("A rejection comment is required."); await Promise.all(input.batchIds.map((batchId) => patchRecord("milk_batches", batchId, { status: input.status, approvalComment: input.comment.trim(), approvedBy: input.approvedBy, approvedAt: now() }))); }

export async function createBatch(input: MilkBatch): Promise<void> { const existing = await readRecord<AnyRecord>("milk_batches", input.batchId); const collectionIds = [...new Set([...(existing?.collectionIds ?? []), ...(input.collectionIds ?? [])])]; await writeRecord("milk_batches", input.batchId, { ...existing, ...input, collectionIds, createdAt: existing?.createdAt ?? now(), totalLitres: (await listCollections()).filter((item) => collectionIds.includes(item.collectionId)).reduce((sum, item) => sum + item.litres, 0) }); }
export async function deleteBatch(batchId: string, user: AppUser): Promise<void> { const batch = await readRecord<AnyRecord>("milk_batches", batchId); if (!batch) throw new Error("Batch was not found."); if (user.role === "MILK_COLLECTOR" && batch.createdBy !== user.uid) throw new Error("You can only delete batches created by your account."); await deleteRecord("milk_batches", batchId); }
export async function updateRejectedBatchComment(batchId: string, comment: string): Promise<void> { if (!comment.trim()) throw new Error("A comment is required."); const batch = await readRecord<AnyRecord>("milk_batches", batchId); if (!batch || batch.status !== "REJECTED") throw new Error("Only rejected batches can receive a follow-up comment."); await patchRecord("milk_batches", batchId, { approvalComment: comment.trim() }); }

export type CollectorPaymentReport = FarmerPayment & { farmerName?: string; collectorName?: string };
export async function listCollectorPayments(): Promise<CollectorPaymentReport[]> { return (await listPayments()) as CollectorPaymentReport[]; }
export async function markCollectorPaymentPaid(payment: CollectorPaymentReport, approvedBy: string): Promise<void> { await patchRecord("farmer_payments", payment.paymentId, { status: "PAID", paidAt: now(), processedBy: approvedBy }); }
export async function updatePaymentShares(mccSharePercent: number, collectorSharePercent: number): Promise<void> { await patchRecord("settings", "values", { mccSharePercent, collectorSharePercent }); }

export async function listAccountingRecords(): Promise<{ expenseTypes: string[]; expenses: Array<{ expenseId: string; expenseDate: string; expenseName: string; expenseType: string; amount: number }> }> {
  const [types, expenses] = await Promise.all([readTable<AnyRecord>("expense_types"), readTable<AnyRecord>("expenses")]);
  return { expenseTypes: types.map((item) => String(item.typeName)), expenses: expenses as any };
}
export async function createExpenseType(typeName: string, createdBy: string): Promise<void> { await writeRecord("expense_types", safeKey(typeName.trim()), { typeName: typeName.trim(), createdBy, createdAt: now() }); }
export async function createExpense(input: { expenseId: string; expenseDate: string; expenseName: string; expenseType: string; amount: number; recordedBy: string }): Promise<void> { await writeRecord("expenses", input.expenseId, input); }
export async function listAdministrationRequests(): Promise<any[]> { return readTable<AnyRecord>("administration_requests"); }
export async function createAdministrationRequest(input: AnyRecord): Promise<void> { await writeRecord("administration_requests", input.requestId, { ...input, status: "PENDING", createdAt: now() }); }
export async function decideAdministrationRequest(requestId: string, status: string, approvedBy: string): Promise<void> { await patchRecord("administration_requests", requestId, { status, approvedBy, approvedAt: now() }); }

export async function createCowRegistrationBatch(input: { batchId: string; farmerId: string; requestedBy: string; cows: Array<Pick<Animal, "animalId" | "farmerId" | "tagNumber" | "breed" | "sex" | "status">> }): Promise<{ batchId: string; expiresAt: string }> {
  if (!input.batchId || !input.farmerId || !input.requestedBy || !input.cows.length) throw new Error("Select a farmer and add at least one cow.");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const otp = String(randomInt(100000, 1000000));
  await writeRecord("cow_registration_batches", input.batchId, { ...input, status: "PENDING_AUTHORIZATION", createdAt: now(), expiresAt, authorizationSessionId: `AUTH-SESSION-${Date.now()}` });
  await writeRecord("cow_registration_authorizations", input.batchId, { batchId: input.batchId, farmerId: input.farmerId, requestedBy: input.requestedBy, otpHash: hashOtp(otp), otpCode: otp, status: "PENDING_AUTHORIZATION", createdAt: now(), expiresAt, cows: input.cows });
  console.info(`Cow registration OTP ${otp} generated for farmer ${input.farmerId}.`);
  return { batchId: input.batchId, expiresAt };
}
export async function listCowRegistrationAuthorizations(user: AppUser): Promise<CowRegistrationAuthorization[]> {
  const rows = await readTable<AnyRecord>("cow_registration_authorizations");
  const farmer = user.role === "FARMER"
    ? (await readTable<AnyRecord>("farmers")).find((item) => item.userId === user.uid)
    : null;
  return rows
    .filter((row) => user.role !== "FARMER" || row.farmerId === farmer?.farmerId)
    .map((row) => ({
      ...row,
      farmerName: row.farmerName ?? row.farmerId,
      requestedByName: row.requestedByName ?? row.requestedBy,
      cowCount: row.cows?.length ?? row.cowCount ?? 0,
      cowTags: row.cows?.map((cow: AnyRecord) => cow.tagNumber) ?? row.cowTags ?? [],
    } as CowRegistrationAuthorization));
}
export async function listCowRegistrationSessions(): Promise<CowRegistrationSession[]> { return (await readTable<AnyRecord>("cow_registration_authorizations")) as CowRegistrationSession[]; }
export async function verifyCowRegistrationBatch(input: { batchId: string; otp: string; requestedBy: string }): Promise<{ registeredCount: number; batchId: string }> { const auth = await readRecord<AnyRecord>("cow_registration_authorizations", input.batchId); if (!auth || auth.status !== "PENDING_AUTHORIZATION" || auth.expiresAt < now() || auth.otpHash !== hashOtp(input.otp)) throw new Error("Invalid or expired authorization code."); const cows = auth.cows ?? []; await Promise.all(cows.map((cow: AnyRecord) => writeRecord("animals", cow.animalId, { ...cow, registrationBatchId: input.batchId, createdAt: now() }))); await patchRecord("cow_registration_authorizations", input.batchId, { status: "REGISTERED", usedAt: now(), verifiedBy: input.requestedBy }); await patchRecord("cow_registration_batches", input.batchId, { status: "REGISTERED" }); return { registeredCount: cows.length, batchId: input.batchId }; }
