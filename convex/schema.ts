import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  ballots: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    choices: v.array(v.string()),
    creatorId: v.optional(v.id("users")), // Optional for anonymous ballots
    createdAt: v.number(),

    // Voting duration settings
    durationType: v.union(v.literal("time"), v.literal("count"), v.literal("manual")),
    timeLimit: v.optional(v.number()), // timestamp when voting ends
    voteLimit: v.optional(v.number()), // max number of votes

    // Status
    isActive: v.boolean(),
    closedAt: v.optional(v.number()),

    // Result visibility controls
    resultVisibility: v.union(
      v.literal("live"), // Results visible in real-time
      v.literal("after_voting"), // Results visible only after voting ends
      v.literal("manual"), // Results visible only when manually enabled by creator
      v.literal("never") // Results never visible to voters
    ),
    showPartialResults: v.boolean(), // Show intermediate rounds or just final winner
    hideResultsUntilClosed: v.boolean(), // Override for hiding results until ballot is closed
    resultsVisibleToPublic: v.boolean(), // Whether results are visible to public or creator only

    // Unique URL identifier
    urlId: v.string(),
  })
    .index("by_url_id", ["urlId"])
    .index("by_creator", ["creatorId"]),

  votes: defineTable({
    ballotId: v.id("ballots"),
    voterId: v.optional(v.string()), // Can be anonymous (IP-based) or user ID
    rankings: v.array(v.object({
      choiceIndex: v.number(),
      rank: v.number(),
    })),
    submittedAt: v.number(),
  })
    .index("by_ballot", ["ballotId"])
    .index("by_voter", ["voterId"]),

  userBallotActivity: defineTable({
    userId: v.id("users"),
    ballotId: v.id("ballots"),
    activityType: v.union(v.literal("created"), v.literal("voted")),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_ballot", ["ballotId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
