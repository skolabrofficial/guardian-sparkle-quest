import { Link } from 'react-router-dom';

export default function AppFooter() {
  return (
    <footer className="flex gap-4 justify-center mt-6 font-bold flex-wrap">
      <Link to="/" className="text-blue-900 no-underline">Kampus</Link>
      <Link to="/fakulty" className="text-blue-900 no-underline">Fakulty</Link>
      <Link to="/kurzy" className="text-blue-900 no-underline">Kurzy</Link>
      <a href="https://www.alik.cz/" target="_blank" rel="noopener noreferrer" className="text-blue-900 no-underline">Alík.cz</a>
    </footer>
  );
}
