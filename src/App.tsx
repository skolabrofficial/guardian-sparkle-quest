import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Fakulty from "./pages/Fakulty";
import Kurzy from "./pages/Kurzy";
import Rozvrh from "./pages/Rozvrh";
import Studium from "./pages/Studium";
import Vypisky from "./pages/Vypisky";
import Doucovani from "./pages/Doucovani";
import Rektorat from "./pages/Rektorat";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/fakulty" element={<Fakulty />} />
            <Route path="/kurzy" element={<Kurzy />} />
            <Route path="/rozvrh" element={<Rozvrh />} />
            <Route path="/studium" element={<Studium />} />
            <Route path="/vypisky" element={<Vypisky />} />
            <Route path="/doucovani" element={<Doucovani />} />
            <Route path="/rektorat" element={<Rektorat />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
