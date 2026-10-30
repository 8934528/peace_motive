# Privacy Policy & Data Protection (POPIA)

## 1. Overview

This policy explains how Motive collects, uses, and protects personal and organizational data. We comply with South Africa's Protection of Personal Information Act (POPIA) and international data privacy principles.

## 2. Information We Collect

Motive only collects the minimal information needed to run the game:

- **Player Username**: A nickname chosen by the user to identify themselves in the game.
- **Session Identifier**: A randomly generated token stored in your browser to maintain your login and reconnect to active matches.
- **Match Gameplay Data**: Secret roles, votes, night actions, and game outcomes.
- **Technical Data**: Connection status, IP address (used temporarily for rate limiting and abuse prevention).

We **do not** collect sensitive personal details such as identity numbers, credit card numbers, passwords, physical addresses, or contact lists.

## 3. How We Use Information

We use collected data solely to:

- Create and manage game rooms.
- Authenticate players and maintain reconnectable game sessions.
- Process game logic (night actions, voting tallies, win condition checks).
- Prevent abuse, bot spam, and denial-of-service attacks.

We never sell, rent, or trade your data to third parties or advertisers.

## 4. POPIA Compliance & Your Rights

Under POPIA, you have the right to:

- **Access**: Ask what personal information we hold about you.
- **Correction**: Update or correct your username at any time.
- **Deletion**: Request deletion of your session records and player data.
- **Objection**: Object to any processing of your data not required for the game.

To exercise these rights, contact the system administrator.

## 5. Data Security

We protect your data through:

- **Encryption**: Secure HTTPS and WebSocket (WSS) connections in transit.
- **Access Controls**: Role-based permissions; game secrets (like Mafia identity) are filtered on the server and never sent to unauthorized players.
- **Input Sanitization**: All user inputs are sanitized to protect against XSS and injection attacks.
- **Rate Limiting**: Defenses to block automated flooding and tampering.

## 6. Retention and Deletion

- Active session data is kept only as long as needed to maintain gameplay.
- Games can be soft-deleted by the room host, and inactive room logs are routinely cleared.
