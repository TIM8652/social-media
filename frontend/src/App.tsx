import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Trends from "./pages/Trends";
import Projects from "./pages/Projects";
import PopularScripts from "./pages/PopularScripts";
import ScriptGeneration from "./pages/ScriptGeneration";
import ShotScript from "./pages/ShotScript";
import ImageAnalysis from "./pages/ImageAnalysis";
import ImageGeneration from "./pages/ImageGeneration";
import Review from "./pages/Review";
import Admin from "./pages/Admin";
import AdminDashboard from "./pages/AdminDashboard";
import AppLayout from "./components/layout/AppLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
          <Route path="/trends" element={<AppLayout><Trends /></AppLayout>} />
          <Route path="/projects" element={<AppLayout><Projects /></AppLayout>} />
          <Route path="/popular-scripts" element={<AppLayout><PopularScripts /></AppLayout>} />
          <Route path="/image-analysis" element={<AppLayout><ImageAnalysis /></AppLayout>} />
          <Route path="/script-generation" element={<AppLayout><ScriptGeneration /></AppLayout>} />
          <Route path="/shot-script" element={<AppLayout><ShotScript /></AppLayout>} />
          <Route path="/image-generation" element={<AppLayout><ImageGeneration /></AppLayout>} />
          <Route path="/review" element={<AppLayout><Review /></AppLayout>} />
          <Route path="/admin" element={<AppLayout><AdminDashboard /></AppLayout>} />
          <Route path="/settings" element={<AppLayout><Admin /></AppLayout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
