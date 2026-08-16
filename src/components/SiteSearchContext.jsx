import React from 'react';

const SiteSearchContext = React.createContext(null);

export function SiteSearchProvider({ children }) {
  const [searchOpen, setSearchOpen] = React.useState(false);

  const value = React.useMemo(() => ({
    searchOpen,
    openSearch: () => setSearchOpen(true),
    closeSearch: () => setSearchOpen(false),
    toggleSearch: () => setSearchOpen((current) => !current),
  }), [searchOpen]);

  return <SiteSearchContext.Provider value={value}>{children}</SiteSearchContext.Provider>;
}

export function useSiteSearch() {
  const context = React.useContext(SiteSearchContext);

  if (!context) {
    throw new Error('useSiteSearch must be used inside SiteSearchProvider.');
  }

  return context;
}
