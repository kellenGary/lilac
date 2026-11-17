import { and, count, desc, eq, isNull } from 'drizzle-orm';

import type { Db } from './client';
import { letters, type LetterRow } from './schema';

export async function listLetters(db: Db, userId: string): Promise<LetterRow[]> {
  return db.select().from(letters).where(eq(letters.userId, userId)).orderBy(desc(letters.unlockOn));
}

export async function getLetter(db: Db, userId: string, id: string): Promise<LetterRow | undefined> {
  const [row] = await db
    .select()
    .from(letters)
    .where(and(eq(letters.userId, userId), eq(letters.id, id)))
    .limit(1);
  return row;
}

export async function countLetters(db: Db, userId: string): Promise<number> {
  const [row] = await db.select({ n: count() }).from(letters).where(eq(letters.userId, userId));
  return row?.n ?? 0;
}

export async function insertLetter(
  db: Db,
  w: { id: string; userId: string; textEnc: string; writtenOn: string; unlockOn: string; createdAt: Date },
): Promise<LetterRow> {
  const [row] = await db.insert(letters).values(w).returning();
  return row;
}

/** Marks a letter as opened the first time; later calls leave the original time alone. */
export async function markOpened(db: Db, userId: string, id: string): Promise<void> {
  await db
    .update(letters)
    .set({ openedAt: new Date() })
    .where(and(eq(letters.userId, userId), eq(letters.id, id), isNull(letters.openedAt)));
}

export async function deleteLetter(db: Db, userId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(letters)
    .where(and(eq(letters.userId, userId), eq(letters.id, id)))
    .returning({ id: letters.id });
  return rows.length > 0;
}

export async function deleteAllLetters(db: Db, userId: string): Promise<number> {
  const rows = await db.delete(letters).where(eq(letters.userId, userId)).returning({ id: letters.id });
  return rows.length;
}
