# DigiTrace

DigiTrace is a professional digital forensics platform for Android device data extraction and analysis. It provides a FastAPI backend that interfaces with Android devices via ADB and a React + TypeScript frontend built with Vite.

## Features

- Forensically-sound Android data extraction (contacts, SMS, call logs, media, system bugreports)
- SHA-256 integrity hashing and ZIP packaging of evidence
- FastAPI backend with background extraction tasks and OpenAPI docs
- React + TypeScript frontend with shadcn/ui and Tailwind CSS

## Repository Structure

- `digitrace/` — Project files (backend, frontend, docs)
  - `backend/` — FastAPI server, ADB integration, exports
  - `frontend/` — Vite / React / TypeScript UI

## Quickstart

Backend (Python):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r digitrace/backend/requirements.txt
python digitrace/backend/run_server.py
```

Or run with uvicorn:

```powershell
uvicorn digitrace.backend.main:app --host 0.0.0.0 --port 8000 --reload
```

API docs: http://localhost:8000/docs

Frontend (Vite):

```bash
cd digitrace/frontend
npm install
npm run dev
```

Default dev ports: frontend -> 8080, backend -> 8000

## Tests

Run backend tests (if any):

```powershell
cd digitrace/backend
pytest
```

## Notes

- Ensure `adb` is installed and available on PATH for device extraction.
- The repository previously contained a nested git repo; nested `.git` has been removed and its contents are tracked as regular files.

## License

Proprietary — see `digitrace/PROJECT_DESCRIPTION.md` for project metadata.

## Contact

Developed by Venkat — see project metadata in `digitrace/PROJECT_DESCRIPTION.md`.
