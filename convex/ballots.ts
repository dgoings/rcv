import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Generate a unique URL ID for ballots
function generateUrlId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Calculate ranked choice voting results
function calculateRCVResults(votes: any[], choices: string[]) {
  if (votes.length === 0) return { rounds: [], winner: null };

  const rounds = [];
  let remainingChoices = choices.map((_, index) => index);
  let currentVotes = votes.map(vote => ({
    ...vote,
    rankings: vote.rankings.sort((a: any, b: any) => a.rank - b.rank)
  }));

  while (remainingChoices.length > 1) {
    // Count first-choice votes for remaining choices
    const voteCounts: Record<number, number> = {};
    remainingChoices.forEach(choiceIndex => {
      voteCounts[choiceIndex] = 0;
    });

    currentVotes.forEach(vote => {
      // Find the highest-ranked choice that's still in the running
      const validRanking = vote.rankings.find((r: any) => 
        remainingChoices.includes(r.choiceIndex)
      );
      if (validRanking) {
        voteCounts[validRanking.choiceIndex]++;
      }
    });

    const totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
    const roundResults = remainingChoices.map(choiceIndex => ({
      choiceIndex,
      choice: choices[choiceIndex],
      votes: voteCounts[choiceIndex],
      percentage: totalVotes > 0 ? (voteCounts[choiceIndex] / totalVotes) * 100 : 0,
    }));

    rounds.push({
      round: rounds.length + 1,
      results: roundResults,
      eliminated: null as string | null,
    });

    // Check if someone has majority
    const maxVotes = Math.max(...Object.values(voteCounts));
    if (maxVotes > totalVotes / 2) {
      const winnerIndex = remainingChoices.find(i => voteCounts[i] === maxVotes);
      return {
        rounds,
        winner: winnerIndex !== undefined ? choices[winnerIndex] : null,
      };
    }

    // Eliminate the choice with the fewest votes
    const minVotes = Math.min(...Object.values(voteCounts));
    const eliminatedIndex = remainingChoices.find(i => voteCounts[i] === minVotes);
    
    if (eliminatedIndex !== undefined) {
      remainingChoices = remainingChoices.filter(i => i !== eliminatedIndex);
      rounds[rounds.length - 1].eliminated = choices[eliminatedIndex];
    }
  }

  return {
    rounds,
    winner: remainingChoices.length === 1 ? choices[remainingChoices[0]] : null,
  };
}

export const createBallot = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    choices: v.array(v.string()),
    durationType: v.union(v.literal("time"), v.literal("count"), v.literal("manual")),
    timeLimit: v.optional(v.number()),
    voteLimit: v.optional(v.number()),
    // Result visibility controls
    resultVisibility: v.optional(v.union(
      v.literal("live"),
      v.literal("after_voting"),
      v.literal("manual"),
      v.literal("never")
    )),
    showPartialResults: v.optional(v.boolean()),
    hideResultsUntilClosed: v.optional(v.boolean()),
    resultsVisibleToPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const urlId = generateUrlId();

    const ballotId = await ctx.db.insert("ballots", {
      title: args.title,
      description: args.description,
      choices: args.choices,
      creatorId: userId || undefined,
      createdAt: Date.now(),
      durationType: args.durationType,
      timeLimit: args.timeLimit,
      voteLimit: args.voteLimit,
      isActive: false, // Start as inactive/draft
      urlId,
      // Result visibility settings with defaults
      resultVisibility: args.resultVisibility || "live",
      showPartialResults: args.showPartialResults ?? true,
      hideResultsUntilClosed: args.hideResultsUntilClosed ?? false,
      resultsVisibleToPublic: args.resultsVisibleToPublic ?? true,
    });

    // Track user activity if logged in
    if (userId) {
      await ctx.db.insert("userBallotActivity", {
        userId,
        ballotId,
        activityType: "created",
        timestamp: Date.now(),
      });
    }

    return { ballotId, urlId };
  },
});

export const getBallotByUrl = query({
  args: { urlId: v.string() },
  handler: async (ctx, args) => {
    const ballot = await ctx.db
      .query("ballots")
      .withIndex("by_url_id", (q) => q.eq("urlId", args.urlId))
      .unique();
    
    if (!ballot) return null;

    // Check if ballot should be automatically closed
    let isActive = ballot.isActive;
    if (ballot.isActive) {
      if (ballot.durationType === "time" && ballot.timeLimit && Date.now() > ballot.timeLimit) {
        isActive = false;
      } else if (ballot.durationType === "count" && ballot.voteLimit) {
        const voteCount = await ctx.db
          .query("votes")
          .withIndex("by_ballot", (q) => q.eq("ballotId", ballot._id))
          .collect();
        if (voteCount.length >= ballot.voteLimit) {
          isActive = false;
        }
      }
    }

    return { ...ballot, isActive };
  },
});

