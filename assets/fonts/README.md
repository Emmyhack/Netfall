# Vendored fonts

All faces here are licensed under the SIL Open Font License 1.1, subset with
fontTools, with their name-table copyright records retained and the full
licence texts alongside.

| File | Face | What it is |
|---|---|---|
| `archivo-wordmark.woff2` | Archivo (Omnibus-Type), OFL — `OFL.txt` | Static instance at width 112 / weight 700, subset to the wordmark letters N e t f a l |
| `og-outfit-500.ttf` / `og-outfit-600.ttf` | Outfit (Outfit Project Authors), OFL — `OFL-Outfit.txt` | Weights 500 and 600 subset to printable ASCII plus `·`, `—`, `→` for the generated share images. TTF because the image renderer does not accept woff2 |

Why vendored at all: the share images are generated at build time, and a
build must not depend on a font CDN being reachable — one flaky route to it
failed a production build before these files existed.

Regenerate with fontTools: fetch the static instance from Google Fonts,
`Subsetter(populate(text=...))` for the wordmark or
`populate(unicodes=0020-007E,00B7,2014,2192)` for the OG faces, keeping
`name_IDs=['*']`.
