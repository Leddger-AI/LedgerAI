# Knowledge Base System (RAG Ingestion)

The Ledger AI Knowledge Base features an in-memory document ingestion, chunking, tagging, and storage service to organize workspace references.

---

## 📄 1. File & Thread Ingestion

* **File Uploads**: Supports uploading `.txt`, `.pdf`, and `.docx` files through `POST /api/kb/ingest/file`.
* **Slack Conversations**: Ingests multi-turn Slack conversation logs using `POST /api/kb/ingest/slack`. Threads are automatically sorted chronologically and converted to clean dialogue text.

---

## 🛠️ 2. Custom Text Parsers

* **Plain Text (`.txt`)**: Decodes bytes directly into a UTF-8 string, skipping invalid characters.
* **Word Documents (`.docx`)**:
  * Reads the zip archive and extracts `word/document.xml` directly (without external document-processing engine requirements).
  * Runs a state-machine parse script scanning tags to extract all text inside paragraph `<w:t>` tags.
* **PDFs (`.pdf`)**: Extracts raw text using the `pdf-extract` crate.

---

## ✂️ 3. Recursive Chunker

Implements a text-splitting algorithm designed to partition documents while keeping semantic sentences together:
* **Separators**: Splits text progressively using:
  1. Paragraph breaks (`\n\n`)
  2. Single newlines (`\n`)
  3. Space characters (` `)
  4. Single characters (`""`)
* **Chunk Parameters**: Defaults to `3000` tokens per chunk (approx. 12,000 characters) with a `300` token overlap.
* **Overlap Prefixing**: Computes text overlaps by extracting suffix characters from the preceding chunk to preserve contextual boundaries.

---

## 🏷️ 4. Semantic Tagger

Generates 3 to 5 lowercase tags summarizing document content:
* **Gemini Tagger**: Queries the `gemini-2.5-flash` model with a system prompt and a JSON schema returning a list of lowercase tag strings.
* **Fallback Tagger**: Calculates term frequencies (TF) after removing standard English stopwords, using the most frequent terms (between 5 and 15 characters) as fallback tags.
