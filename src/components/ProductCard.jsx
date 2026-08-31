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
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
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

function ProductNameLink({ product }) {
  return (
    <a
      href={`/p/${encodeURIComponent(product.sku)}`}
      onClick={(event) => event.stopPropagation()}
      aria-label={`Open ${product.name}'s permanent product page`}
    >
      {product.name}
    </a>
  );
}

function ShareButton({ sku, onShare, shareStatus }) {
  return (
    <button
      type="button"
      className="product-card__share"
      onClick={onShare}
      aria-label={shareStatus === 'copied' ? 'Link copied' : `Share ${sku}`}
    >
      {shareStatus === 'copied' ? 'Copied' : <ShareIcon />}
    </button>
  );
}

export function ProductCard({ product, eyebrowOverride, sharedSku }) {
  const [showBack, setShowBack] = React.useState(false);
  // Sheet data entry mistakes happen -- a row's "Final Image Filename" can
  // name a file that was never actually uploaded under that name (or was
  // typed with a different case/extension than what's really on disk,
  // e.g. ".jpg" typed but ".JPG" uploaded). api/catalog.js hands back every
  // plausible filename for a photo; track which ones have already failed
  // so a load error advances to the next candidate instead of just leaving
  // a broken image.
  const [failedSrcs, setFailedSrcs] = React.useState(() => new Set());
  // api/catalog.js fills product.gallery with one candidate-list "slot" per
  // photo -- slot 0 is the primary shot's full fallback chain, and any
  // optional extra angles (Image 2/3/4 Filename columns) each get their own
  // chain too. Most rows only have the one photo, so the thumbnail strip
  // just doesn't render until there's more than one real image to show.
  const gallerySlots = React.useMemo(() => {
    if (product.gallery && product.gallery.length) return product.gallery;
    return [[product.image, ...(product.imageFallbacks || [])].filter(Boolean)];
  }, [product.gallery, product.image, product.imageFallbacks]);

  const [activeSlot, setActiveSlot] = React.useState(0);

  React.useEffect(() => {
    setActiveSlot(0);
    setFailedSrcs(new Set());
  }, [product.sku]);

  const resolveSlotSrc = (candidates) => candidates.find((src) => !failedSrcs.has(src)) || candidates[candidates.length - 1];
  const displayImage = resolveSlotSrc(gallerySlots[activeSlot] || []);

  const markSrcFailed = (src) => {
    setFailedSrcs((prev) => (prev.has(src) ? prev : new Set(prev).add(src)));
  };

  const toggleCard = () => setShowBack((current) => !current);
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleCard();
    }
  };

  const handleThumbClick = (event, index) => {
    event.stopPropagation();
    setActiveSlot(index);
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
    // /p/:sku is the permanent public product page. It is used everywhere:
    // share links, QR labels, search indexing, and internal product links.
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
      className={`product-card${showBack ? ' is-back' : ''}${product.status === 'sold-out' ? ' is-sold' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={showBack}
      aria-label={`${product.name} product card. ${showBack ? 'Showing full details. Activate to close.' : 'Activate to see full details.'}`}
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
            onError={() => markSrcFailed(displayImage)}
          />
          <span className="product-card__one-of-one"><span className="nowrap">1-of-1</span></span>
        </div>
        {showBack && gallerySlots.length > 1 && (
          <div className="product-card__thumbs" aria-label={`${product.name} image gallery`}>
            {gallerySlots.map((candidates, index) => {
              const thumbSrc = resolveSlotSrc(candidates);
              return (
                <button
                  key={`${product.sku}-${index}`}
                  type="button"
                  className={`product-card__thumb${activeSlot === index ? ' active' : ''}`}
                  onClick={(event) => handleThumbClick(event, index)}
                  aria-label={`View image ${index + 1} for ${product.name}`}
                >
                  <img src={thumbSrc} alt="" onError={() => markSrcFailed(thumbSrc)} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="product-card__panel">
        {!showBack ? (
          <>
            <ProductCardSkuRow eyebrowLabel={eyebrowLabel} sku={product.sku} />
            <h3><ProductNameLink product={product} /></h3>
            <p className="product-card__line">{product.line}</p>
            <div className="price-row">
              <strong>${product.price}</strong>
            </div>
            <div className="product-card__flip-cta-row">
              <div className="product-card__flip-cta-text">
                <span className="product-card__flip-cta-caption">Cost to adopt this <span className="nowrap">1-of-1</span> original</span>
                <span className="product-card__flip-cta">Read {product.name}&rsquo;s Story Before Adopting</span>
              </div>
              <ShareButton sku={product.sku} onShare={handleShare} shareStatus={shareStatus} />
            </div>
          </>
        ) : (
          <>
            <ProductCardSkuRow eyebrowLabel={eyebrowLabel} sku={product.sku} />
            <h3><ProductNameLink product={product} /></h3>
            <p className="product-card__line">{product.line}</p>
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
            <div className="price-row">
              <strong>${product.price}</strong>
              <div className="price-row__cost-share">
                <span className="product-card__flip-cta-caption">Cost to adopt this <span className="nowrap">1-of-1</span> original</span>
                <ShareButton sku={product.sku} onShare={handleShare} shareStatus={shareStatus} />
              </div>
            </div>
            {product.status === 'sold-out' ? (
              <span className="button primary product-card__adopt-cta product-card__adopt-cta--sold" aria-disabled="true">
                {product.name} Found a Home!
              </span>
            ) : (
              <a
                href={`/api/adopt?sku=${encodeURIComponent(product.sku)}`}
                className="button primary product-card__adopt-cta"
                onClick={(event) => event.stopPropagation()}
              >
                Adopt Me
              </a>
            )}
            <p className="product-card__close-hint">Close</p>
          </>
        )}
      </div>
    </article>
  );
}

export default ProductCard;
