import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function CreateBallot() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [choices, setChoices] = useState(["", ""]);
  const [durationType, setDurationType] = useState<"time" | "count" | "manual">("manual");
  const [timeLimit, setTimeLimit] = useState("");
  const [voteLimit, setVoteLimit] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createBallot = useMutation(api.ballots.createBallot);
  const navigate = useNavigate();

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

      const result = await createBallot({
        title: title.trim(),
        description: description.trim() || undefined,
        choices: validChoices,
        durationType,
        timeLimit: timeLimitTimestamp,
        voteLimit: voteLimitNumber,
      });

      toast.success("Ballot created successfully!");
      navigate(`/ballot/${result.urlId}`);
    } catch (error) {
      toast.error("Failed to create ballot");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New Ballot</h1>
      
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
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="radio"
                name="durationType"
                value="manual"
                checked={durationType === "manual"}
                onChange={(e) => setDurationType(e.target.value as "manual")}
                className="mr-3"
              />
              Manual closure (close when you want)
            </label>
            
            <label className="flex items-center">
              <input
                type="radio"
                name="durationType"
                value="time"
                checked={durationType === "time"}
                onChange={(e) => setDurationType(e.target.value as "time")}
                className="mr-3"
              />
              Time limit
            </label>
            {durationType === "time" && (
              <input
                type="datetime-local"
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                className="ml-6 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min={new Date().toISOString().slice(0, 16)}
              />
            )}
            
            <label className="flex items-center">
              <input
                type="radio"
                name="durationType"
                value="count"
                checked={durationType === "count"}
                onChange={(e) => setDurationType(e.target.value as "count")}
                className="mr-3"
              />
              Vote limit
            </label>
            {durationType === "count" && (
              <input
                type="number"
                value={voteLimit}
                onChange={(e) => setVoteLimit(e.target.value)}
                className="ml-6 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Maximum number of votes"
                min="1"
              />
            )}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating..." : "Create Ballot"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
