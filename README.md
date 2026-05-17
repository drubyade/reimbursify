# ₹EIMBUR$IFY — Reimbursement Management Portal

> A full-stack, offline-first Progressive Web App for managing travel expenses, reimbursement forms, and approval workflows.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Development Environment](#development-environment)
3. [Prerequisites & Software Requirements](#prerequisites--software-requirements)
4. [Installation & Setup](#installation--setup)
5. [Running the Application](#running-the-application)
6. [Environment Variables](#environment-variables)
7. [Technology Stack](#technology-stack)
8. [Project Structure](#project-structure)
9. [Database Schema](#database-schema)
10. [API Endpoints](#api-endpoints)
11. [Features](#features)
12. [PWA & Offline Support](#pwa--offline-support)
13. [Security](#security)
14. [Testing](#testing)
15. [Deployment](#deployment)
16. [License](#license)

---

## Project Overview

**Reimbursify** is a Progressive Web App (PWA) designed to digitize and streamline the reimbursement lifecycle in organizations such as colleges, companies, and institutions.

**Key Capabilities:**

- **Group-based management** — Administrators create groups; members join with a secret key
- **Trip & Expense tracking** — Log categorized expenses with multi-currency support (50+ currencies)
- **Dynamic Form Builder** — Drag-and-drop form design with 15+ field types
- **Offline-first architecture** — Full functionality without internet; auto-sync on reconnection
- **Encrypted messaging** — AES-256 encrypted chat within groups
- **PDF generation** — Auto-generate & attach PDF snapshots of submitted forms
- **Signature attestation** — Collaborators can digitally sign/attest submissions
- **Profile auto-fill** — Employee details auto-populate form fields

**User Roles:**

| Role | Access |
|------|--------|
| **SUBMITTER** | Create trips, log expenses, fill & submit forms, view analytics, send messages |
| **ADMINISTRATOR** | Create groups, design form templates, review submissions, manage collaborators, attest signatures |

---

## Development Environment

This application was developed and tested on the following environment:

| Component | Details |
|-----------|---------|
| **Operating System** | macOS 13.2.1 (Ventura) |
| **Architecture** | Apple Silicon / x86_64 |
| **Node.js** | v22.17.0 |
| **npm** | v10.9.2 |
| **Database** | PostgreSQL 15+ (production) / SQLite (development fallback) |
| **Browser (tested)** | Google Chrome 120+, Safari 17+, Firefox 120+ |
| **IDE** | Visual Studio Code with ESLint + Prisma extensions |

---

## Prerequisites & Software Requirements

Before running this project, ensure the following software is installed:

### Required

| Software | Version | Purpose | Installation |
|----------|---------|---------|--------------|
| **Node.js** | ≥ 18.x (LTS recommended: 22.x) | JavaScript runtime | [nodejs.org](https://nodejs.org/) |
| **npm** | ≥ 9.x (bundled with Node.js) | Package manager | Comes with Node.js |
| **Git** | ≥ 2.x | Version control | [git-scm.com](https://git-scm.com/) |

### Required for Production

| Software | Version | Purpose | Installation |
|----------|---------|---------|--------------|
| **PostgreSQL** | ≥ 15.x | Relational database | [postgresql.org](https://www.postgresql.org/download/) or via Homebrew: `brew install postgresql@15` |

### Optional

| Software | Version | Purpose |
|----------|---------|---------|
| **Prisma Studio** | Bundled with Prisma CLI | Visual database browser (`npx prisma studio`) |
| **Google Chrome** | Latest | Best PWA/Service Worker testing with DevTools |

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Reimbursify
```

### 2. Install Dependencies

```bash
npm install
```

This installs all 14 production dependencies and 12 dev dependencies listed in `package.json`.

### 3. Configure Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your configuration (see [Environment Variables](#environment-variables) section).

### 4. Set Up the Database

**Option A — PostgreSQL (Recommended for Production):**

```bash
# Ensure PostgreSQL is running
# Update DATABASE_URL in .env to point to your PostgreSQL instance
# Example: DATABASE_URL="postgresql://user:password@localhost:5432/reimbursify"

# Run migrations
npx prisma migrate dev --name init

# (Optional) Seed with sample data
npm run seed:db
```

**Option B — SQLite (Quick Development Setup):**

```bash
# .env already defaults to SQLite:
# DATABASE_URL="file:./prisma/dev.db"

# Generate the database
npx prisma migrate dev --name init

# (Optional) Seed with sample data
npm run seed:db
```

### 5. Generate Prisma Client

```bash
npx prisma generate
```

---

## Running the Application

### Development Server

```bash
npm run dev
```

The application will be available at **http://localhost:3000**.

### Production Build

```bash
npm run build
npm start
```

### Other Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Create optimized production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint for code quality |
| `npm run seed:db` | Seed database with sample data |
| `npx prisma studio` | Open visual database browser (port 5555) |
| `npx prisma migrate dev` | Run pending database migrations |
| `npx prisma generate` | Regenerate Prisma Client after schema changes |

---

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# ──── Database ────
DATABASE_URL="postgresql://user:password@localhost:5432/reimbursify"
DIRECT_URL="postgresql://user:password@localhost:5432/reimbursify"
# For SQLite (dev only): DATABASE_URL="file:./prisma/dev.db"

# ──── NextAuth ────
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"

# ──── Google OAuth ────
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL or SQLite connection string |
| `DIRECT_URL` | For pooled DB | Direct connection URL (bypasses connection pooling) |
| `NEXTAUTH_URL` | Yes | Base URL of the application |
| `NEXTAUTH_SECRET` | Yes | Random secret for JWT signing (generate with `openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID` | Yes | OAuth client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Yes | OAuth client secret from Google Cloud Console |

---

## Technology Stack

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.3.1 | React framework with App Router, SSR, API routes |
| React | 19.0.0 | Component-based UI library |
| TypeScript | 5.8.3 | Static type checking |

### Backend & Database

| Technology | Version | Purpose |
|------------|---------|---------|
| Prisma ORM | 6.19.3 | Type-safe database access & migrations |
| PostgreSQL | 15+ | Production relational database |
| NextAuth.js | 4.24.13 | Authentication (Google OAuth + Credentials) |
| bcryptjs | 3.0.3 | Password hashing |

### Frontend & Styling

| Technology | Version | Purpose |
|------------|---------|---------|
| Tailwind CSS | 4.1.5 | Utility-first CSS framework |
| Framer Motion | 12.38.0 | Animation library |
| Lucide React | 1.8.0 | Icon library |

### PWA & Offline

| Technology | Purpose |
|------------|---------|
| Service Worker (custom) | Request interception, caching, background sync |
| IndexedDB (custom abstraction) | Client-side persistent storage (8 object stores) |
| Cache API | Static asset & API response caching |
| Web App Manifest | PWA installation metadata |

### Utilities

| Technology | Version | Purpose |
|------------|---------|---------|
| html2canvas | 1.4.1 | DOM-to-canvas for PDF generation |
| jsPDF | 4.2.1 | Client-side PDF creation |
| Tesseract.js | 7.0.0 | OCR for receipt text extraction |
| CryptoJS | 4.2.0 | AES encryption for messages |
| Zod | 4.3.6 | Schema validation |
| date-fns | 3.0.0 | Date formatting utilities |

### Dev & Testing

| Technology | Version | Purpose |
|------------|---------|---------|
| Jest | 30.4.2 | Test runner |
| Testing Library | 16.3.2 | React component testing |
| ESLint | 9.25.1 | Code linting |
| ts-jest | 29.4.9 | TypeScript Jest transformer |

---

## Project Structure

```
Reimbursify/
├── prisma/
│   ├── schema.prisma              # Database schema (15 models)
│   ├── migrations/                # Database migration history
│   ├── seed.js                    # Database seeding script
│   └── seed.ts                    # TypeScript seed script
│
├── public/
│   ├── sw.js                      # Service Worker (offline caching, sync)
│   ├── manifest.json              # PWA manifest (app metadata, icons)
│   └── icons/                     # App icons (various sizes)
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (admin)/               # Admin-only routes (protected)
│   │   │   └── admin/
│   │   │       ├── groups/        # Group management
│   │   │       ├── forms/         # Form template management
│   │   │       └── submissions/   # Submission review & approval
│   │   ├── (submitter)/           # Submitter-only routes (protected)
│   │   │   └── trips/             # Trip & expense management
│   │   ├── api/                   # REST API (17 route groups)
│   │   │   ├── auth/              # NextAuth authentication handlers
│   │   │   ├── trips/             # Trip CRUD + nested expenses
│   │   │   ├── expenses/          # Expense CRUD
│   │   │   ├── forms/             # Form template CRUD
│   │   │   ├── forms-builder/     # Form builder operations
│   │   │   ├── submissions/       # Submission management
│   │   │   ├── groups/            # Group CRUD + members + collaborators
│   │   │   ├── direct-messages/   # Encrypted messaging
│   │   │   ├── profile/           # User profile + payment cards
│   │   │   ├── bills/             # Receipt file management
│   │   │   ├── exchange-rates/    # Currency exchange caching
│   │   │   ├── reimbursements/    # Legacy reimbursement endpoints
│   │   │   └── users/             # User search
│   │   ├── auth/                  # Authentication pages
│   │   ├── expenses/              # Expense pages
│   │   ├── floating-forms/        # Standalone form access
│   │   ├── offline/               # Offline fallback page
│   │   ├── globals.css            # Global styles & CSS variables
│   │   ├── layout.tsx             # Root layout (providers, SW registration)
│   │   └── page.tsx               # Landing page
│   │
│   ├── components/                # React components (21 files)
│   │   ├── FormBuilder.tsx        # Drag-and-drop form designer (48KB)
│   │   ├── FormBuilder.module.css # Form builder styles
│   │   ├── form-interface.tsx     # Smart form filler with expense linking (65KB)
│   │   ├── form-filler.tsx        # Basic form filling component
│   │   ├── form-selection.tsx     # Form template selector
│   │   ├── trips-dashboard.tsx    # Trip & expense management (83KB)
│   │   ├── admin-approval-panel.tsx # Submission review panel (37KB)
│   │   ├── group-messages.tsx     # Encrypted chat interface (19KB)
│   │   ├── profile-panel.tsx      # User profile management (22KB)
│   │   ├── reimbursement-dashboard.tsx # Reimbursement overview
│   │   ├── reimbursements-view.tsx # Reimbursements list view
│   │   ├── submission-tracking.tsx # Submission status tracking
│   │   ├── trip-management.tsx    # Trip detail management
│   │   ├── expense-form.tsx       # Expense entry form
│   │   ├── header.tsx             # App header with install button
│   │   ├── Navbar.tsx             # Navigation bar
│   │   ├── ServiceWorkerRegister.tsx # PWA SW registration + sync (14KB)
│   │   ├── PwaInstallBanner.tsx   # PWA install prompt banner
│   │   ├── OfflineGuard.tsx       # Offline detection wrapper
│   │   ├── AuthProvider.tsx       # NextAuth session provider
│   │   └── shared-groups/         # Shared group components
│   │
│   ├── lib/                       # Utility modules (13 files)
│   │   ├── auth.ts                # NextAuth configuration (Google + Credentials)
│   │   ├── prisma.ts              # Prisma client singleton
│   │   ├── db.ts                  # Database helper functions (29KB)
│   │   ├── offline-db.ts          # IndexedDB abstraction (15KB)
│   │   ├── sync.ts                # Data sync engine (6KB)
│   │   ├── encryption.ts          # AES/RSA encryption utilities
│   │   ├── encryption-client.ts   # Client-side encryption
│   │   ├── diffie-hellman.ts      # DH key exchange implementation
│   │   ├── expense-config.ts      # Expense type configurations
│   │   ├── currencies.ts          # 50+ currency definitions
│   │   ├── reimbursements.ts      # Reimbursement helpers
│   │   ├── validations.ts         # Input validation schemas
│   │   └── test-utils.ts          # Test utility functions
│   │
│   ├── hooks/                     # Custom React hooks
│   │   └── useDataSync.ts         # Generic data sync hook
│   │
│   └── types/                     # TypeScript type definitions
│       └── forms.ts               # Form field type definitions
│
├── __tests__/                     # Test suites
├── .env.example                   # Environment variable template
├── .gitignore                     # Git ignore rules
├── amplify.yml                    # AWS Amplify CI/CD config
├── eslint.config.mjs              # ESLint configuration
├── jest.config.ts                 # Jest test configuration
├── next.config.ts                 # Next.js configuration
├── package.json                   # Dependencies & scripts
├── postcss.config.mjs             # PostCSS configuration
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # This file
```

---

## Database Schema

The application uses **15 Prisma models** with PostgreSQL. Schema file: `prisma/schema.prisma`

### Core Models

| Model | Purpose | Key Relations |
|-------|---------|---------------|
| **User** | Authentication & profile data | → Trips, Groups, Submissions, Messages |
| **Group** | Organizational unit for members | → Memberships, FormTemplates, Messages |
| **GroupMembership** | User ↔ Group association | → User, Group (unique per user-group) |
| **GroupCollaborator** | Admin-assigned co-signers | → User, Group |
| **Trip** | Container for expenses | → Expenses, Submissions |
| **Expense** | Individual expense entry | → Trip, BillFiles |
| **BillFile** | Binary receipt/bill storage | → Expense |
| **FormTemplate** | Admin-designed form schemas (JSON) | → Group, Submissions |
| **Submission** | Filled form with status tracking | → FormTemplate, Trip, User, Attestations |
| **SignatureAttestation** | Digital signature records | → Submission, User |
| **DirectMessage** | AES-encrypted chat messages | → Group, Sender, Receiver |
| **PaymentCard** | Payment method storage | → User |
| **ExchangeRate** | Cached currency rates (24h TTL) | — |
| **Account / Session** | NextAuth OAuth & session management | → User |

### Key Relationships

```
User ──< Trip ──< Expense ──< BillFile
User ──< Group ──< FormTemplate ──< Submission ──< SignatureAttestation
User ──< GroupMembership >── Group
User ──< GroupCollaborator >── Group
Group ──< DirectMessage
```

---

## API Endpoints

All API routes are located under `src/app/api/`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `*` | `/api/auth/[...nextauth]` | NextAuth handlers (login, logout, session) |
| `GET/POST` | `/api/trips` | List user trips / Create trip |
| `GET/PATCH/DELETE` | `/api/trips/[id]` | Get / Update / Delete trip |
| `GET/POST` | `/api/trips/[id]/expenses` | List trip expenses / Add expense |
| `GET/POST/PATCH/DELETE` | `/api/expenses/[id]` | Individual expense operations |
| `GET/POST` | `/api/forms` | List / Create form templates |
| `GET/PATCH/DELETE` | `/api/forms/[id]` | Individual form template operations |
| `GET/POST` | `/api/submissions` | List / Create submissions |
| `GET/PATCH/DELETE` | `/api/submissions/[id]` | Individual submission operations |
| `GET/POST` | `/api/groups` | List / Create groups |
| `GET/PATCH/DELETE` | `/api/groups/[id]` | Individual group operations |
| `GET/POST` | `/api/direct-messages` | List / Send encrypted messages |
| `GET/PATCH` | `/api/profile` | Get / Update user profile |
| `GET/POST/DELETE` | `/api/profile/payment-cards` | Manage payment cards |
| `GET/POST` | `/api/bills` | Manage receipt files |
| `GET/POST` | `/api/exchange-rates` | Currency exchange rates |
| `GET` | `/api/users/search` | Search users for messaging |

---

## Features

### For Submitters (Employees)

- **Trip Management** — Create, edit, archive, favorite, and delete trips
- **Expense Tracking** — Log expenses with 15+ types (Air, Train, Taxi, Hotel, etc.), upload receipts
- **Multi-Currency** — 50+ currencies with flag display and exchange rate support
- **Form Filling** — Fill admin-designed forms with auto-populated profile data
- **Expense Linking** — Select trip expenses as interactive checkbox tables in forms
- **Draft Support** — Save form progress as drafts, resume later
- **PDF Export** — Download filled forms as formatted PDF documents
- **Analytics** — View expense breakdowns, totals, and statistics
- **Messaging** — End-to-end encrypted chat with group members
- **Offline Mode** — Full functionality without internet

### For Administrators (Reimbursifiers)

- **Group Management** — Create groups with unique IDs and secret keys
- **Form Builder** — Drag-and-drop builder with 15+ field types, sections, undo/redo
- **Collaborator Management** — Add collaborators for multi-level attestation
- **Submission Review** — Filter, search, sort, and review all submissions
- **Signature Attestation** — Digitally sign form fields assigned to you
- **Messaging** — Communicate with group members securely

### Form Builder Field Types

| Category | Fields |
|----------|--------|
| Basic | Short Text, Long Text, Number, Date |
| Selection | Dropdown, Multiple Choice, Checkbox, Yes/No |
| Advanced | File Upload, Subheading, Fill-in-the-Blanks |
| Expense Tables | Travel Cards Table, Accommodation Cards Table, Other Expenses Table |
| Approval | Signature Authority (assignable to collaborators) |

---

## PWA & Offline Support

Reimbursify is a fully installable Progressive Web App with offline-first support.

### Architecture

| Component | File | Purpose |
|-----------|------|---------|
| Service Worker | `public/sw.js` | Request interception, caching, background sync |
| SW Registration | `src/components/ServiceWorkerRegister.tsx` | Registration, connectivity monitoring, sync |
| IndexedDB | `src/lib/offline-db.ts` | 8 object stores for offline data |
| Sync Engine | `src/lib/sync.ts` | Bidirectional data synchronization |
| Offline Page | `src/app/offline/page.tsx` | User-friendly offline fallback |
| Manifest | `public/manifest.json` | PWA metadata, icons, theme |

### Caching Strategy

- **Static Assets** → Cache-first (instant loads)
- **API Requests** → Network-first with cache fallback
- **Offline Fallback** → Custom offline page with data access

### IndexedDB Stores (8)

`trips` · `expenses` · `forms` · `submissions` · `groups` · `messages` · `sync-queue` · `api-cache`

### Offline Capabilities

- View all cached trips, expenses, forms, and submissions
- Create new trips and expenses (queued for sync)
- Fill and save form drafts
- Automatic sync when connectivity returns
- Visual offline/syncing status indicators

---

## Security

| Layer | Technology | Details |
|-------|------------|---------|
| **Authentication** | NextAuth.js | Google OAuth 2.0 + Email/Password credentials |
| **Password Hashing** | bcryptjs | Salted bcrypt hashing |
| **Sessions** | JWT | Stateless JSON Web Tokens |
| **Message Encryption** | AES-256 (CryptoJS) | All chat messages encrypted before storage |
| **Key Exchange** | Diffie-Hellman | MODP Group 14 (2048-bit prime) for key negotiation |
| **Content Integrity** | SHA-256 | Hash verification for message integrity |
| **Digital Signatures** | RSA-4096 | Content signing and verification |
| **Access Control** | Role-based | SUBMITTER / ADMINISTRATOR with server-side checks |
| **Group Security** | Secret Key | Groups require secret key for member joining |

---

## Testing

```bash
# Run all tests
npx jest

# Run tests with coverage
npx jest --coverage

# Run specific test file
npx jest __tests__/example.test.ts
```

Test configuration: `jest.config.ts`  
Test setup: `jest.setup.ts`  
Test utilities: `src/lib/test-utils.ts`

---

## Deployment

### AWS Amplify

The project includes an `amplify.yml` CI/CD configuration. Push to the connected Git branch to trigger automatic deployment.

### Vercel (Alternative)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Manual Deployment

```bash
# 1. Build
npm run build

# 2. Set environment variables on your server

# 3. Run database migrations
npx prisma migrate deploy

# 4. Start
npm start
```

### Production Checklist

- [ ] Set `NEXTAUTH_SECRET` to a secure random value
- [ ] Configure PostgreSQL database and set `DATABASE_URL`
- [ ] Set up Google OAuth credentials for your production domain
- [ ] Update `NEXTAUTH_URL` to your production URL
- [ ] Enable HTTPS (required for Service Worker & PWA)
- [ ] Run `npx prisma migrate deploy` on production database

---

## License

© 2026 Reimbursify. All rights reserved.

---

**Built with ❤️ using Next.js, React, PostgreSQL, Prisma, and modern web technologies.**
