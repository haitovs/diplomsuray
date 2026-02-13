#!/bin/bash
echo "Starting Suray V2X Security Simulation..."

# Start backend in background
echo "Starting backend on http://localhost:8000 ..."
cd backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start frontend
echo "Starting frontend on http://localhost:3000 ..."
cd ../frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "V2X Simulation started!"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop both services."

# Clean shutdown
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
