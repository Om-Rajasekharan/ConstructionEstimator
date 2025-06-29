# Construction Estimator Project - Team Setup Guide

This guide is for team members joining the project. You will be provided access to all required cloud resources (MongoDB Atlas, Google Cloud Storage) and credentials. Follow these steps to get your local environment running.

---

## 1. Prerequisites

- **Node.js** (v18+ recommended): https://nodejs.org/
- **npm** (comes with Node.js)
- **Python** (3.9+ recommended): https://www.python.org/
- **Git** (for cloning): https://git-scm.com/

---

## 2. Clone the Repository

```sh
git clone <repo-url>
cd construction_estimator
```

---

## 3. Get Credentials from the Team Lead

- You will be invited to the shared MongoDB Atlas project and Google Cloud project.
- You will receive:
  - `.env` file for the `Server` directory (with all necessary secrets and URIs)
  - `gcs-key.json` (Google Cloud service account key) for the `Server` directory

**Do not commit these files to version control.**

---

## 4. Python Environment Setup

```sh
cd Server
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

---

## 5. Node.js Backend Setup

```sh
cd Server
npm install
```

---

## 6. Frontend Setup

```sh
cd ../UI
npm install
```

---

## 7. Running the Project

### Start Backend (Node.js)
```sh
cd Server
npm start
```

### Start Frontend (React)
```sh
cd ../UI
npm start
```

### Python Scripts
- The backend will call Python scripts automatically for PDF/AI processing.
- To test Python scripts directly, activate your venv and run them as needed:
  ```sh
  python prep/pdfparser.py
  python prep/trajectory.py
  # etc.
  ```

---

## 8. Additional Notes

- **PDFs and AI responses** are stored in GCS; metadata is in MongoDB Atlas.
- **User authentication** uses JWT and Google OAuth.
- **Frontend** runs on Vite/React; backend is Express/MongoDB.
- **Python** is used for AI and PDF processing (see `Server/prep/` and `Server/dataCollection/`).
- For development, use two terminals: one for backend, one for frontend.

---

## 9. Troubleshooting

- Ensure all environment variables are set and correct (see `.env`).
- If you change the JWT secret, users must log in again.
- For CORS issues, contact the team lead to verify GCS bucket config.
- For Python errors, ensure all dependencies are installed and the venv is activated.

---

## 10. Useful Commands

- Install Python dependencies: `pip install -r Server/requirements.txt`
- Install backend dependencies: `cd Server && npm install`
- Install frontend dependencies: `cd UI && npm install`
- Start app: `npm start`

---

## 11. File Structure Overview

- `Server/` - Node.js backend, Python scripts, and config
- `UI/` - React frontend
- `rfpdb_pdfs/` - PDF storage (local, for dev)
- `.env` - Environment variables (not committed)
- `gcs-key.json` - Google Cloud credentials (not committed)
