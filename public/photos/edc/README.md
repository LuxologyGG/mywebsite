# Everyday Carry images

Drop transparent-background product images here using these exact filenames and
they'll automatically replace the emoji placeholders in the Overview → Everyday
Carry section. WebP preferred (smaller); PNG also works if you rename to `.webp`
or update the path in `index.html` (`EDC_ITEMS`).

| File | Item |
|------|------|
| `iphone-15-pro.webp` | iPhone 15 Pro |
| `airpods-pro.webp` | AirPods Pro 2 |
| `owala.webp` | Owala FreeSip (black on black) |
| `ember.webp` | Ember Mug² |
| `chrome-hearts.webp` | Chrome Hearts Evangelist glasses |
| `ipad-pro.webp` | iPad Pro 13″ (M2) |
| `macbook-air.webp` | MacBook Air M4 |
| `omega-seamaster.webp` | Omega Seamaster Diver 300M 42mm |
| `casio-ae1200.webp` | Casio AE-1200WHD-7AV |

Square-ish, centered, transparent background works best (they're shown in a
46×46 rounded tile with `object-fit: contain`). If an image is missing the card
gracefully falls back to its emoji glyph.
