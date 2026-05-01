import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import PageStyleProvider from "@/components/PageStyleProvider";
import BlockGuard from "@/components/BlockGuard";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Fakulty from "./pages/Fakulty";
import FakultyDetail from "./pages/FakultyDetail";
import Kurzy from "./pages/Kurzy";
import KurzDetail from "./pages/KurzDetail";
import Rozvrh from "./pages/Rozvrh";
import Studium from "./pages/Studium";
import Vypisky from "./pages/Vypisky";
import Doucovani from "./pages/Doucovani";
import Rektorat from "./pages/Rektorat";
import Profil from "./pages/Profil";
import Blocked from "./pages/Blocked";
import Povereni from "./pages/Povereni";
import UserWall from "./pages/UserWall";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <PageStyleProvider />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/blocked" element={<Blocked />} />
            <Route path="/" element={<BlockGuard><Index /></BlockGuard>} />
            <Route path="/fakulty" element={<BlockGuard><Fakulty /></BlockGuard>} />
            <Route path="/fakulty/:id" element={<BlockGuard><FakultyDetail /></BlockGuard>} />
            <Route path="/kurzy" element={<BlockGuard><Kurzy /></BlockGuard>} />
            <Route path="/kurzy/:id" element={<BlockGuard><KurzDetail /></BlockGuard>} />
            <Route path="/rozvrh" element={<BlockGuard><Rozvrh /></BlockGuard>} />
            <Route path="/studium" element={<BlockGuard><Studium /></BlockGuard>} />
            <Route path="/vypisky" element={<BlockGuard><Vypisky /></BlockGuard>} />
            <Route path="/doucovani" element={<BlockGuard><Doucovani /></BlockGuard>} />
            <Route path="/rektorat" element={<BlockGuard><Rektorat /></BlockGuard>} />
            <Route path="/profil" element={<BlockGuard><Profil /></BlockGuard>} />
            <Route path="/povereni" element={<BlockGuard><Povereni /></BlockGuard>} />
            <Route path="/uziv/:username" element={<BlockGuard><UserWall /></BlockGuard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
