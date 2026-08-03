# Components

Where third-party UI in this repo comes from, and under what terms.

| Pattern | Source | URL | License | Adaptation |
|---|---|---|---|---|
| Globe pinned to a lat/long (Explore → What's My IP) | COBE `2.0.1` | https://github.com/shuding/cobe | MIT | Vendored as `public/js/vendor/cobe.esm.js`. The site is zero-build vanilla JS, so it is loaded with a dynamic `import()` from `public/js/globe.js` the first time the IP card opens rather than bundled. Orientation constants were derived empirically (see comment in `globe.js`); brightness and base colour are themed off `body.light-mode`. |

## Notes

COBE was reached via 21st.dev, which catalogues several React wrappers around it.
Those wrappers need React, Tailwind and shadcn — none of which this site has — but
COBE itself is framework-agnostic with zero dependencies, so the library is used
directly and the React layer skipped entirely.

Per `ui-sources`: 21st.dev is priority 2 and licensed per component, so anything
taken from it needs its own licence check. COBE's own MIT licence is what applies
here, not 21st.dev's catalogue entry.