export const submitVote = mutation({
  args: {
    ballotId: v.id("ballots"),
    rankings: v.array(v.object({
      choiceIndex: v.number(),
      rank: v.number(),
    })),
    voterId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ballot = await ctx.db.get(args.ballotId);
    if (!ballot || !ballot.isActive) {
      throw new Error("Ballot is not active");
    }

    // Check if user already voted
    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_voter", (q) => q.eq("voterId", args.voterId))
      .filter((q) => q.eq(q.field("ballotId"), args.ballotId))
      .first();

    if (existingVote) {
      throw new Error("You have already voted on this ballot");
    }

    await ctx.db.insert("votes", {
      ballotId: args.ballotId,
      voterId: args.voterId,
      rankings: args.rankings,
      submittedAt: Date.now(),
    });

    // Track user activity if logged in
    const userId = await getAuthUserId(ctx);
    if (userId) {
      await ctx.db.insert("userBallotActivity", {
        userId,
        ballotId: args.ballotId,
        activityType: "voted",
        timestamp: Date.now(),
      });
    }

    return { success: true };
  },
});

export const getBallotResults = query({
  args: {
    ballotId: v.id("ballots"),
    requesterId: v.optional(v.string()) // To identify if requester is the creator
  },
  handler: async (ctx, args) => {
    const ballot = await ctx.db.get(args.ballotId);
    if (!ballot) return null;

    const userId = await getAuthUserId(ctx);
    const isCreator = userId && ballot.creatorId === userId;

    // Check if results should be visible
    const shouldShowResults = () => {
      // Creator can always see results
      if (isCreator) return true;

      // Check visibility settings
      switch (ballot.resultVisibility) {
        case "never":
          return false;
        case "manual":
          return false; // Only visible when manually enabled (handled separately)
        case "after_voting":
          return !ballot.isActive || (ballot.closedAt !== undefined);
        case "live":
          return ballot.resultsVisibleToPublic;
        default:
          return true;
      }
    };

    // If results should be hidden, return limited info
    if (!shouldShowResults()) {
      return {
        ballot,
        totalVotes: 0,
        results: { rounds: [], winner: null },
        resultsHidden: true,
        hiddenReason: ballot.resultVisibility === "never"
          ? "Results are not visible for this ballot"
          : ballot.resultVisibility === "after_voting"
          ? "Results will be visible after voting ends"
          : "Results are not currently visible"
      };
    }

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_ballot", (q) => q.eq("ballotId", args.ballotId))
      .collect();

    const results = calculateRCVResults(votes, ballot.choices);

    // Filter results based on showPartialResults setting
    const filteredResults = ballot.showPartialResults
      ? results
      : {
          rounds: results.rounds.length > 0 ? [results.rounds[results.rounds.length - 1]] : [],
          winner: results.winner
        };

    return {
      ballot,
      totalVotes: votes.length,
      results: filteredResults,
      resultsHidden: false,
    };
  },
});

export const activateBallot = mutation({
  args: { ballotId: v.id("ballots") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to activate ballot");
    }

    const ballot = await ctx.db.get(args.ballotId);
    if (!ballot || ballot.creatorId !== userId) {
      throw new Error("Not authorized to activate this ballot");
    }

    if (ballot.isActive) {
      throw new Error("Ballot is already active");
    }

    await ctx.db.patch(args.ballotId, {
      isActive: true,
    });

    return { success: true };
  },
});

export const updateBallot = mutation({
  args: {
    ballotId: v.id("ballots"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    choices: v.optional(v.array(v.string())),
    durationType: v.optional(v.union(v.literal("time"), v.literal("count"), v.literal("manual"))),
    timeLimit: v.optional(v.number()),
    voteLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to update ballot");
    }

    const ballot = await ctx.db.get(args.ballotId);
    if (!ballot || ballot.creatorId !== userId) {
      throw new Error("Not authorized to update this ballot");
    }

    if (ballot.isActive) {
      throw new Error("Cannot edit an active ballot");
    }

    // Check if there are any votes - if so, don't allow editing
    const voteCount = await ctx.db
      .query("votes")
      .withIndex("by_ballot", (q) => q.eq("ballotId", args.ballotId))
      .collect();

    if (voteCount.length > 0) {
      throw new Error("Cannot edit a ballot that has received votes");
    }

    const updateData: any = {};
    if (args.title !== undefined) updateData.title = args.title;
    if (args.description !== undefined) updateData.description = args.description;
    if (args.choices !== undefined) updateData.choices = args.choices;
    if (args.durationType !== undefined) updateData.durationType = args.durationType;
    if (args.timeLimit !== undefined) updateData.timeLimit = args.timeLimit;
    if (args.voteLimit !== undefined) updateData.voteLimit = args.voteLimit;

    await ctx.db.patch(args.ballotId, updateData);

    return { success: true };
  },
});

export const closeBallot = mutation({
  args: { ballotId: v.id("ballots") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to close ballot");
    }

    const ballot = await ctx.db.get(args.ballotId);
    if (!ballot || ballot.creatorId !== userId) {
      throw new Error("Not authorized to close this ballot");
    }

    await ctx.db.patch(args.ballotId, {
      isActive: false,
      closedAt: Date.now(),
    });

    return { success: true };
  },
});

