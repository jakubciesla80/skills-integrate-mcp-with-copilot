# Project Guidelines

## Overview

Mergington High School extracurricular activities web app. Students browse activities, sign up with their school email, and unregister. Data is stored in-memory (resets on restart).

## Architecture

- **Backend**: `src/app.py` — FastAPI server on port 8000. Three endpoints: `GET /activities`, `POST /activities/{name}/signup`, `DELETE /activities/{name}/unregister`.
- **Frontend**: `src/static/` — Vanilla HTML/CSS/JS. `app.js` fetches the API and renders activity cards dynamically.
- No database; activity data lives in a dict at the top of `app.py`.

## Build and Test

```bash
pip install -r requirements.txt   # fastapi, uvicorn
cd src && python app.py            # runs on http://localhost:8000
# Interactive API docs: http://localhost:8000/docs
```

## Conventions

- Activity identifiers are their string names (URL-encoded in frontend).
- Student identifiers are school email addresses.
- Backend validates duplicates and missing resources with `HTTPException`.
- Frontend uses `async/await` with `encodeURIComponent()` for API calls and updates the DOM in-place (no full page reload).
- Success/error messages auto-hide after 5 seconds.

## MCP

The workspace uses the GitHub MCP server (`.vscode/mcp.json`) for Copilot integration. See [src/README.md](../src/README.md) for exercise context.
