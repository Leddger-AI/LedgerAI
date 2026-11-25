# 09 — Knowledge Base Ingestion & Gemini RAG Q&A

> **Status:** Production-Ready (Unified on Node Port 5000) | **Files:** [`src/KnowledgeBase.jsx`](../../src/KnowledgeBase.jsx), [`server/models/KnowledgeDocument.js`](../../server/models/KnowledgeDocument.js), [`server/utils/knowledgeSplitter.js`](../../server/utils/knowledgeSplitter.js), [`server/utils/kbAsk.js`](../../server/utils/kbAsk.js)

---

## 1. Research & Problem Statement
- Originally, Knowledge Base ingestion lived in the deprecated Rust prototype (`backend_rs/`) on port `8000`, leaving the active Node.js server (`5000`) disconnected and lacking an actual Q&A/search capability over stored chunks.

---

## 2. Architecture & Implementation
1. **Text Splitting & Tagging (`server/utils/knowledgeSplitter.js`):**
   - `splitTextRecursively()` splits text by paragraph → sentence → word boundaries with configurable token size (default `750` tokens) and overlap (`75` tokens).
   - `extractTags()` extracts top non-stopword keywords; `formatSlackMessages()` compiles multi-turn Slack JSON threads into timestamped transcripts.
2. **Persistence (`server/models/KnowledgeDocument.js`):**
   - Stores `{ ownerUid, document_id, source_type ('file'|'slack'), file_name, scope, tags, total_chunks, chunks }` in MongoDB.
3. **RAG Q&A (`server/utils/kbAsk.js` + `POST /api/kb/ask`):**
   - `retrieveRelevantChunks()` ranks all user chunks by keyword overlap (`topK = 5`).
   - Sends top passages to **Gemini 3.8 Flash** (`gemini-3.8-flash`) to generate a concise grounded answer with source file citations, falling back to extractive snippet output if no key is configured.
4. **Demo-Mode Safety (`src/KnowledgeBase.jsx`):**
   - Checks for an `Authorization` header before fetching `/api/kb/documents`, preventing `401` errors in Demo Mode.

---

## 3. API Endpoints & Testing
- **Endpoints:** `GET /api/kb/documents`, `GET /api/kb/documents/:id`, `POST /api/kb/ingest/file`, `POST /api/kb/ingest/slack`, `POST /api/kb/ask`, `DELETE /api/kb/documents/:id`.
- **Tests:** [`server/tests/knowledgeBase.test.js`](../../server/tests/knowledgeBase.test.js) (4/4 passing) and [`server/tests/kbAsk.test.js`](../../server/tests/kbAsk.test.js) (2/2 passing).
