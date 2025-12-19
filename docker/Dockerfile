FROM ymonnier/sdkman-java:latest
LABEL authors="chol"

# Install bash, C++ compiler and build tools using Alpine packages
RUN apk update \
    && apk add --no-cache \
    bash \
    build-base \
    g++ \
    gcc \
    make \
    cmake \
    curl \
    && rm -rf /var/cache/apk/*

# Set bash as the default shell
SHELL ["/bin/bash", "-c"]


# Install rustup and Rust with gnu target
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --default-host x86_64-unknown-linux-gnu \
    && . $HOME/.cargo/env \
    && rustup component add rustfmt clippy \
    && rm -rf /tmp/*

# Set environment variables for Rust
ENV PATH="/root/.cargo/bin:${PATH}"
ENV RUSTUP_HOME="/root/.rustup"
ENV CARGO_HOME="/root/.cargo"



CMD ["/bin/bash"]