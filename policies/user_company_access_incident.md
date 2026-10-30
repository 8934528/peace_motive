# Access Control, and Incident Response

## 1. Purpose

This policy sets out rules for protecting user and company data, managing access permissions, and responding effectively to security incidents.

## 2. User Data Safeguards

When organizations use Motive for team-building or social events:

- **Data Isolation**: Each game lobby is isolated with its own unique identifier and private join codes.
- **Confidentiality**: names, internal usernames, and match results are kept strictly within that game room.
- **No Unnecessary Data**: Motive does not access company files, email directories, or enterprise networks.

## 3. Access Control Rules

We follow the principle of least privilege:

- **Server Verification**: The backend validates every request. A hidden button or disabled UI on the client is never treated as security.
- **Session Tokens**: Every mutating action requires a verified session token matching the player.
- **Host Permissions**: Only the host can configure timers, pause/resume matches, kick players, restart, or delete rooms.
- **Player Roles**: Only living players with active abilities (Mafia, Doctor, Detective) can perform night actions, and only living players can vote.
- **State Filtering**: The server filters match state per user. Town members never see hidden Mafia identities until the game ends.

## 4. Incident Response Plan

In the event of a security breach, data leak, or system vulnerability:

1. **Detection & Reporting**:
   - Automated alerts or user reports notify the team immediately upon unusual activity.
2. **Containment**:
   - Compromised session tokens are immediately invalidated.
   - Malicious IP addresses are rate-limited or blocked.
   - Affected game rooms are stopped to prevent further unauthorized actions.
3. **Investigation**:
   - Server logs and database records are inspected to identify the cause and scope of the incident.
4. **Remediation**:
   - The security loophole is patched and tested.
   - Normal operations are safely restored.
5. **Notification (POPIA Section 22)**:
   - If personal information of any person is compromised, we notify the affected parties and the Information Regulator promptly in writing, explaining the breach and the protective steps taken.
