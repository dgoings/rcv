import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { CreateBallot } from "./components/CreateBallot";
import { EditBallot } from "./components/EditBallot";
import { BallotView } from "./components/BallotView";
import { Dashboard } from "./components/Dashboard";
import { Home } from "./components/Home";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
          <Link to="/" className="text-xl font-bold text-blue-600 hover:text-blue-700">
            RCV Voting
          </Link>
          <nav className="flex items-center gap-4">
            <Authenticated>
              <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
              <Link to="/create" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                Create Ballot
              </Link>
              <SignOutButton />
            </Authenticated>
            <Unauthenticated>
              <Link to="/create" className="text-gray-600 hover:text-gray-900">
                Create Ballot
              </Link>
            </Unauthenticated>
          </nav>
        </header>
        
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateBallot />} />
            <Route path="/edit/:urlId" element={<EditBallot />} />
            <Route path="/ballot/:urlId" element={<BallotView />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </main>
        
        <Toaster />
      </div>
    </Router>
  );
}
