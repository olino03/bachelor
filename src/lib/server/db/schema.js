import { pgTable, serial, text, integer, timestamp, primaryKey, numeric, boolean } from 'drizzle-orm/pg-core';

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

export const conversation = pgTable('conversation', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    inferenceModelId: integer('inference_model_id').notNull().references(() => inferenceModel.id),
    createdAt: timestamp('created_at').defaultNow(),
});

export const message = pgTable('message', {
    id: serial('id').primaryKey(),
    conversationId: integer('conversation_id').notNull().references(() => conversation.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    content: text('content').notNull(),
    sequence: integer('sequence').notNull(),
    model: text('model'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const inferenceModel = pgTable('inference_model', {
    id: serial('id').primaryKey(),
    ollamaName: text('ollama_name').notNull().unique(),
    name: text('name').notNull(),
    isDefault: boolean('is_default').default(false),
    createdAt: timestamp('created_at').defaultNow(),
});

export const model = pgTable('model', {
    id: serial('id').primaryKey(),
    uploadedBy: text('uploaded_by').references(() => user.username, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    filePath: text('file_path').notNull(),
    displayDescription: text('display_description'),
    hearts: integer('hearts').notNull().default(0),
    downloads: integer('download_count').default(0),
    createdAt: timestamp('created_at').defaultNow(),
});

export const dataset = pgTable('dataset', {
    id: serial('id').primaryKey(),
    uploadedBy: text('uploaded_by').references(() => user.username, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    displayDescription: text('display_description'),
    description: text('description'),
    filePath: text('file_path').notNull(),
    hearts: integer('hearts').notNull().default(0),
    downloads: integer('download_count').default(0),
    createdAt: timestamp('created_at').defaultNow(),
});

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

export const datasetTag = pgTable('dataset_tag', {
    datasetId: integer('dataset_id')
        .references(() => dataset.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
        .references(() => tag.id, { onDelete: 'cascade' }),
}, (table) => ({
    primaryKey: primaryKey({ columns: [table.datasetId, table.tagId] }),
}));