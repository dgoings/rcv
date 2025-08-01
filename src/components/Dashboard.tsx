import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInForm } from "../SignInForm";

export function Dashboard() {
  const userBallots = useQuery(api.ballots.getUserBallots);
  const closeBallot = useMutation(api.ballots.closeBallot);

  const handleCloseBallot = async (ballotId: string) => {
    try {
      await closeBallot({ ballotId: ballotId as any });
      toast.success("Ballot closed successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to close ballot");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Authenticated>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
        
        {userBallots && (
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Ballots You Created ({userBallots.created.length})
              </h2>
              
              {userBallots.created.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                  <p className="text-gray-500 mb-4">You haven't created any ballots yet</p>
                  <Link
                    to="/create"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Create Your First Ballot
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {userBallots.created.filter((ballot): ballot is NonNullable<typeof ballot> => ballot !== null).map((ballot) => (
                    <div key={ballot._id} className="bg-white rounded-lg shadow-sm p-4 border">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900">{ballot.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          ballot.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {ballot.isActive ? "Active" : "Closed"}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">
                        Created {new Date(ballot.createdAt).toLocaleDateString()}
                      </p>
                      
                      <div className="flex gap-2">
                        <Link
                          to={`/ballot/${ballot.urlId}`}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          View Ballot
                        </Link>
                        {ballot.isActive && ballot.durationType === "manual" && (
                          <button
                            onClick={() => handleCloseBallot(ballot._id)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium ml-4"
                          >
                            Close Ballot
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Ballots You Voted On ({userBallots.voted.length})
              </h2>
              
              {userBallots.voted.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                  <p className="text-gray-500">You haven't voted on any ballots yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userBallots.voted.filter((ballot): ballot is NonNullable<typeof ballot> => ballot !== null).map((ballot) => (
                    <div key={ballot._id} className="bg-white rounded-lg shadow-sm p-4 border">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900">{ballot.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          ballot.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {ballot.isActive ? "Active" : "Closed"}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">
                        Created {new Date(ballot.createdAt).toLocaleDateString()}
                      </p>
                      
                      <Link
                        to={`/ballot/${ballot.urlId}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View Results
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Authenticated>

      <Unauthenticated>
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-center mb-6">Sign In to View Dashboard</h1>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <SignInForm />
          </div>
          <p className="text-center text-gray-500 mt-4">
            Sign in to track your ballots and voting history
          </p>
        </div>
      </Unauthenticated>
    </div>
  );
}
