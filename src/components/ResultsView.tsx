interface ResultsViewProps {
  results: {
    ballot: any;
    totalVotes: number;
    results: {
      rounds: Array<{
        round: number;
        results: Array<{
          choiceIndex: number;
          choice: string;
          votes: number;
          percentage: number;
        }>;
        eliminated: string | null;
      }>;
      winner: string | null;
    };
    resultsHidden?: boolean;
    hiddenReason?: string;
  } | null | undefined;
  isCreator?: boolean;
  onUpdateVisibility?: (settings: any) => void;
}

export function ResultsView({ results, isCreator, onUpdateVisibility }: ResultsViewProps) {
  if (!results) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Handle hidden results
  if (results.resultsHidden) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 mb-4">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464a11.107 11.107 0 00-2.597 2.414M9.878 9.878l4.242 4.242M14.12 14.12l2.597-2.414M14.12 14.12L15.536 15.536m-2.414-2.414l-4.242-4.242" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Results Hidden</h3>
          <p className="text-sm text-gray-600">{results.hiddenReason}</p>
        </div>

        {isCreator && onUpdateVisibility && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 mb-3">
              As the creator, you can control when results are visible to voters.
            </p>
            <button
              onClick={() => onUpdateVisibility({ resultsVisibleToPublic: true })}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Make Results Visible
            </button>
          </div>
        )}
      </div>
    );
  }

  if (results.totalVotes === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 mb-2">No votes yet</div>
        <p className="text-sm text-gray-400">
          Results will appear here as people vote
        </p>
      </div>
    );
  }

  const { rounds, winner } = results.results;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Live Results
        </h2>
        <p className="text-gray-600">
          {results.totalVotes} vote{results.totalVotes !== 1 ? 's' : ''} • Updates in real-time
        </p>
      </div>

      {winner && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-green-800 font-semibold text-lg">
            🏆 Winner: {winner}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {rounds.map((round, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">
                Round {round.round}
              </h3>
              {round.eliminated && (
                <span className="text-sm text-red-600 bg-red-50 px-2 py-1 rounded">
                  Eliminated: {round.eliminated}
                </span>
              )}
            </div>
            
            <div className="space-y-3">
              {round.results
                .sort((a, b) => b.votes - a.votes)
                .map((result, resultIndex) => (
                  <div key={resultIndex} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-gray-900">
                          {result.choice}
                        </span>
                        <span className="text-sm text-gray-600">
                          {result.votes} votes ({result.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${result.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="text-center text-sm text-gray-500">
        <p>
          Ranked Choice Voting eliminates the choice with the fewest votes each round
          until one choice has a majority.
        </p>
      </div>

      {isCreator && onUpdateVisibility && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border-t">
          <h3 className="font-medium text-gray-900 mb-3">Result Visibility Controls</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visibility Mode
              </label>
              <select
                value={results.ballot.resultVisibility}
                onChange={(e) => onUpdateVisibility({ resultVisibility: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="live">Live - Results visible in real-time</option>
                <option value="after_voting">After Voting - Results visible when voting ends</option>
                <option value="manual">Manual - You control when results are visible</option>
                <option value="never">Never - Results never visible to voters</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={results.ballot.showPartialResults}
                  onChange={(e) => onUpdateVisibility({ showPartialResults: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Show all rounds (not just final result)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={results.ballot.resultsVisibleToPublic}
                  onChange={(e) => onUpdateVisibility({ resultsVisibleToPublic: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Results visible to public</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
