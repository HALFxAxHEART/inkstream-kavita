FROM jvmilazz0/kavita:latest

COPY custom-theme.css /kavita/wwwroot/custom-theme.css
COPY icons/favicon-16x16.png icons/favicon-32x32.png icons/apple-touch-icon.png \
     icons/android-chrome-192x192.png icons/android-chrome-256x256.png \
     icons/favicon.ico /kavita/wwwroot/assets/icons/
COPY icons/logo.png /kavita/wwwroot/assets/images/logo.png

RUN sed -i 's/<title>Kavita<\/title>/<title>InkStream<\/title>/' /kavita/wwwroot/index.html && \
    sed -i 's/"name": "Kavita"/"name": "InkStream"/; s/"short_name": "Kavita"/"short_name": "InkStream"/' /kavita/wwwroot/site.webmanifest && \
    sed -i 's#</head>#<link rel="stylesheet" href="custom-theme.css"></head>#' /kavita/wwwroot/index.html
