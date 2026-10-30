# Motive

party game of social deduction for 4–12 players. Players are secretly divided into Town and Mafia. Can the Town find the Mafia before the Mafia takes over?

## Tech Stack

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)](https://getbootstrap.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

## Highlights

- **Classic Game Loop**: Lobby, Role Reveal, Night Actions, Morning News, Day Discussion, Voting, and Game Over.
- **4 to 12 Players**: Automatically balances roles (Mafia, Doctor, Detective, Villagers).
- **Secret & Fair**: The server hides secrets. Players only see what their role is allowed to know.
- **Host Controls**: Adjust timers, pause or resume, remove players, and restart matches.
- **Secure Backend**: Built-in rate limiting, session authentication, and input sanitization.
- **Real-Time Play**: Powered by Node.js, Express, Socket.IO, PostgreSQL, and React.

## Quick Start

1. Copy `.env.example` to `.env`.
2. Run `npm install` to install dependencies.
3. Start the database: `npm run db:up` (or use local PostgreSQL).
4. Start both frontend and backend: `npm run dev`.
5. Open `http://localhost:5173` in your browser.

## Documentation

- [Setup Guide](SETUP.md)
- [Game Rules](docs/GAME_RULES.md)
- [Roles Guide](docs/ROLES.md)
- [Game Flow](docs/GAME_FLOW.md)
- [API & Sockets](docs/API.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database Design](docs/DATABASE.md)
- [Error Handling](docs/ERROR_HANDLING.md)
- [Keyboard Shortcuts](docs/SHORTCUTS.md)
- [Future Features](docs/FUTURE_FEATURES.md)

## Policies & Compliance

- [Privacy Policy & POPIA](policies/privacy_data_protection.md)
- [Access Control & Incident Response](policies/user_company_access_incident.md)

## Useful Commands

| Command               | Purpose                                           |
|-----------------------|---------------------------------------------------|
| `npm run dev`         | Start frontend and backend in development mode    |
| `npm run build`       | Build frontend and backend for production         |
| `npm run typecheck`   | Check TypeScript code in all projects             |
| `npm run db:up`       | Start the PostgreSQL Docker container             |
| `npm run db:down`     | Stop the PostgreSQL Docker container              |
