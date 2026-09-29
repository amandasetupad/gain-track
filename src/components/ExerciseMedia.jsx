import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { isImageUrl, mediaLinkLabel, sanitizeMediaUrl } from '../utils/mediaUrl';

function MediaLink({ href, className }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="truncate">{mediaLinkLabel(href)}</span>
    </a>
  );
}

/**
 * Renders an exercise media_url: image for picture URLs, otherwise an external link.
 * Empty / invalid URLs render nothing. Videos are never embedded.
 */
export default function ExerciseMedia({ url, size = 'md', alt }) {
  const safe = sanitizeMediaUrl(url);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [safe]);

  if (!safe) return null;

  const compact = size === 'sm';
  const linkClass =
    'inline-flex items-center gap-1.5 text-sm text-gain-500 hover:text-gain-400 font-mono min-w-0';

  if (!isImageUrl(safe) || imageFailed) {
    return (
      <div className={compact ? 'mt-1' : 'mt-2'}>
        <MediaLink href={safe} className={linkClass} />
      </div>
    );
  }

  return (
    <div className={compact ? 'mt-2' : 'mt-3'}>
      <a
        href={safe}
        target="_blank"
        rel="noopener noreferrer"
        className="block max-w-md"
      >
        <img
          src={safe}
          alt={alt || 'Exercise demonstration'}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          className={`w-full rounded-lg border border-slab-850 bg-slab-850/50 object-contain ${
            compact ? 'max-h-28 sm:max-h-32' : 'max-h-40 sm:max-h-52'
          }`}
        />
      </a>
    </div>
  );
}
