# 🩺 MendRx — AI-Powered Blood Report Analyzer

MendRx is a full-stack health-tech application that uses **Google Vertex AI (Gemini)** to extract and analyze blood report parameters from uploaded PDFs. It provides users with detailed health insights, lifestyle recommendations, and historical tracking of their blood markers.

## 📐 Architecture

```
mendrx/
├── mendrx-be-main/    # Spring Boot 3.4.2 (Java 17) — REST API backend
├── mendrx-fe-main/    # Next.js 14 (React 18) — Frontend web app
├── run_local.bat      # One-click launcher for both services (Windows)
└── README.md
```

| Layer    | Tech Stack                                                                 |
|----------|---------------------------------------------------------------------------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, Radix UI, Recharts       |
| Backend  | Spring Boot 3.4.2, Java 17, Maven, Spring Data JPA                       |
| AI/ML    | Google Cloud Vertex AI (Gemini) for PDF analysis & parameter extraction   |
| Database | PostgreSQL (Supabase)                                                     |
| Auth     | Supabase Auth (JWT-based)                                                 |
| Storage  | Google Cloud Storage                                                      |
| PDF      | Apache PDFBox, iTextPDF                                                   |

---

## ⚙️ Prerequisites

Before setting up, make sure you have the following installed:

| Tool             | Version   | Download                                                    |
|------------------|-----------|-------------------------------------------------------------|
| **Java JDK**     | 17+       | [Adoptium](https://adoptium.net/)                           |
| **Maven**        | 3.8+      | Included via `mvnw` wrapper (no install needed)             |
| **Node.js**      | 18+       | [nodejs.org](https://nodejs.org/)                           |
| **npm**          | 9+        | Bundled with Node.js                                        |
| **Git**          | Latest    | [git-scm.com](https://git-scm.com/)                        |
| **PostgreSQL**   | —         | Using Supabase (cloud-hosted); no local install needed      |

### Google Cloud Setup

This project uses **Google Cloud Vertex AI** and **Google Cloud Storage**. You need:
1. A Google Cloud project with Vertex AI API enabled.
2. A service account with permissions for Vertex AI and Cloud Storage.
3. Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to point to your service account JSON key file:
   ```bash
   # Windows (PowerShell)
   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\your-service-account-key.json"

   # Linux / macOS
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your-service-account-key.json"
   ```

### Supabase Setup

1. Create a free project at [supabase.com](https://supabase.com/).
2. Note down your:
   - **Database connection string** (PostgreSQL pooler URL)
   - **Database password**
   - **JWT Secret** (from Project Settings → API)
   - **Supabase URL** and **Anon Key** (from Project Settings → API)

---

## 🚀 Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/pradyuth050804/mendrx.git
cd mendrx
```

### 2. Backend Setup (`mendrx-be-main`)

#### a) Configure Environment

Create or edit the local profile config file:

```
mendrx-be-main/src/main/resources/application-local.properties
```

Add the following (replace placeholders with your actual values):

```properties
# --- Database (Supabase PostgreSQL) ---
spring.datasource.url=jdbc:postgresql://<YOUR_SUPABASE_POOLER_HOST>:5432/postgres
spring.datasource.username=postgres.<YOUR_SUPABASE_PROJECT_REF>
spring.datasource.password=<YOUR_DATABASE_PASSWORD>
spring.datasource.driver-class-name=org.postgresql.Driver

# Create tables on first run, then switch to 'validate' for safety
spring.jpa.hibernate.ddl-auto=update

# --- JWT (Supabase JWT Secret) ---
jwt.secret=<YOUR_SUPABASE_JWT_SECRET>

# --- Local File Paths ---
tracker.folder.path=./data/tracker
parameters.folder.path=./data/parameters
lifestyle.rec.template.folder.path=./data/lifestyle-rec

# --- Server ---
server.port=8080
```

#### b) Run the Backend

```bash
cd mendrx-be-main

# Windows
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local

# Linux / macOS
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

The backend will start on **http://localhost:8080**.

> **Health Check:** Visit http://localhost:8080/actuator/health to verify the backend is running.

---

### 3. Frontend Setup (`mendrx-fe-main`)

#### a) Configure Environment

Create a `.env.local` file in the frontend directory:

```
mendrx-fe-main/.env.local
```

Add the following:

```env
# --- Environment Mode ---
NEXT_PUBLIC_ENV=local

# --- Backend API URLs ---
NEXT_PUBLIC_LOCAL_API_URL=http://localhost:8080
NEXT_PUBLIC_DEV_API_URL=http://localhost:8080
NEXT_PUBLIC_PROD_API_URL=http://localhost:8080

# --- Supabase Auth ---
NEXT_PUBLIC_SUPABASE_URL=https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>
```

#### b) Install Dependencies & Run

```bash
cd mendrx-fe-main
npm install
npm run dev
```

The frontend will start on **http://localhost:3000**.

---

### 4. Quick Start (Windows One-Click)

If you've already configured both environment files, you can use the included batch script to start everything at once:

```bash
# From the project root
.\run_local.bat
```

This will open two separate terminal windows — one for the backend and one for the frontend.

---

## 🗂️ Project Structure

### Backend (`mendrx-be-main`)

```
mendrx-be-main/
├── src/main/java/com/mendrx/backend/
│   ├── controller/       # REST API endpoints
│   ├── service/           # Business logic & AI integration
│   ├── model/             # JPA entities
│   ├── repository/        # Spring Data JPA repositories
│   ├── config/            # CORS, Security, WebClient configs
│   └── dto/               # Data Transfer Objects
├── src/main/resources/
│   ├── application.properties             # Shared config
│   ├── application-local.properties       # Local dev config (not committed)
│   ├── application-prod.properties        # Production config (uses env vars)
│   └── application-test.properties        # Test config (H2 in-memory DB)
├── data/                  # Local data files (tracker, parameters, lifestyle-rec)
└── pom.xml                # Maven dependencies
```

### Frontend (`mendrx-fe-main`)

```
mendrx-fe-main/
├── src/
│   ├── app/               # Next.js App Router pages
│   ├── components/        # Reusable React components
│   └── lib/               # Utility functions & API client
├── public/                # Static assets
├── .env.local             # Environment variables (not committed)
├── tailwind.config.ts     # Tailwind CSS configuration
├── next.config.mjs        # Next.js configuration
└── package.json           # npm dependencies
```

---

## 🔑 Key Features

- **PDF Blood Report Upload** — Upload blood test PDFs for automated extraction.
- **AI-Powered Analysis** — Google Vertex AI (Gemini) extracts blood markers, values, units, and reference ranges.
- **Health Dashboard** — Visual charts and trends using Recharts.
- **Lifestyle Recommendations** — AI-generated health and lifestyle suggestions.
- **Historical Tracking** — Track blood markers over time.
- **Authentication** — Secure user auth via Supabase.
- **Report Export** — Download reports as PDF/Excel.

---

## 🛠️ Useful Commands

| Action                         | Command                                                                     |
|--------------------------------|-----------------------------------------------------------------------------|
| Run backend (local profile)    | `cd mendrx-be-main && .\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local` |
| Run frontend (dev server)      | `cd mendrx-fe-main && npm run dev`                                          |
| Build frontend                 | `cd mendrx-fe-main && npm run build`                                        |
| Run both (Windows)             | `.\run_local.bat`                                                           |
| Backend health check           | `curl http://localhost:8080/actuator/health`                                |

---

## 🤝 Contributing

1. Fork the repository.
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request.

---

## 📄 License

This project is proprietary. All rights reserved.
