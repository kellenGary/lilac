import { sql } from 'drizzle-orm';
import { check, date, pgTable, smallint, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

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
