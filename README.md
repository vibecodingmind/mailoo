# Mailoo — Sovereign Custom Domain Email Hosting

Mailoo is a multi-tenant email hosting platform and webmail client featuring custom domain DNS management, 2048-bit RSA DKIM signing, SPF/DMARC alignment, end-to-end PGP key management, and AI composition.

## ✨ Features

- **Custom Domain Orchestration**: Automated generation and verification of MX, SPF, DKIM (2048-bit RSA), and DMARC DNS records.
- **Fast Webmail Suite**: Threaded conversation views, labels, attachments viewer, search, rich text & markdown composition.
- **Inbound & Outbound Mail Engine**: Full MIME parser and RFC 5322 compiler with simulation harnesses.
- **Security & Privacy Hub**: Hardware key / TOTP 2FA, session management, audit logging, app-specific passwords, and PGP encryption keys.
- **AI Composition & Summarization**: Refine, formalize, and auto-draft emails with Google Gemini models.
- **Team & Quota Management**: Multi-mailbox provisioning, shared routing, storage quotas, and vacation auto-responders.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy the example environment file:
```bash
cp .env.example .env
```
Provide your `GEMINI_API_KEY` for AI email features.

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
npm start
```

## 🛠 Tech Stack
- **Frontend**: React 18, Tailwind CSS, Lucide Icons, Motion
- **Backend**: Express, Node.js TypeScript
- **Security**: scrypt (RFC 7914), OpenPGP, TOTP RFC 6238, RSA DKIM signing
