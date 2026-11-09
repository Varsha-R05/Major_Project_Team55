import { Routes, Route } from "react-router-dom";

// Layouts
import MainLayout from "./layouts/MainLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import AdminLayout from "./admin/AdminLayout";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Resume from "./pages/Resume";
import Practice from "./pages/Practice";
import Test from "./pages/Test";
import CodingTest from "./pages/CodingTest";
import MockInterview from "./pages/MockInterview";
import Interview from "./pages/Interview";
import Feedback from "./pages/Feedback";

// Admin
import AdminDashboard from "./admin/AdminDashboard";
import Leaderboard from "./admin/Leaderboard";
import MonthlyRanking from "./admin/MonthlyRanking";
import CandidateProfile from "./admin/CandidateProfile";


function App() {
  return (
    <Routes>

      {/* Public Routes (No Sidebar) */}
      <Route path="/" element={<MainLayout><Home /></MainLayout>} />
      <Route path="/login" element={<MainLayout><Login /></MainLayout>} />
      <Route path="/signup" element={<MainLayout><Signup /></MainLayout>} />

      {/* Dashboard Routes (With Sidebar) */}
      <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
      <Route path="/resume" element={<DashboardLayout><Resume /></DashboardLayout>} />
      <Route path="/practice" element={<DashboardLayout><Practice /></DashboardLayout>} />
      <Route path="/test/coding" element={<CodingTest />} />
      <Route path="/mock-interview" element={<DashboardLayout><MockInterview /></DashboardLayout>} />
      <Route path="/test/:type" element={<DashboardLayout><Test /></DashboardLayout>} />
      <Route path="/test/:type/:company" element={<DashboardLayout><Test /></DashboardLayout>} />
      <Route path="/coding" element={<DashboardLayout><CodingTest /></DashboardLayout>} />
      <Route path="/interview" element={<Interview />} />
      <Route path="/feedback" element={<DashboardLayout><Feedback /></DashboardLayout>} />
      <Route path="/test/vtu" element={<Test />} />

      {/* Admin */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="monthly-ranking" element={<MonthlyRanking />} />
        <Route path="candidate/:id" element={<CandidateProfile />} />
      </Route>

    </Routes>
  );
}

export default App;