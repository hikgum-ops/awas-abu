import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { SCOPE_BASES } from "../src/lib/awasabu/impact-scope";

export const statuses = sqliteTable(
  "aa_status",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    areaCode: text("area_code").notNull(),
    level: text("level", { enum: ["AMAN", "WASPADA", "AWAS_ABU", "BAHAYA"] }).notNull(),
    headline: text("headline").notNull(),
    actions: text("actions", { mode: "json" }).$type<string[]>().notNull(),
    sourceName: text("source_name").notNull(),
    sourceUrl: text("source_url").notNull(),
    observedAt: text("observed_at").notNull(),
    expiresAt: text("expires_at").notNull(),
    scopeBasis: text("scope_basis", { enum: SCOPE_BASES })
      .notNull()
      .default("operator_selected"),
    operator: text("operator").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_aa_status_area_observed").on(
      table.areaCode,
      table.observedAt,
      table.id,
    ),
  ],
);

export const subscribers = sqliteTable("aa_subscriber", {
  phone: text("phone").primaryKey(),
  areaCode: text("area_code"),
  active: integer("active", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const inbound = sqliteTable(
  "aa_inbound",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    phone: text("phone").notNull(),
    intent: text("intent").notNull(),
    areaCode: text("area_code"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_aa_inbound_phone_created").on(table.phone, table.createdAt)],
);
