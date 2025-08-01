import { Link } from "react-router-dom";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInForm } from "../SignInForm";

export function Home() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Ranked Choice Voting
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Create polls, gather ranked preferences, and see instant results with fair voting
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/create"
            className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Create a Ballot
          </Link>
          <Unauthenticated>
            <div className="text-gray-500">
              or sign in to manage your ballots
            </div>
          </Unauthenticated>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <div className="text-center p-6 bg-white rounded-lg shadow-sm">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Easy Creation</h3>
          <p className="text-gray-600">Create ballots with unlimited choices and flexible voting rules</p>
        </div>

        <div className="text-center p-6 bg-white rounded-lg shadow-sm">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Rank Choices</h3>
          <p className="text-gray-600">Voters can rank their preferences for more nuanced results</p>
        </div>

        <div className="text-center p-6 bg-white rounded-lg shadow-sm">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Live Results</h3>
          <p className="text-gray-600">Watch results update in real-time as votes come in</p>
        </div>
      </div>

      <Unauthenticated>
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-sm">
          <h2 className="text-2xl font-bold text-center mb-6">Sign In</h2>
          <SignInForm />
          <p className="text-sm text-gray-500 text-center mt-4">
            Sign in to track your ballots and voting history
          </p>
        </div>
      </Unauthenticated>
    </div>
  );
}
