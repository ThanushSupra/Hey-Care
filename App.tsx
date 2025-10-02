// Top-level application shell.
// Provides global context providers (React Query, tooltips, toasts) and routing.
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// React Query client handles caching and background fetching across the app
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* TooltipProvider ensures consistent tooltip behavior throughout the app */}
    <TooltipProvider>
      {/* Two toast systems: shadcn toaster and Sonner for notifications */}
      <Toaster />
      <Sonner />
      {/* Client-side routing for pages */}
      <BrowserRouter>
        <Routes>
          {/* Home page with recorder, patient form, and notes */}
          <Route path="/" element={<Index />} />
          {/* Catch-all route for unknown paths */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
