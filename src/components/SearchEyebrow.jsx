import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSiteSearch } from './SiteSearchContext.jsx';

function readShopSearchTerm(searchString = '') {
  return new URLSearchParams(searchString).get('q')?.trim() || '';
}

export default function SearchEyebrow({
  label,
  className = '',
  placeholder = 'Search by SKU or piece name',
}) {
  const { searchOpen, closeSearch } = useSiteSearch();
  const location = useLocation();
  const navigate = useNavigate();
  const [value, setValue] = React.useState(() => readShopSearchTerm(location.search));
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    setValue(readShopSearchTerm(location.search));
  }, [location.search]);

  React.useEffect(() => {
    if (!searchOpen) {
      return;
    }

    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [searchOpen]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = value.trim();
    closeSearch();
    navigate(trimmed ? `/shop?q=${encodeURIComponent(trimmed)}` : '/shop');
  };

  const handleClose = () => {
    closeSearch();

    if (location.pathname === '/shop' && readShopSearchTerm(location.search)) {
      const params = new URLSearchParams(location.search);
      params.delete('q');
      navigate(params.toString() ? `/shop?${params.toString()}` : '/shop');
    }
  };

  if (!searchOpen) {
    return <div className={`pill-eyebrow ${className}`}>{label}</div>;
  }

  return (
    <form className={`pill-eyebrow pill-eyebrow--search ${className}`.trim()} onSubmit={handleSubmit} role="search">
      <span className="pill-eyebrow__search-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4.5 4.5" />
        </svg>
      </span>
      <input
        ref={inputRef}
        className="pill-eyebrow__search-input"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
      />
      <button type="button" className="pill-eyebrow__search-close" onClick={handleClose} aria-label="Close search">×</button>
    </form>
  );
}
