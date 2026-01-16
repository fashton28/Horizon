import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, index, integer } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const interviewSession = pgTable(
  "interview_session",
  {
    id: text("id").primaryKey(),
    callId: text("call_id").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name"),
    interviewType: text("interview_type").notNull(),
    language: text("language").notNull(),
    voice: text("voice").notNull(),
    status: text("status").notNull().default("in_progress"),
    summaryStatus: text("summary_status").default("pending"),
    fullTranscript: text("full_transcript"),
    startedAt: timestamp("started_at").notNull(),
    endedAt: timestamp("ended_at"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("interview_session_userId_idx").on(table.userId)],
);

export const sessionTranscript = pgTable(
  "session_transcript",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => interviewSession.id, { onDelete: "cascade" }),
    speaker: text("speaker").notNull(),
    text: text("text").notNull(),
    sequenceNumber: integer("sequence_number").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("session_transcript_sessionId_idx").on(table.sessionId),
    index("session_transcript_sequence_idx").on(table.sessionId, table.sequenceNumber),
  ],
);

export const sessionSummary = pgTable(
  "session_summary",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .unique()
      .references(() => interviewSession.id, { onDelete: "cascade" }),
    overallSummary: text("overall_summary").notNull(),
    strengths: text("strengths").notNull(),
    areasForImprovement: text("areas_for_improvement").notNull(),
    actionableNextSteps: text("actionable_next_steps").notNull(),
    overallScore: integer("overall_score"),
    modelUsed: text("model_used").default("gemini-1.5-flash"),
    generatedAt: timestamp("generated_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("session_summary_sessionId_idx").on(table.sessionId)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  interviewSessions: many(interviewSession),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const interviewSessionRelations = relations(interviewSession, ({ one, many }) => ({
  user: one(user, {
    fields: [interviewSession.userId],
    references: [user.id],
  }),
  transcripts: many(sessionTranscript),
  summary: one(sessionSummary),
}));

export const sessionTranscriptRelations = relations(sessionTranscript, ({ one }) => ({
  session: one(interviewSession, {
    fields: [sessionTranscript.sessionId],
    references: [interviewSession.id],
  }),
}));

export const sessionSummaryRelations = relations(sessionSummary, ({ one }) => ({
  session: one(interviewSession, {
    fields: [sessionSummary.sessionId],
    references: [interviewSession.id],
  }),
}));
