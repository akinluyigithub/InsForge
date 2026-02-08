@echo off
echo 🚀 Starting InsForge Local Dev Environment...

:: Check for .env file
if not exist .env (
    echo ⚠️ .env file not found. Creating from .env.example...
    copy .env.example .env
)

:: Start Infrastructure
echo 🐘 Starting Infrastructure (Postgres, PostgREST, Deno)...
docker compose -f docker-compose.local.yml up -d

:: Install Dependencies
echo 📦 Installing Dependencies...
call npm install

:: Run Migrations
echo 🛠️ Running Database Migrations...
cd backend
call npm run migrate:up
cd ..

:: Start Dev Servers
echo ✨ Launching Application...
npm run dev
