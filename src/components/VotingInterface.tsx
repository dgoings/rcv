import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface VotingInterfaceProps {
  ballot: {
    _id: Id<"ballots">;
    urlId: string;
    choices: string[];
    isActive: boolean;
    timeLimit?: number;
  };
  voterId: string;
  onVoteSubmitted: () => void;
}

export function VotingInterface({ ballot, voterId, onVoteSubmitted }: VotingInterfaceProps) {
  const [rankings, setRankings] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitVote = useMutation(api.ballots.submitVote);
  const voteStatus = useQuery(api.ballots.checkUserVoted,
    voterId ? { ballotId: ballot._id, voterId } : "skip"
  );

  const isExpired = ballot.timeLimit ? Date.now() > ballot.timeLimit : false;
  const hasVoted = voteStatus?.hasVoted ?? false;
  const canVote = ballot.isActive && !isExpired && !hasVoted;

  // Show loading state while checking vote status
  if (voteStatus === undefined) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const setRank = (choiceIndex: number, rank: number) => {
    const newRankings = { ...rankings };
    
    // Remove this rank from any other choice
    Object.keys(newRankings).forEach(key => {
      if (newRankings[parseInt(key)] === rank) {
        delete newRankings[parseInt(key)];
      }
    });
    
    // Set the new rank
    if (rank > 0) {
      newRankings[choiceIndex] = rank;
    } else {
      delete newRankings[choiceIndex];
    }
    
    setRankings(newRankings);
  };

  const getRankForChoice = (choiceIndex: number) => {
    return rankings[choiceIndex] || 0;
  };

  const handleSubmit = () => {
    const rankedChoices = Object.entries(rankings);

    if (rankedChoices.length === 0) {
      toast.error("Please rank at least one choice");
      return;
    }

    setIsSubmitting(true);

    void submitVote({
      ballotId: ballot._id,
      rankings: rankedChoices.map(([choiceIndex, rank]) => ({
        choiceIndex: parseInt(choiceIndex),
        rank,
      })),
      voterId,
    }).then(() => {
      toast.success("Vote submitted successfully!");

      // Track that this user voted on this ballot (for anonymous users)
      const votedBallots = JSON.parse(localStorage.getItem('votedBallots') || '[]');
      if (!votedBallots.includes(ballot.urlId)) {
        votedBallots.push(ballot.urlId);
        localStorage.setItem('votedBallots', JSON.stringify(votedBallots));
      }

      onVoteSubmitted();
    }).catch((error: any) => {
      toast.error(error.message || "Failed to submit vote");
    }).finally(() => {
      setIsSubmitting(false);
    });
  };

  if (!canVote) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 mb-4">
          {hasVoted
            ? "You have already voted on this ballot"
            : isExpired
            ? "Voting has ended"
            : "This ballot is closed"
          }
          {!ballot.isActive ? "This ballot is not yet active" :
           isExpired ? "Voting has ended" : "This ballot is closed"}
        </div>
        <p className="text-sm text-gray-400">
          {hasVoted
            ? "Thank you for participating! You can view the results in the Results tab."
            : "You can still view the results in the Results tab"
          }
          {!ballot.isActive ? "The creator needs to make this ballot live before voting can begin" :
           "You can still view the results in the Results tab"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Rank Your Choices</h2>
        <p className="text-gray-600">
          Click the numbers to rank choices in order of preference (1 = most preferred)
        </p>
      </div>

      <div className="space-y-3">
        {ballot.choices.map((choice, index) => (
          <div key={index} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300">
            <div className="flex-1">
              <span className="text-gray-900">{choice}</span>
            </div>
            
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(rank => (
                <button
                  key={rank}
                  onClick={() => setRank(index, rank)}
                  disabled={rank > ballot.choices.length}
                  className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                    getRankForChoice(index) === rank
                      ? "bg-blue-600 text-white"
                      : rank <= ballot.choices.length
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "bg-gray-50 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {rank}
                </button>
              ))}
              <button
                onClick={() => setRank(index, 0)}
                className="ml-2 px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                title="Clear ranking"
              >
                Clear
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center pt-6">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || Object.keys(rankings).length === 0}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Submitting..." : "Submit Vote"}
        </button>
      </div>

      {Object.keys(rankings).length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Your Rankings:</h3>
          <div className="space-y-1">
            {Object.entries(rankings)
              .sort(([, a], [, b]) => a - b)
              .map(([choiceIndex, rank]) => (
                <div key={choiceIndex} className="text-sm text-gray-600">
                  {rank}. {ballot.choices[parseInt(choiceIndex)]}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
