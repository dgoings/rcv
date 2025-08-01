import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

export function EditBallot() {
  const { urlId } = useParams<{ urlId: string }>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [choices, setChoices] = useState(["", ""]);
  const [durationType, setDurationType] = useState<"time" | "count" | "manual">("manual");
  const [timeLimit, setTimeLimit] = useState("");
  const [voteLimit, setVoteLimit] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ballot = useQuery(api.ballots.getBallotByUrl, urlId ? { urlId } : "skip");
  const updateBallot = useMutation(api.ballots.updateBallot);
  const navigate = useNavigate();

  // Populate form with existing ballot data
  useEffect(() => {
    if (ballot) {
      setTitle(ballot.title);
      setDescription(ballot.description || "");
      setChoices(ballot.choices.length >= 2 ? ballot.choices : [...ballot.choices, "", ""]);
      setDurationType(ballot.durationType);
      setTimeLimit(ballot.timeLimit ? new Date(ballot.timeLimit).toISOString().slice(0, 16) : "");
      setVoteLimit(ballot.voteLimit?.toString() || "");
    }
  }, [ballot]);

  const addChoice = () => {
    setChoices([...choices, ""]);
  };

  const removeChoice = (index: number) => {
    if (choices.length > 2) {
      setChoices(choices.filter((_, i) => i !== index));
    }
  };

  const updateChoice = (index: number, value: string) => {
    const newChoices = [...choices];
    newChoices[index] = value;
    setChoices(newChoices);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ballot) return;

    if (!title.trim()) {
      toast.error("Please enter a ballot title");
      return;
    }

    const validChoices = choices.filter(choice => choice.trim());
    if (validChoices.length < 2) {
      toast.error("Please provide at least 2 choices");
      return;
    }

    setIsSubmitting(true);

    try {
      let timeLimitTimestamp: number | undefined;
      if (durationType === "time" && timeLimit) {
        timeLimitTimestamp = new Date(timeLimit).getTime();
        if (timeLimitTimestamp <= Date.now()) {
          toast.error("Time limit must be in the future");
          setIsSubmitting(false);
          return;
        }
      }

      let voteLimitNumber: number | undefined;
      if (durationType === "count" && voteLimit) {
        voteLimitNumber = parseInt(voteLimit);
        if (voteLimitNumber <= 0) {
          toast.error("Vote limit must be greater than 0");
          setIsSubmitting(false);
          return;
        }
      }

      await updateBallot({
        ballotId: ballot._id,
        title: title.trim(),
        description: description.trim() || undefined,
        choices: validChoices,
        durationType,
        timeLimit: timeLimitTimestamp,
        voteLimit: voteLimitNumber,
      });

      toast.success("Ballot updated successfully!");
      navigate(`/ballot/${ballot.urlId}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update ballot");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!ballot) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (ballot.isActive) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">Cannot Edit Active Ballot</h2>
          <p className="text-yellow-700">This ballot is already live and cannot be edited.</p>
          <button
            onClick={() => navigate(`/ballot/${ballot.urlId}`)}
            className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            View Ballot
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Ballot</h1>
      <p className="text-gray-600 mb-8">Make changes to your draft ballot before making it live.</p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Ballot Title *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="What are you voting on?"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Provide additional context or instructions..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Choices *
          </label>
          <div className="space-y-3">
            {choices.map((choice, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={choice}
                  onChange={(e) => updateChoice(index, e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={`Choice ${index + 1}`}
                />
                {choices.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeChoice(index)}
                    className="px-3 py-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addChoice}
            className="mt-3 px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Choice
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Voting Duration
          </label>
          <div className="space-y-4">
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="durationType"
                  value="manual"
                  checked={durationType === "manual"}
                  onChange={(e) => setDurationType(e.target.value as "manual")}
                  className="mr-2"
                />
                Manual (close when ready)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="durationType"
                  value="time"
                  checked={durationType === "time"}
                  onChange={(e) => setDurationType(e.target.value as "time")}
                  className="mr-2"
                />
                Time limit
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="durationType"
                  value="count"
                  checked={durationType === "count"}
                  onChange={(e) => setDurationType(e.target.value as "count")}
                  className="mr-2"
                />
                Vote limit
              </label>
            </div>

            {durationType === "time" && (
              <div>
                <label htmlFor="timeLimit" className="block text-sm font-medium text-gray-700 mb-2">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  id="timeLimit"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {durationType === "count" && (
              <div>
                <label htmlFor="voteLimit" className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Number of Votes
                </label>
                <input
                  type="number"
                  id="voteLimit"
                  value={voteLimit}
                  onChange={(e) => setVoteLimit(e.target.value)}
                  min="1"
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 100"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Updating..." : "Update Ballot"}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/ballot/${ballot.urlId}`)}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
