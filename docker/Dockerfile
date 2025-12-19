FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl bash zip unzip build-essential gcc g++ rustc golang ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN curl -s 'https://get.sdkman.io' | bash && \
    bash -c "source /root/.sdkman/bin/sdkman-init.sh && \
      for v in 8.0.402-tem 11.0.23-tem 17.0.11-tem 21.0.3-tem 25.0.1-tem; do sdk install java \$v; done"
