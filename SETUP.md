# Motive — Setup Guide

Get Motive running on your machine in just a few minutes.

## 1. Requirements

- **Node.js** (version 22 or newer)
- **npm** (comes with Node.js)
- **PostgreSQL** (installed locally or via Docker)

## 2. Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Open `.env` and check your database connection settings if needed.

## 3. Installation

Install all dependencies for frontend and backend:

```bash
npm install
```

## 4. Running the Game

Start the PostgreSQL database:

```bash
npm run db:up
```

Start both the client and server:

```bash
npm run dev
```

The server automatically sets up the database tables and roles on startup.

## 5. Open the Game

- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:3001`
- **Health Check**: `http://localhost:3001/api/health`