export const checkUserVoted = query({
  args: {
    ballotId: v.id("ballots"),
    voterId: v.string(),
  },
  handler: async (ctx, args) => {
    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_voter", (q) => q.eq("voterId", args.voterId))
      .filter((q) => q.eq(q.field("ballotId"), args.ballotId))
      .first();

    return { hasVoted: !!existingVote };
  },
});

export const updateResultVisibility = mutation({
  args: {
    ballotId: v.id("ballots"),
    resultVisibility: v.optional(v.union(
      v.literal("live"),
      v.literal("after_voting"),
      v.literal("manual"),
      v.literal("never")
    )),
    showPartialResults: v.optional(v.boolean()),
    hideResultsUntilClosed: v.optional(v.boolean()),
    resultsVisibleToPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to update result visibility");
    }

    const ballot = await ctx.db.get(args.ballotId);
    if (!ballot || ballot.creatorId !== userId) {
      throw new Error("Not authorized to update this ballot");
    }

    const updates: any = {};
    if (args.resultVisibility !== undefined) updates.resultVisibility = args.resultVisibility;
    if (args.showPartialResults !== undefined) updates.showPartialResults = args.showPartialResults;
    if (args.hideResultsUntilClosed !== undefined) updates.hideResultsUntilClosed = args.hideResultsUntilClosed;
    if (args.resultsVisibleToPublic !== undefined) updates.resultsVisibleToPublic = args.resultsVisibleToPublic;

    await ctx.db.patch(args.ballotId, updates);

    return { success: true };
  },
});

// Associate an anonymous ballot with a user account
export const claimBallot = mutation({
  args: {
    ballotId: v.id("ballots"),
    anonymousVoterId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to claim ballot");
    }

    const ballot = await ctx.db.get(args.ballotId);
    if (!ballot) {
      throw new Error("Ballot not found");
    }

    // Only allow claiming if ballot has no creator (anonymous) or if user created it anonymously
    if (ballot.creatorId && ballot.creatorId !== userId) {
      throw new Error("Ballot already belongs to another user");
    }

    // Update ballot to associate with user
    await ctx.db.patch(args.ballotId, {
      creatorId: userId,
    });

    // Add user activity record for creating the ballot
    await ctx.db.insert("userBallotActivity", {
      userId,
      ballotId: args.ballotId,
      activityType: "created",
      timestamp: Date.now(),
    });

    // If anonymousVoterId is provided, also claim any votes made with that ID
    if (args.anonymousVoterId) {
      const anonymousVotes = await ctx.db
        .query("votes")
        .withIndex("by_voter", (q) => q.eq("voterId", args.anonymousVoterId))
        .filter((q) => q.eq(q.field("ballotId"), args.ballotId))
        .collect();

      // Update votes to associate with user ID instead of anonymous voter ID
      for (const vote of anonymousVotes) {
        await ctx.db.patch(vote._id, {
          voterId: userId,
        });
      }

      // Add user activity record for voting if they voted
      if (anonymousVotes.length > 0) {
        await ctx.db.insert("userBallotActivity", {
          userId,
          ballotId: args.ballotId,
          activityType: "voted",
          timestamp: anonymousVotes[0].submittedAt,
        });
      }
    }

    return { success: true };
  },
});

export const getUserBallots = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { created: [], voted: [] };

    const activities = await ctx.db
      .query("userBallotActivity")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const createdBallotIds = activities
      .filter(a => a.activityType === "created")
      .map(a => a.ballotId);

    const votedBallotIds = activities
      .filter(a => a.activityType === "voted")
      .map(a => a.ballotId);

    const createdBallots = await Promise.all(
      createdBallotIds.map(id => ctx.db.get(id))
    );

    const votedBallots = await Promise.all(
      votedBallotIds.map(id => ctx.db.get(id))
    );

    return {
      created: createdBallots.filter(Boolean),
      voted: votedBallots.filter(Boolean),
    };
  },
});

export const deleteBallot = mutation({
  args: { ballotId: v.id("ballots") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to delete ballot");
    }

    const ballot = await ctx.db.get(args.ballotId);
    if (!ballot) {
      throw new Error("Ballot not found");
    }

    if (ballot.creatorId !== userId) {
      throw new Error("Not authorized to delete this ballot");
    }

    if (ballot.isActive) {
      throw new Error("Cannot delete an active ballot. Close it first.");
    }

    // Delete all votes associated with this ballot
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_ballot", (q) => q.eq("ballotId", args.ballotId))
      .collect();

    for (const vote of votes) {
      await ctx.db.delete(vote._id);
    }

    // Delete all user activity records associated with this ballot
    const activities = await ctx.db
      .query("userBallotActivity")
      .withIndex("by_ballot", (q) => q.eq("ballotId", args.ballotId))
      .collect();

    for (const activity of activities) {
      await ctx.db.delete(activity._id);
    }

    // Finally, delete the ballot itself
    await ctx.db.delete(args.ballotId);

    return { success: true };
  },
});
