import React from 'react';

function cleanProductHtml(value = '') {
  return String(value)
    .replace(/\[\[SIZE_TBD\]\]/gi, '')
    .replace(/<p>\s*<\/p>/gi, '')
    .trim();
}

// descriptionHtml's first paragraph is almost always `<p><strong>{headline}</strong></p>`
// -- the exact same text already shown as product.line directly above it on the
// card. Strip that lead paragraph so expanding a card doesn't show the short
// description twice.
function stripLeadingHeadline(html, headline) {
  if (!headline) return html;
  const escaped = headline.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^\\s*<p>\\s*<strong>\\s*${escaped}\\s*<\\/strong>\\s*<\\/p>`, 'i');
  return html.replace(pattern, '');
}

function ProductCardDescription({ product }) {
  if (product.descriptionHtml) {
    const html = stripLeadingHeadline(cleanProductHtml(product.descriptionHtml), product.line);
    return <div className="product-card__description" dangerouslySetInnerHTML={{ __html: html }} />;
  }

  // The short description (product.line) is already shown above this. Only
  // fall back to it here -- and only render at all -- when there's a real,
  // distinct long description; otherwise this would just repeat the same
  // line the card already showed.
  if (!product.description || product.description === product.line) {
    return null;
  }

  return <p className="product-card__description">{product.description}</p>;
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 17C4 9.5 9.5 4.5 17 4.5" />
      <path d="M13 2l5 2.5-2.5 5.5" />
    </svg>
  );
}

function ProductCardSkuRow({ eyebrowLabel, sku }) {
  return (
    <div className="sku-row">
      <span>{eyebrowLabel}</span>
      <strong>SKU {sku}</strong>
    </div>
  );
}

function ShareButton({ sku, onShare, shareStatus }) {
  return (
    <button
      type="button"
      className="product-card__share"
      onClick={onShare}
      aria-label={`Share ${sku}`}
    >
      {shareStatus === 'copied' ? (
        'Copied'
      ) : (
        <>
          <ShareIcon />
          <span>Share</span>
        </>
      )}
    </button>
  );
}

export function ProductCard({ product, eyebrowOverride, sharedSku }) {
  const [showBack, setShowBack] = React.useState(false);
  const [activeImage, setActiveImage] = React.useState(product.image);
  // Sheet data entry mistakes happen -- a row's "Final Image Filename" can
  // name a file that was never actually uploaded under that name, while the
  // real photo sits under the legacy shoot-number filename every other
  // product uses (e.g. NKL-166.JPG requested, 166.JPG is what's really
  // there). api/catalog.js hands back every plausible filename for a photo;
  // track which ones have already failed so a load error advances to the
  // next candidate instead of just leaving a broken image.
  const [failedSrcs, setFailedSrcs] = React.useState(() => new Set());
  // Only the product's own real photo(s). Previously this padded out to 4
  // "thumbnails" using unrelated Thomasina studio photos as a placeholder --
  // the catalog only has one photo per piece today, so the thumbnail row
  // just doesn't render until there's more than one real image to show.
  const galleryImages = React.useMemo(() => [product.image].filter(Boolean), [product.image]);

  React.useEffect(() => {
    setActiveImage(product.image);
    setFailedSrcs(new Set());
  }, [product.image]);

  const imageFallbackChain = React.useMemo(
    () => [activeImage, ...(product.imageFallbacks || [])].filter(Boolean),
    [activeImage, product.imageFallbacks]
  );
  const displayImage = imageFallbackChain.find((src) => !failedSrcs.has(src)) || imageFallbackChain[imageFallbackChain.length - 1];

  const handleImageError = () => {
    setFailedSrcs((prev) => (prev.has(displayImage) ? prev : new Set(prev).add(displayImage)));
  };

  const toggleCard = () => setShowBack((current) => !current);
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleCard();
    }
  };

  const handleThumbClick = (event, image) => {
    event.stopPropagation();
    setActiveImage(image);
    setFailedSrcs(new Set());
  };

  const hasDimensions = Boolean(product.height || product.width || product.weight);
  const eyebrowLabel = eyebrowOverride || product.category;

  const articleRef = React.useRef(null);
  const [shareStatus, setShareStatus] = React.useState('idle');

  React.useEffect(() => {
    if (sharedSku && product.sku === sharedSku) {
      setShowBack(true);
      articleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Only meant to fire once, for whichever card matches the link someone
    // arrived with -- not every time sharedSku happens to re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShare = async (event) => {
    event.stopPropagation();
    // /p/:sku is a short redirect to the full /shop?sku= deep link (see
    // ProductShortLink in SinaPages.jsx) -- keeps shared links (texts, DMs,
    // social captions) from being the long shop-with-query-string URL.
    const shareUrl = `${window.location.origin}/p/${encodeURIComponent(product.sku)}`;
    const shareTitle = `${product.name} — Sina's Creations`;
    // Some share targets (notably Android's SMS/Messages) only surface the
    // `text` field, dropping `title` entirely -- so the piece's name has to
    // be part of the text itself, not rely on title showing up.
    const shareText = `${product.name}\n${product.line}\nOne-of-one, handcrafted by Thomasina Schnepf.`;

    // Try to attach the actual product photo so the share carries the image,
    // not just a link -- most share targets (Messages, Instagram, Mail) will
    // use a shared file directly when the OS share sheet supports it.
    let files;
    if (navigator.canShare) {
      try {
        const response = await fetch(displayImage);
        const blob = await response.blob();
        const file = new File([blob], `${product.sku}.jpg`, { type: blob.type || 'image/jpeg' });
        if (navigator.canShare({ files: [file] })) {
          files = [file];
        }
      } catch (error) {
        // Image couldn't be fetched/packaged as a file -- share the link alone.
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl, ...(files ? { files } : {}) });
        return;
      } catch (error) {
        if (error && error.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus('copied');
      window.setTimeout(() => setShareStatus('idle'), 2000);
    } catch (error) {
      // No Web Share API and no clipboard access -- nothing more to do.
    }
  };

  return (
    <article
      ref={articleRef}
      className={`product-card${showBack ? ' is-back' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={showBack}
      aria-label={`${product.name} product card. ${showBack ? 'Showing full details.' : 'Showing front of card.'} Activate to flip.`}
      onClick={toggleCard}
      onKeyDown={handleKeyDown}
    >
      <div className="product-card__visual">
        <div className="product-card__image">
          <img
            src={displayImage}
            alt={`${product.name}, ${product.category} by Sina's Creations`}
            loading="lazy"
            decoding="async"
            onError={handleImageError}
          />
          <span className="product-card__one-of-one"><span className="nowrap">1-of-1</span></span>
        </div>
        {galleryImages.length > 1 && (
          <div className="product-card__thumbs" aria-label={`${product.name} image gallery`}>
            {galleryImages.map((image, index) => (
              <button
                key={`${product.sku}-${index}`}
                type="button"
                className={`product-card__thumb${activeImage === image ? ' active' : ''}`}
                onClick={(event) => handleThumbClick(event, image)}
                aria-label={`View image ${index + 1} for ${product.name}`}
              >
                <img src={image} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="product-card__panel">
        {!showBack ? (
          <>
            <ProductCardSkuRow eyebrowLabel={eyebrowLabel} sku={product.sku} />
            <h3>{product.name}</h3>
            <p>{product.line}</p>
            <div className="price-row"><span><span className="nowrap">1-of-1</span> Cost of Adoption</span><strong>${product.price}</strong></div>
            <div className="product-card__flip-cta-row">
              <span className="product-card__flip-cta">Read {product.name}&rsquo;s Story Before Adopting</span>
              <ShareButton sku={product.sku} onShare={handleShare} shareStatus={shareStatus} />
            </div>
          </>
        ) : (
          <>
            <ProductCardSkuRow eyebrowLabel={eyebrowLabel} sku={product.sku} />
            <h3>{product.name}</h3>
            <p>{product.line}</p>
            <div className="product-card__description-shell">
              <ProductCardDescription product={product} />
            </div>
            {hasDimensions && (
              <div className="product-card__dimensions">
                {product.height && <span>H {product.height}&Prime;</span>}
                {product.width && <span>W {product.width}&Prime;</span>}
                {product.weight && <span>{product.weight} oz</span>}
              </div>
            )}
            <div className="price-row"><span><span className="nowrap">1-of-1</span> Cost of Adoption</span><strong>${product.price}</strong></div>
            <div className="product-card__flip-cta-row product-card__flip-cta-row--back">
              <ShareButton sku={product.sku} onShare={handleShare} shareStatus={shareStatus} />
            </div>
            <button type="button" className="button primary product-card__adopt-cta">Adopt Me</button>
            <p className="product-card__close-hint">Close</p>
          </>
        )}
      </div>
    </article>
  );
}

export default ProductCard;
