import { ReactNode } from 'react';
import AppHeader from './AppHeader';
import AppNav from './AppNav';
import AppFooter from './AppFooter';

interface AppLayoutProps {
  children: ReactNode;
  searchLabel?: string;
  searchPlaceholder?: string;
  searchTags?: string[];
  onSearch?: (term: string) => void;
}

export default function AppLayout({ children, searchLabel, searchPlaceholder, searchTags, onSearch }: AppLayoutProps) {
  return (
    <div className="max-w-[1180px] mx-auto px-5 py-6 pb-12 relative z-[1]">
      <AppHeader searchLabel={searchLabel} searchPlaceholder={searchPlaceholder} searchTags={searchTags} onSearch={onSearch} />
      <AppNav />
      {children}
      <AppFooter />
    </div>
  );
}
