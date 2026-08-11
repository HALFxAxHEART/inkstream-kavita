FROM jvmilazz0/kavita:latest

COPY custom-theme.css /kavita/wwwroot/custom-theme.css

RUN sed -i 's/<title>Kavita<\/title>/<title>InkStream<\/title>/' /kavita/wwwroot/index.html && \
    sed -i 's/"name": "Kavita"/"name": "InkStream"/; s/"short_name": "Kavita"/"short_name": "InkStream"/' /kavita/wwwroot/site.webmanifest && \
    sed -i 's#</head>#<link rel="stylesheet" href="custom-theme.css"></head>#' /kavita/wwwroot/index.html
