# Tax Watch Architecture

## Overview
This document outlines the blueprint and strategy for scraping IRS (United States) and URSSAF (France) official websites to automatically monitor and update tax rates, social security contributions, and related rules.

## Strategy

1. **Target Identification**
   - **IRS**: Official tax brackets, standard deductions, and publication pages.
   - **URSSAF**: Contribution rates, ceilings (Plafond de la Sécurité Sociale), and regional updates.

2. **Scraping Engine**
   - Use headless browsers (e.g., Playwright or Puppeteer) for dynamic or JavaScript-heavy pages.
   - Use standard HTTP clients (e.g., `requests`, `axios`) for static HTML pages or JSON API endpoints if available.

3. **Data Extraction & Parsing**
   - **DOM Parsing**: Extract tables and specific elements using CSS selectors or XPath.
   - **PDF Processing**: Many official rates are published in PDFs. Integrate PDF parsing libraries (e.g., PyPDF2, pdfplumber) to extract tables and text.
   - **LLM Assistance**: Use LLMs to parse complex or unstructured text announcements into structured JSON formats.

4. **Data Storage & Versioning**
   - Store parsed rates in a structured database (e.g., PostgreSQL or JSON files in a repository).
   - Maintain a history of changes (timestamp, old rate, new rate, source URL) to ensure auditability.

5. **Alerting & Automation**
   - Detect differences between newly scraped data and the current active database.
   - Automatically generate Pull Requests (PRs) or alert messages (Slack/Email) for human review before updating production systems.

## System Components

- **Scheduler**: A cron-based orchestrator (e.g., GitHub Actions, Airflow) that triggers the pipeline on a regular cadence (daily or weekly).
- **Fetchers**: Dedicated modules for each authority (e.g., `irs_fetcher`, `urssaf_fetcher`) to handle specific site navigation and download logic.
- **Parser/Extractor**: The core logic translating raw documents into normalized data models.
- **Diff Engine**: Compares the extracted data against the latest known state to identify rate changes.
- **Updater**: Handles the creation of update proposals (PRs) or direct database updates upon approval.

## Challenges & Mitigations

- **Site Layout Changes**: Official sites frequently redesign their layouts. 
  *Mitigation*: Use semantic extraction (LLMs) as a fallback and implement monitoring alerts when extractors fail.
- **Anti-Scraping Measures**: 
  *Mitigation*: Implement respectful crawl delays, rotate User-Agents, and avoid aggressive polling.
- **Data Accuracy**: Financial calculations rely on exact rates.
  *Mitigation*: Require human-in-the-loop review for all detected rate changes before applying them to production systems.
