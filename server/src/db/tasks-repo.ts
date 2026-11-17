import { and, count, desc, eq } from 'drizzle-orm';

import type { Db } from './client';
import { taskMarks, tasks, type TaskMarkRow, type TaskRow } from './schema';

export async function listTasks(db: Db, userId: string): Promise<TaskRow[]> {
  return db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(tasks.createdAt);
}

/** Every tick, newest first, capped so one account can't make the list unbounded. */
export async function listMarks(db: Db, userId: string, limit = 6000): Promise<TaskMarkRow[]> {
  return db.select().from(taskMarks).where(eq(taskMarks.userId, userId)).orderBy(desc(taskMarks.day)).limit(limit);
}

export async function getTask(db: Db, userId: string, id: string): Promise<TaskRow | undefined> {
  const [row] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.id, id)))
    .limit(1);
  return row;
}

export async function countTasks(db: Db, userId: string): Promise<number> {
  const [row] = await db.select({ n: count() }).from(tasks).where(eq(tasks.userId, userId));
  return row?.n ?? 0;
}

export async function insertTask(
  db: Db,
  w: { id: string; userId: string; titleEnc: string; kind: 'daily' | 'once'; theme: string | null; createdOn: string; onDate: string | null },
): Promise<TaskRow> {
  const [row] = await db.insert(tasks).values(w).returning();
  return row;
}

export async function setExperiment(db: Db, userId: string, id: string, start: string | null, days: number | null) {
  await db
    .update(tasks)
    .set({ expStart: start, expDays: days })
    .where(and(eq(tasks.userId, userId), eq(tasks.id, id)));
}

/** Deletes the task and all its ticks. */
export async function deleteTask(db: Db, userId: string, id: string): Promise<boolean> {
  await db.delete(taskMarks).where(and(eq(taskMarks.userId, userId), eq(taskMarks.taskId, id)));
  const rows = await db
    .delete(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.id, id)))
    .returning({ id: tasks.id });
  return rows.length > 0;
}

export async function deleteAllTasks(db: Db, userId: string): Promise<void> {
  await db.delete(taskMarks).where(eq(taskMarks.userId, userId));
  await db.delete(tasks).where(eq(tasks.userId, userId));
}

/** Ticks a task on a day (or updates how it felt). Safe to repeat. */
export async function upsertMark(db: Db, w: { taskId: string; userId: string; day: string; mood: number | null }) {
  await db
    .insert(taskMarks)
    .values(w)
    .onConflictDoUpdate({ target: [taskMarks.taskId, taskMarks.day], set: { mood: w.mood } });
}

export async function deleteMark(db: Db, userId: string, taskId: string, day: string): Promise<void> {
  await db
    .delete(taskMarks)
    .where(and(eq(taskMarks.userId, userId), eq(taskMarks.taskId, taskId), eq(taskMarks.day, day)));
}
