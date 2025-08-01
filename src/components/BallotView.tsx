import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { VotingInterface } from "./VotingInterface";
import { ResultsView } from "./ResultsView";
import { useAuthActions } from "@convex-dev/auth/react";
import { ClaimBallotAuth } from "./ClaimBallotAuth";

export function BallotView() {
  const { urlId } = useParams<{ urlId: string }>();
  const [activeTab, setActiveTab] = useState<"vote" | "results">("vote");
  const [voterId, setVoterId] = useState<string>("");
  const navigate = useNavigate();
  const [showClaimAuth, setShowClaimAuth] = useState(false);

  const { isAuthenticated } = useConvexAuth();
  const ballot = useQuery(api.ballots.getBallotByUrl, urlId ? { urlId } : "skip");
  const currentUser = useQuery(api.auth.loggedInUser);
  const results = useQuery(api.ballots.getBallotResults,
    ballot ? { ballotId: ballot._id } : "skip"
  );
  const activateBallot = useMutation(api.ballots.activateBallot);

  const updateVisibility = useMutation(api.ballots.updateResultVisibility);

  // Check if current user is the creator
  const isCreator = !!(currentUser && ballot && ballot.creatorId === currentUser._id);

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

  const handleActivateBallot = async () => {
    if (!ballot) return;

    try {
      await activateBallot({ ballotId: ballot._id });
      toast.success("Ballot is now live!");
    } catch (error: any) {
      toast.error(error.message || "Failed to activate ballot");
    }
  };

  // Check if user has voted and show claim auth for anonymous ballot creators
  useEffect(() => {
    if (ballot && voterId && !isAuthenticated) {
      // Check if this anonymous user created the ballot (stored in localStorage)
      const createdBallots = JSON.parse(localStorage.getItem('createdBallots') || '[]');
      const isCreator = createdBallots.includes(ballot.urlId);

      // Check if user has voted on this ballot
      const votedBallots = JSON.parse(localStorage.getItem('votedBallots') || '[]');
      const hasVotedOnBallot = votedBallots.includes(ballot.urlId);

      // Show claim auth if user created ballot or voted, but only once per session
      const sessionKey = `claimPrompt_${ballot.urlId}`;
      const hasSeenPrompt = sessionStorage.getItem(sessionKey);

      if ((isCreator || hasVotedOnBallot) && !hasSeenPrompt) {
        setShowClaimAuth(true);
      }
    }
  }, [ballot, voterId, isAuthenticated]);

  const handleClaimSuccess = () => {
    setShowClaimAuth(false);
    // Mark that user has seen the prompt for this session
    if (ballot) {
      sessionStorage.setItem(`claimPrompt_${ballot.urlId}`, 'true');
    }
  };

  const handleClaimCancel = () => {
    setShowClaimAuth(false);
    // Mark that user has seen the prompt for this session
    if (ballot) {
      sessionStorage.setItem(`claimPrompt_${ballot.urlId}`, 'true');
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
            ballot.isActive && !isExpired ? "bg-green-100 text-green-800" :
            ballot.isActive ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
          }`}>
            {ballot.isActive && !isExpired ? "Active" :
             ballot.isActive ? "Closed" : "Draft"}
          </span>
        </div>

        {/* Creator actions for inactive ballots */}
        {!ballot.isActive && isCreator && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Ballot Draft</h3>
            <p className="text-blue-700 text-sm mb-3">
              This ballot is currently a draft. You can edit it or make it live for voting.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/edit/${ballot.urlId}`)}
                className="px-4 py-2 bg-white text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
              >
                Edit Ballot
              </button>
              <button
                onClick={handleActivateBallot}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Make Live
              </button>
            </div>
          </div>
        )}

        {/* Message for non-creators viewing inactive ballots */}
        {!ballot.isActive && !isCreator && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">Ballot Not Yet Active</h3>
            <p className="text-yellow-700 text-sm">
              This ballot is still being prepared by its creator and is not yet open for voting.
            </p>
          </div>
        )}
      </div>

      {/* Show claim ballot auth for anonymous users */}
      {showClaimAuth && !isAuthenticated && (
        <ClaimBallotAuth
          ballotId={ballot._id}
          anonymousVoterId={voterId}
          onSuccess={handleClaimSuccess}
          onCancel={handleClaimCancel}
        />
      )}

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
              void navigator.clipboard.writeText(window.location.href).then(() => {
                toast.success("Link copied to clipboard!");
              });
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
