# Gebaseerd op de referentie-devcontainer van Claude Code:
# https://github.com/anthropics/claude-code/tree/d945a61bc6346abce607252d5667df8a3bf0461a/.devcontainer
# Afwijkingen: node:22, vaste Claude Code-versie, gitleaks, managed settings en
# een allowlist die als root in de image staat.
FROM node:22

ARG TZ
ENV TZ="$TZ"

ARG CLAUDE_CODE_VERSION=2.1.296

# Install basic development tools and iptables/ipset
RUN apt-get update && apt-get install -y --no-install-recommends \
  less \
  git \
  procps \
  sudo \
  fzf \
  zsh \
  man-db \
  unzip \
  gnupg2 \
  gh \
  iptables \
  ipset \
  iproute2 \
  dnsutils \
  aggregate \
  jq \
  nano \
  vim \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Ensure default node user has access to /usr/local/share
RUN mkdir -p /usr/local/share/npm-global && \
  chown -R node:node /usr/local/share/npm-global

ARG USERNAME=node

# Persist bash history.
RUN SNIPPET="export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
  && mkdir /commandhistory \
  && touch /commandhistory/.bash_history \
  && chown -R $USERNAME /commandhistory

# Set `DEVCONTAINER` environment variable to help with orientation
ENV DEVCONTAINER=true

# Create workspace and config directories and set permissions
RUN mkdir -p /workspace /home/node/.claude && \
  chown -R node:node /workspace /home/node/.claude

WORKDIR /workspace

ARG GIT_DELTA_VERSION=0.18.2
RUN ARCH=$(dpkg --print-architecture) && \
  wget "https://github.com/dandavison/delta/releases/download/${GIT_DELTA_VERSION}/git-delta_${GIT_DELTA_VERSION}_${ARCH}.deb" && \
  dpkg -i "git-delta_${GIT_DELTA_VERSION}_${ARCH}.deb" && \
  rm "git-delta_${GIT_DELTA_VERSION}_${ARCH}.deb"

# Gitleaks, met controle van de checksum uit de release
ARG GITLEAKS_VERSION=8.30.1
ARG GITLEAKS_SHA256_X64=551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb
ARG GITLEAKS_SHA256_ARM64=e4a487ee7ccd7d3a7f7ec08657610aa3606637dab924210b3aee62570fb4b080
RUN case "$(dpkg --print-architecture)" in \
    amd64) GL_ARCH=x64; GL_SHA="$GITLEAKS_SHA256_X64" ;; \
    arm64) GL_ARCH=arm64; GL_SHA="$GITLEAKS_SHA256_ARM64" ;; \
    *) echo "Niet-ondersteunde architectuur" >&2; exit 1 ;; \
  esac && \
  GL_TAR="gitleaks_${GITLEAKS_VERSION}_linux_${GL_ARCH}.tar.gz" && \
  wget -q "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/${GL_TAR}" && \
  echo "${GL_SHA}  ${GL_TAR}" | sha256sum -c - && \
  tar -xzf "${GL_TAR}" -C /usr/local/bin gitleaks && \
  rm "${GL_TAR}"

# Factory-bestanden: allowlist, gitleaks-config, git-hook en managed settings.
# Alles eigendom van root, zodat een agent ze niet kan aanpassen.
COPY allowlist.txt gitleaks.toml /etc/factory/
COPY pre-push /usr/local/share/factory/git-hooks/pre-push
COPY managed-settings.json /etc/claude-code/managed-settings.json
COPY verify.sh /usr/local/bin/factory-verify
RUN chmod 0644 /etc/factory/* /etc/claude-code/managed-settings.json && \
  chmod 0755 /usr/local/share/factory/git-hooks/pre-push /usr/local/bin/factory-verify && \
  git config --system core.hooksPath /usr/local/share/factory/git-hooks && \
  git config --system credential.https://github.com.helper "" && \
  git config --system --add credential.https://github.com.helper "!gh auth git-credential"

# Set up non-root user
USER node

# Install global packages
ENV NPM_CONFIG_PREFIX=/usr/local/share/npm-global
ENV PATH=$PATH:/usr/local/share/npm-global/bin

# Set the default shell to zsh rather than sh
ENV SHELL=/bin/zsh

# Set the default editor and visual
ENV EDITOR=nano
ENV VISUAL=nano

# Default powerline10k theme
ARG ZSH_IN_DOCKER_VERSION=1.2.0
RUN sh -c "$(wget -O- https://github.com/deluan/zsh-in-docker/releases/download/v${ZSH_IN_DOCKER_VERSION}/zsh-in-docker.sh)" -- \
  -p git \
  -p fzf \
  -a "source /usr/share/doc/fzf/examples/key-bindings.zsh" \
  -a "source /usr/share/doc/fzf/examples/completion.zsh" \
  -a "export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
  -x

# Install Claude
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}

# Copy and set up firewall script
COPY init-firewall.sh /usr/local/bin/
USER root
RUN chmod 0755 /usr/local/bin/init-firewall.sh && \
  echo "node ALL=(root) NOPASSWD: /usr/local/bin/init-firewall.sh" > /etc/sudoers.d/node-firewall && \
  chmod 0440 /etc/sudoers.d/node-firewall
USER node
