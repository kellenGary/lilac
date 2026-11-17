import type { TaskMarkRow, TaskRow } from './db/schema';
import type { UserCrypto } from './vault';

/** Same shapes as the app's `Task` and `TaskMark` (src/lib/tasks.ts). */
export type Task = {
  id: string;
  title: string;
  kind: 'daily' | 'once';
  theme: string | null;
  createdOn: string;
  /** The one day a "once" task belongs to. */
  onDate: string | null;
  experiment: { start: string; days: number } | null;
};
export type TaskMark = { taskId: string; day: string; mood: number | null };

const aad = (userId: string, id: string) => `${userId}:task:${id}`;

export const sealTitle = (userId: string, id: string, title: string, crypto: UserCrypto) =>
  crypto.seal(title, aad(userId, id));

export function viewTask(row: TaskRow, crypto: UserCrypto): Task {
  return {
    id: row.id,
    title: crypto.open(row.titleEnc, aad(row.userId, row.id)),
    kind: row.kind as 'daily' | 'once',
    theme: row.theme,
    createdOn: row.createdOn,
    onDate: row.onDate,
    experiment: row.expStart && row.expDays ? { start: row.expStart, days: row.expDays } : null,
  };
}

export const viewMark = (row: TaskMarkRow): TaskMark => ({ taskId: row.taskId, day: row.day, mood: row.mood });
