import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { VotingInterface } from "./VotingInterface";
import { ResultsView } from "./ResultsView";

export function BallotView() {
  const { urlId } = useParams<{ urlId: string }>();
  const [activeTab, setActiveTab] = useState<"vote" | "results">("vote");
  const [voterId, setVoterId] = useState<string>("");

  const ballot = useQuery(api.ballots.getBallotByUrl, urlId ? { urlId } : "skip");
  const currentUser = useQuery(api.auth.loggedInUser);
  const results = useQuery(api.ballots.getBallotResults,
    ballot ? { ballotId: ballot._id } : "skip"
  );

  const updateVisibility = useMutation(api.ballots.updateResultVisibility);

  // Check if current user is the creator
  const isCreator = currentUser && ballot && ballot.creatorId === currentUser._id;

  // Generate a unique voter ID for anonymous voting
  useEffect(() => {
    let storedVoterId = localStorage.getItem(`voter_${urlId}`);
    if (!storedVoterId) {
      storedVoterId = `voter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(`voter_${urlId}`, storedVoterId);
    }
    setVoterId(storedVoterId);
  }, [urlId]);

  // Handle visibility updates
  const handleVisibilityUpdate = async (settings: any) => {
    if (!ballot) return;

    try {
      await updateVisibility({
        ballotId: ballot._id,
        ...settings
      });
      toast.success("Visibility settings updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update visibility settings");
    }
  };

  if (ballot === undefined) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (ballot === null) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Ballot Not Found</h1>
        <p className="text-gray-600">The ballot you're looking for doesn't exist or has been removed.</p>
      </div>
    );
  }

  const timeRemaining = ballot.timeLimit ? ballot.timeLimit - Date.now() : null;
  const isExpired = timeRemaining !== null && timeRemaining <= 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{ballot.title}</h1>
        {ballot.description && (
          <p className="text-gray-600 mb-4">{ballot.description}</p>
        )}
        
        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
          <span>Created {new Date(ballot.createdAt).toLocaleDateString()}</span>
          {results && <span>{results.totalVotes} votes</span>}
          {ballot.timeLimit && (
            <span className={isExpired ? "text-red-600" : ""}>
              {isExpired ? "Voting ended" : `Ends ${new Date(ballot.timeLimit).toLocaleString()}`}
            </span>
          )}
          {ballot.voteLimit && (
            <span>Max {ballot.voteLimit} votes</span>
          )}
          <span className={`px-2 py-1 rounded-full text-xs ${
            ballot.isActive && !isExpired ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}>
            {ballot.isActive && !isExpired ? "Active" : "Closed"}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab("vote")}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === "vote"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Vote
            </button>
            <button
              onClick={() => setActiveTab("results")}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === "results"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Results
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "vote" ? (
            <VotingInterface 
              ballot={ballot} 
              voterId={voterId}
              onVoteSubmitted={() => setActiveTab("results")}
            />
          ) : (
            <ResultsView
              results={results}
              isCreator={isCreator}
              onUpdateVisibility={isCreator ? handleVisibilityUpdate : undefined}
            />
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Share this ballot</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={window.location.href}
            readOnly
            className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded text-sm"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success("Link copied to clipboard!");
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}
