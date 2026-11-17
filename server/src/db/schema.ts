import { sql } from 'drizzle-orm';
import { check, date, index, pgTable, smallint, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/**
 * One row per user per day. The entry text and the highlighted phrases (which quote the text) are
 * stored encrypted. Scores stay plain so charts and averages can be queried in SQL.
 * `user_id` is the Supabase auth user id (auth.users.id).
 */
export const entries = pgTable(
  'entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    entryDate: date('entry_date', { mode: 'string' }).notNull(),
    textEnc: text('text_enc').notNull(),
    highlightsEnc: text('highlights_enc').notNull(),
    // Encrypted JSON { themes, crisis }. Null on entries written before themes existed.
    metaEnc: text('meta_enc'),
    depression: smallint('depression').notNull(),
    anxiety: smallint('anxiety').notNull(),
    meaning: smallint('meaning').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('entries_user_date_idx').on(t.userId, t.entryDate),
    check(
      'entries_scores_range',
      sql`${t.depression} between 0 and 100 and ${t.anxiety} between 0 and 100 and ${t.meaning} between 0 and 100`,
    ),
  ],
);

export type EntryRow = typeof entries.$inferSelect;

/**
 * One data key per user. Entries written from now on are encrypted with it, so one user's key opens only that user's
 * entries. The key itself is stored wrapped (encrypted) by the server's master key, bound to this user id, so a copy
 * of this table is useless without the master key. Deleting a row erases that user's data for good, backups included.
 */
export const userKeys = pgTable('user_keys', {
  userId: uuid('user_id').primaryKey(),
  wrappedKey: text('wrapped_key').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type UserKeyRow = typeof userKeys.$inferSelect;

/**
 * A letter to the writer's future self: written now, readable from `unlock_on`. The text is encrypted like an entry
 * (bound to the user and the letter's id) and the server never returns it before the unlock date.
 */
export const letters = pgTable(
  'letters',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    textEnc: text('text_enc').notNull(),
    // The writer's own calendar day when it was written, and the day it opens (neither depends on the server's timezone).
    writtenOn: date('written_on', { mode: 'string' }).notNull(),
    unlockOn: date('unlock_on', { mode: 'string' }).notNull(),
    // When the writer first opened it after it unlocked. Null until then.
    openedAt: timestamp('opened_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('letters_user_idx').on(t.userId, t.unlockOn)],
);

export type LetterRow = typeof letters.$inferSelect;

/**
 * Things a person wants to do: daily habits that repeat, or one-offs for a single day. The title is encrypted like an
 * entry. `theme` is a broad category (outdoors, friends...) used to suggest things and to group them. A running
 * experiment is just a start day and a length on the task.
 */
export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    titleEnc: text('title_enc').notNull(),
    kind: text('kind').notNull(), // 'daily' repeats every day; 'once' belongs to one day
    theme: text('theme'),
    createdOn: date('created_on', { mode: 'string' }).notNull(),
    onDate: date('on_date', { mode: 'string' }),
    expStart: date('exp_start', { mode: 'string' }),
    expDays: smallint('exp_days'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('tasks_user_idx').on(t.userId), check('tasks_kind', sql`${t.kind} in ('daily', 'once')`)],
);

/** A tick: this task was done on this day, optionally with how it felt (1 rough to 5 great). */
export const taskMarks = pgTable(
  'task_marks',
  {
    taskId: uuid('task_id').notNull(),
    userId: uuid('user_id').notNull(),
    day: date('day', { mode: 'string' }).notNull(),
    mood: smallint('mood'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('task_marks_task_day_idx').on(t.taskId, t.day),
    index('task_marks_user_idx').on(t.userId, t.day),
    check('task_marks_mood', sql`${t.mood} is null or ${t.mood} between 1 and 5`),
  ],
);

export type TaskRow = typeof tasks.$inferSelect;
export type TaskMarkRow = typeof taskMarks.$inferSelect;
