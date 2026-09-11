# Digital Milk Collection System

A production-oriented Next.js application for digitalizing milk collection operations, MCC coordination, user management, and audit visibility. The application now includes the Phase 1 foundation plus Phase 2 operational workflows for farmers, animals, milk collection, veterinary records, and operational reporting.

## Project overview

The application is structured around a clean Next.js App Router implementation with Firebase-ready configuration and a demo-state fallback so the project remains runnable before a live Firebase project is connected.

## Technology stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Firebase Realtime Database client configuration ready for deployment
- Zod-ready validation model
- Lucide icons

## Prerequisites

- Node.js LTS
- npm
- Firebase project (for production use)
- Vercel account for deployment

## Firebase setup

1. Create a Firebase project in the Firebase console.
2. Enable Authentication and Realtime Database.
3. Create a Storage bucket if files will be uploaded.
4. Add a web app and copy the Firebase config values into your environment file.
5. Configure Firebase Security Rules using the included `firestore.rules` and `storage.rules` templates.

## Firebase Authentication setup

Set up email/password auth in Firebase Authentication and add the project settings to:

- `.env.local.example`
- `.env.example`

Example variables:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

The demo app also works without live Firebase credentials by using local in-browser storage for the Phase 1 workflow.

## Realtime Database setup

1. Create a Realtime Database.
2. Configure Realtime Database security rules for the paths listed below.
3. Confirm the database URL is `https://milksupplychain-d0276-default-rtdb.firebaseio.com`.

## Security rules setup

Use the supplied files:

- `firestore.rules`
- `storage.rules`

They are templates to secure access according to authentication and role checks.

## Storage setup

If you plan to upload documents or images:

1. Enable Firebase Storage.
2. Deploy the rules in `storage.rules`.
3. Restrict writes to approved roles.

## Environment variables

Copy the example file:

```bash
cp .env.local.example .env.local
```

Then fill in the actual values from your Firebase project.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Realtime Database data layout

Each former MySQL table is a top-level Realtime Database collection:

- `/users/{uid}`, `/mccs/{mccId}`, `/audit_logs/{auditId}`, `/settings/values`
- `/farmers/{farmerId}`, `/animals/{animalId}`, `/milk_collections/{collectionId}`
- `/quality_tests/{testId}`, `/veterinary_records/{recordId}`, `/milk_batches/{batchId}`
- `/farmer_payments/{paymentId}` plus the remaining workflow collections

Record properties remain JSON values on each record. The data layer reads with `get(ref(db, path))`, creates with `set` or `push`, and applies partial updates with `update`.

## Default development users

The demo seed data includes:

- admin@milk.local / admin123
- manager@milk.local / manager123
- officer@milk.local / officer123
- farmer@milk.local / farmer123
- collector@milk.local / collector123
- vet@milk.local / vet123

These values are for local demo testing and should be replaced with real admin accounts in production.

Phase 2 role behavior:

- `FARMER`: sees their own farmer, animal, collection, quality, veterinary, and payment records.
- `MILK_COLLECTOR`: records milk and sees only collections recorded by their own account.
- `VETERINARY_OFFICER`: manages veterinary records using their own account.
- Administrative and MCC roles retain broader operational visibility according to their permissions.

## Role structure

Supported roles in the Phase 1 seed model:

- SUPER_ADMIN
- ADMIN
- MCC_MANAGER
- MCC_OFFICER
- MILK_COLLECTOR
- FARMER
- VETERINARY_OFFICER
- PROCESSING_INDUSTRY
- FINANCE_OFFICER

## How to run

```bash
npm install
npm run dev -- --hostname 0.0.0.0 --port 3000
```

## How to deploy to Vercel

1. Push the project to GitHub.
2. Connect the repository to Vercel.
3. Add the Firebase environment variables under Vercel Project Settings, including `NEXT_PUBLIC_FIREBASE_DATABASE_URL`.
4. Deploy the project.
5. Verify the login page loads and role-based access works.

## How to add future modules

The architecture is ready for phase-based expansion:

- farmer and cow management
- veterinary medicine and treatment records
- milk collection and acceptance testing
- batching and cooling
- payroll and payments
- reporting and notification workflows

The Firebase Realtime Database data layer is implemented in `lib/data-layer.ts`.
