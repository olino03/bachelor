import { pgTable, serial, text, integer, timestamp, primaryKey } from 'drizzle-orm/pg-core';

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
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    filePath: text('file_path').notNull(),
    hearts: integer('hearts').notNull().default(0),
    downloadCount: integer('download_count').default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Datasets Table
export const dataset = pgTable('dataset', {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    displayDescription: text('displayDescription'),
    description: text('description'),
    filePath: text('file_path').notNull(),
    hearts: integer('hearts').notNull().default(0),
    downloadCount: integer('download_count').default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Tags Table
export const tag = pgTable('tag', {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(),
});
// ModelTags Table (Many-to-Many between Models and Tags)
export const modelTag = pgTable('model_tag', {
    modelId: text('model_id').references(() => model.id, { onDelete: 'cascade' }),
    tagId: text('tag_id').references(() => tag.id, { onDelete: 'cascade' }),
}, (table) => ({
    primaryKey: primaryKey({ columns: [table.modelId, table.tagId] }),
}));

// DatasetTags Table (Many-to-Many between Datasets and Tags)
export const datasetTags = pgTable('dataset_tag', {
    datasetId: text('dataset_id').references(() => dataset.id, { onDelete: 'cascade' }),
    tagId: text('tag_id').references(() => tag.id, { onDelete: 'cascade' }),
}, (table) => ({
    primaryKey: primaryKey({ columns: [table.datasetId, table.tagId] }),
}));
