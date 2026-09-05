@echo off
echo ========================================
echo   Novarix - Quick Start Setup
echo ========================================
echo.

echo Step 1: Installing backend dependencies...
cd backend
call npm install
cd ..

echo Step 2: Installing frontend dependencies...
cd frontend
call npm install
cd ..

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Database: PostgreSQL
echo Set backend\.env from backend\.env.example before starting the backend.
echo.
echo To run the application:
echo   1. Run backend:   cd backend ^&^& npm run dev
echo   2. Run frontend:  cd frontend ^&^& npm run dev
echo.
echo Then open: http://localhost:3000
echo.
pause
