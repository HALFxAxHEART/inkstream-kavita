FROM jvmilazz0/kavita:latest

RUN sed -i 's/<title>Kavita<\/title>/<title>InkStream<\/title>/' /kavita/wwwroot/index.html && \
    sed -i 's/"name": "Kavita"/"name": "InkStream"/; s/"short_name": "Kavita"/"short_name": "InkStream"/' /kavita/wwwroot/site.webmanifest
