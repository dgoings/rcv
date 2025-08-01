import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface ClaimBallotAuthProps {
  ballotId: Id<"ballots">;
  anonymousVoterId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ClaimBallotAuth({ ballotId, anonymousVoterId, onSuccess, onCancel }: ClaimBallotAuthProps) {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  
  const claimBallot = useMutation(api.ballots.claimBallot);

  const handleAuthSuccess = async () => {
    try {
      await claimBallot({
        ballotId,
        anonymousVoterId,
      });
      toast.success("Ballot saved to your account!");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to save ballot to account");
    }
  };

  const handleSignIn = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData(e.target as HTMLFormElement);
    formData.set("flow", flow);

    void signIn("password", formData)
      .then(() => handleAuthSuccess())
      .catch((error: any) => {
        let toastTitle = "";
        if (error.message.includes("Invalid password")) {
          toastTitle = "Invalid password. Please try again.";
        } else {
          toastTitle =
            flow === "signIn"
              ? "Could not sign in, did you mean to sign up?"
              : "Could not sign up, did you mean to sign in?";
        }
        toast.error(toastTitle);
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  const handleAnonymousSignIn = () => {
    setSubmitting(true);
    void signIn("anonymous")
      .then(() => handleAuthSuccess())
      .catch(() => {
        toast.error("Failed to sign in anonymously");
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  if (!showAuth) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Save this ballot to your account
            </h3>
            <p className="text-blue-800 mb-4">
              Sign in or create an account to save this ballot and track your voting activity. 
              You won't lose access to this ballot.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAuth(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Sign In / Create Account
              </button>
              <button
                onClick={onCancel}
                className="text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-100 transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Save Ballot to Your Account
        </h3>
        <button
          onClick={() => setShowAuth(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSignIn} className="space-y-4">
        <div>
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Processing..." : (flow === "signIn" ? "Sign In" : "Sign Up")}
        </button>
        
        <div className="text-center">
          <button
            type="button"
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {flow === "signIn" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </button>
        </div>
      </form>

      <div className="flex items-center my-4">
        <hr className="flex-1 border-gray-200" />
        <span className="px-3 text-sm text-gray-500">or</span>
        <hr className="flex-1 border-gray-200" />
      </div>

      <button
        onClick={handleAnonymousSignIn}
        disabled={submitting}
        className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Continue Anonymously
      </button>

      <p className="text-xs text-gray-500 text-center mt-3">
        Your ballot and any votes will be saved to your account
      </p>
    </div>
  );
}
