@echo off
start cmd /k "cd backend && ..\.venv\Scripts\python -m uvicorn main:app --reload"
start cmd /k "cd frontend && npm run dev"
echo V2X Simulation started!
echo Frontend: http://localhost:3000
echo Backend: http://localhost:8000
