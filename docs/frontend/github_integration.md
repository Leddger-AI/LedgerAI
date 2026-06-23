# GitHub Ingestion & Repo Analytics (Frontend)

Ledger AI features a secure client-side repository analysis widget that queries GitHub REST APIs on candidate profile decryption.

---

## 📊 1. Repository Telemetry Grid

* **Language Usage Stack Bar**:
  * Loops through candidate repositories, aggregates source file sizes, and computes coding language percentages.
  * Renders a multi-colored bar representing language distribution (e.g. JavaScript, Python, Rust) with tooltips.
* **Commit Activity Pulse Graph**:
  * Visualizes candidate developer commits over a 90-day span.
  * Formatted as a 14x7 contribution density grid using opacities of brand-tailored cyan (`#00f0ff`).
* **Interactive Node Graph (Collaborator Network)**:
  * *(Optionally enabled)* Renders collaborator graphs illustrating candidate team workflows.

---

## 🤖 2. Code Quality Review Card

* **AI Quality Evaluation**:
  * Parses candidate repos to generate a summary card measuring code quality:
    * **Readability Index**: Measures spacing, descriptive nomenclature, and structure.
    * **Modularity Rating**: Gauges functions and object separations.
    * **Plagiarism Badge**: Detects duplicate templates (flags 0% plagiarism for original work).
    * **Security Checks**: Highlights sensitive configuration file leaks.
