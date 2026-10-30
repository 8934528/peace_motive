import { randomBytes, randomInt } from "node:crypto";

const CODE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITE_CODE_CHARACTERS = "abcdefghijklmnopqrstuvwxyz0123456789";

export function generateGameCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_CHARACTERS[randomInt(CODE_CHARACTERS.length)];
  }
  return code;
}

export function generatePlayerInviteCode(): string {
  const chunks: string[] = [];
  for (let g = 0; g < 6; g++) {
    let chunk = "";
    for (let i = 0; i < 4; i++) {
      chunk += INVITE_CODE_CHARACTERS[randomInt(INVITE_CODE_CHARACTERS.length)];
    }
    chunks.push(chunk);
  }
  return chunks.join("-");
}

export function generateSessionToken(): string {
  return randomBytes(24).toString("hex");
}

export function shuffleArray<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}
