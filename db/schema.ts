import { sql } from "drizzle-orm";
import { text, sqliteTable, uniqueIndex } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  clientName: text("client_name").notNull(),
  websiteUrl: text("website_url").notNull().default(""),
  businessType: text("business_type").notNull().default("B2B"),
  siteMode: text("site_mode").notNull().default("A"),
  status: text("status").notNull().default("資料準備中"),
  reportName: text("report_name").notNull().default(""),
  assessmentDate: text("assessment_date").notNull().default(""),
  dashboardData: text("dashboard_data").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  archivedAt: text("archived_at"),
});

export const collaboratorAccounts = sqliteTable("collaborator_accounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({ emailUnique: uniqueIndex("idx_collaborator_accounts_email").on(table.email) }));

export const projectViewers = sqliteTable("project_viewers", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  accountId: text("account_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({ projectAccountUnique: uniqueIndex("idx_project_viewers_project_account").on(table.projectId, table.accountId) }));

export const authSessions = sqliteTable("auth_sessions", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull(),
  accountId: text("account_id").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({ tokenUnique: uniqueIndex("idx_auth_sessions_token_hash").on(table.tokenHash) }));
