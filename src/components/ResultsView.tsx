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
  } | null | undefined;
}

export function ResultsView({ results }: ResultsViewProps) {
  if (!results) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
    </div>
  );
}
