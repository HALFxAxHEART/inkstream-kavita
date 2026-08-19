FROM jvmilazz0/kavita:0.8.7

COPY custom-theme.css /kavita/wwwroot/custom-theme.css
COPY rebrand.js /kavita/wwwroot/rebrand.js
COPY icons/favicon-16x16.png icons/favicon-32x32.png icons/apple-touch-icon.png \
     icons/android-chrome-192x192.png icons/android-chrome-256x256.png \
     icons/favicon.ico /kavita/wwwroot/assets/icons/
COPY icons/logo.png /kavita/wwwroot/assets/images/logo.png
COPY icons/logo-32.png /kavita/wwwroot/assets/images/logo-32.png

# Kavita's static file server sets a 24h Cache-Control on everything in
# wwwroot (not something we can override from outside), which meant every
# fix to custom-theme.css/rebrand.js could take up to a day to reach an
# installed PWA. ASSET_VERSION busts that - bump it on every change to
# either file so browsers are forced to fetch the new copy immediately.
ARG ASSET_VERSION=5

RUN sed -i 's/<title>Kavita<\/title>/<title>InkStream<\/title>/' /kavita/wwwroot/index.html && \
    sed -i 's/"name": "Kavita"/"name": "InkStream"/; s/"short_name": "Kavita"/"short_name": "InkStream"/' /kavita/wwwroot/site.webmanifest && \
    sed -i "s#</head>#<link rel=\"stylesheet\" href=\"custom-theme.css?v=${ASSET_VERSION}\"></head>#" /kavita/wwwroot/index.html && \
    sed -i "s#</body>#<script src=\"rebrand.js?v=${ASSET_VERSION}\"></script></body>#" /kavita/wwwroot/index.html
