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
      isActive: true,
      urlId,
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
  args: { ballotId: v.id("ballots") },
  handler: async (ctx, args) => {
    const ballot = await ctx.db.get(args.ballotId);
    if (!ballot) return null;

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_ballot", (q) => q.eq("ballotId", args.ballotId))
      .collect();

    const results = calculateRCVResults(votes, ballot.choices);
    
    return {
      ballot,
      totalVotes: votes.length,
      results,
    };
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
