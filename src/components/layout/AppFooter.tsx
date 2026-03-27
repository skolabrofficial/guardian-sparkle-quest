import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

export default function AppFooter() {
  return (
    <footer className="flex gap-4 justify-center items-center mt-8 py-4 font-bold flex-wrap border-t border-border">
      <Link to="/" className="text-foreground no-underline hover:text-primary transition-colors">Kampus</Link>
      <span className="text-border">•</span>
      <Link to="/fakulty" className="text-foreground no-underline hover:text-primary transition-colors">Fakulty</Link>
      <span className="text-border">•</span>
      <Link to="/kurzy" className="text-foreground no-underline hover:text-primary transition-colors">Kurzy</Link>
      <span className="text-border">•</span>
      <a href="https://www.alik.cz/" target="_blank" rel="noopener noreferrer" className="text-foreground no-underline hover:text-primary transition-colors">Alík.cz</a>
      <span className="text-border">•</span>
      <span className="text-muted-foreground text-sm font-normal flex items-center gap-1">
        S <Heart size={12} className="text-primary" /> od Alíka
      </span>
    </footer>
  );
}
