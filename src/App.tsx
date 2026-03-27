import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { WorkspaceProvider, useWorkspace } from "@/hooks/useWorkspace";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Welcome from "./pages/Welcome";
import Onboarding from "./pages/Onboarding";
import Invite from "./pages/Invite";
import ResetPassword from "./pages/ResetPassword";
import SetPassword from "./pages/SetPassword";
import PendingApproval from "./pages/PendingApproval";
import NotFound from "./pages/NotFound";
import { AnnouncementModal } from "@/components/AnnouncementModal";
import { WorkspaceConfigProvider } from "@/hooks/useWorkspaceConfigProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 10 * 60 * 1000,   // 10 min — realtime keeps data fresh
      gcTime: 60 * 60 * 1000,      // 60 min — keep cache alive when switching tabs
    },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { workspaceId, loading: wsLoading, hasPendingRequest } = useWorkspace();

  if (loading || wsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    const seen = localStorage.getItem("onboarding_seen") === "1";
    return <Navigate to={seen ? "/welcome" : "/onboarding"} replace />;
  }

  if (!workspaceId) {
    if (hasPendingRequest) {
      return <Navigate to="/pending-approval" replace />;
    }
    return <Navigate to="/welcome" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <WorkspaceProvider>
          <Routes>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/invite" element={<Invite />} />
            <Route path="/invite/:slug" element={<Invite />} />
            <Route path="/login" element={<Navigate to="/auth?mode=login" replace />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/pending-approval" element={<PendingApproval />} />
            <Route
              path="/"
              element={
                <AuthGuard>
                  <WorkspaceConfigProvider>
                    <AnnouncementModal />
                    <Index />
                  </WorkspaceConfigProvider>
                </AuthGuard>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </WorkspaceProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
