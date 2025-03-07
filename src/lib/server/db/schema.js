import { pgTable, serial, text, integer, timestamp, primaryKey, numeric } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull()
});

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
});

// Models Table
export const model = pgTable('model', {
    id: serial('id').primaryKey(),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    displayDescription: text('displayDescription'),
    hearts: integer('hearts').notNull().default(0),
    downloadCount: integer('download_count').default(0),
    createdAt: timestamp('created_at').defaultNow(),
});

// Datasets Table
export const dataset = pgTable('dataset', {
    id: serial('serial').primaryKey(),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    displayDescription: text('displayDescription'),
    description: text('description'),
    hearts: integer('hearts').notNull().default(0),
    downloadCount: integer('download_count').default(0),
    createdAt: timestamp('created_at').defaultNow(),
});

// Tags Table
export const tag = pgTable('tag', {
    id: serial('id').primaryKey(),
    name: text('name').notNull().unique(),
});

export const modelTag = pgTable('model_tag', {
    modelId: integer('model_id')
        .references(() => model.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
        .references(() => tag.id, { onDelete: 'cascade' }),
}, (table) => ({
    primaryKey: primaryKey({ columns: [table.modelId, table.tagId] }),
}));

// DatasetTags Table (Many-to-Many)
export const datasetTag = pgTable('dataset_tag', {
    datasetId: integer('dataset_id')
        .references(() => dataset.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
        .references(() => tag.id, { onDelete: 'cascade' }),
}, (table) => ({
    primaryKey: primaryKey({ columns: [table.datasetId, table.tagId] }),
}));