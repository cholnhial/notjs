FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl bash zip unzip build-essential gcc g++ rustc golang ca-certificates maven && \
    rm -rf /var/lib/apt/lists/*

RUN curl -s 'https://get.sdkman.io' | bash && \
    bash -c "source /root/.sdkman/bin/sdkman-init.sh && \
      for v in 8.0.402-tem 11.0.23-tem 17.0.11-tem 21.0.3-tem 25.0.1-tem; do sdk install java \$v; done"

WORKDIR /app

COPY pom.xml .
COPY src ./src
COPY packages ./packages

RUN JAVA_HOME=/root/.sdkman/candidates/java/25.0.1-tem mvn clean package -DskipTests -Pprod

CMD ["/root/.sdkman/candidates/java/25.0.1-tem/bin/java", "-jar", "/app/target/notjs-0.0.1-SNAPSHOT.jar"]
