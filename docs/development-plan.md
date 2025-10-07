# Phase 1 Plan — Brandalyze MVP (Text-Only)

## 🎯 Objective
Build the first working version of **Brandalyze** that:
- Accepts brand text samples (voice/style uploads)
- Analyzes new content for alignment with that voice
- Returns a **Brand Alignment Score** + tone/suggestion feedback

---

## 🧭 Overview
**Phase 1 Duration:** 4 Weeks  
**Goal:** Text-only brand consistency checker  
**Stack:**  
- Frontend: Next.js (TypeScript + Tailwind + shadcn/ui)  
- Backend: Django REST Framework + JWT  
- AI: OpenAI GPT-4o (for tone analysis)  
- Vector DB: Qdrant (for brand embeddings)  
- Storage: AWS S3 or Supabase Storage  

---

## 📅 Week 1 — Setup & Scaffolding

### 🎯 Goals
- Initialize monorepo  
- Set up base Next.js + Django apps  
- Create foundational docs and environment setup  

### 🔧 Tasks
**Monorepo**
- Create root folder `brandalyze/`
- Add Turborepo or PNPM workspaces  
- Add folders:  
  - `apps/frontend`  
  - `apps/backend`  
  - `packages/ai-core`  
  - `packages/shared`  

**Frontend (Next.js)**
- Initialize with `create-next-app@latest --typescript`
- Install TailwindCSS, shadcn/ui, and NextAuth scaffolding
- Create base pages: `/`, `/upload`, `/analyze`

**Backend (Django)**
- Initialize project `brandalyze-backend`
- Install Django REST Framework, djangorestframework-simplejwt
- Create apps: `accounts`, `brands`, `analysis`
- Implement `/health` endpoint

**Docs**
- Add `phase1-plan.md`
- Update `README.md` with setup instructions

---

## 📅 Week 2 — Brand Voice Uploads

### 🎯 Goals
- Users can upload brand text samples  
- AI extracts embeddings and stores them in Qdrant  

### 🔧 Tasks
**Backend**
- Create models:
  - `Brand`: name, owner
  - `BrandSample`: text, file_ref, embedding
- Endpoints:
  - `POST /brands/upload/` → upload sample
  - `GET /brands/` → list user’s brands
- Integrate Qdrant for vector storage
- Add `ai-core/embeddings.py` → generate & store embeddings

**Frontend**
- Create upload form (text input or file upload)
- Show list of uploaded brand samples
- Connect via Axios or React Query

---

## 📅 Week 3 — Analysis Pipeline

### 🎯 Goals
- Analyze new content against brand embeddings  
- Return alignment score + tone/style differences  

### 🔧 Tasks
**Backend**
- Endpoint: `POST /analysis/check/`
- Add logic in `ai-core/analysis.py`:
  - Compare new text embedding vs. average brand embedding
  - Compute cosine similarity
  - Generate tone/style feedback (GPT)
- Store `AnalysisResult` (score, suggestions, timestamp)

**Frontend**
- Add “Analyze Text” page  
- Input box for new content  
- Display result card:
  - Brand Alignment Score
  - Key tone/style differences
  - Suggested improvements

---

## 📅 Week 4 — UI Polish & Launch Prep

### 🎯 Goals
- Refine user experience  
- Deploy MVP  

### 🔧 Tasks
**Frontend**
- Add clean layout (cards, progress bars, icons)
- Add loading states and error handling
- Improve typography for readability

**Backend**
- Deploy on Render or Railway
- Connect Supabase or AWS S3 for file storage
- Ensure CORS and JWT settings work in production

**Deployment**
- Frontend → Vercel  
- Backend → Render/Railway  
- Vector DB → Qdrant Cloud  
- Update `.env.example` and production configs

---

## ✅ Deliverables (End of Phase 1)
- Brandalyze MVP live (text-only version)
- Users can:
  - Upload brand tone/style samples  
  - Analyze new content for consistency  
  - View Brand Alignment Score + suggestions  
- Clean, functional dashboard with core logic running

---

## 🪜 Next Steps (Post-MVP)
- Add image & color consistency checks  
- Multi-user team dashboards  
- Browser extension for inline tone checks  
- Auto-rewrite feature to match brand voice  
- Analytics dashboard for tracking tone drift  