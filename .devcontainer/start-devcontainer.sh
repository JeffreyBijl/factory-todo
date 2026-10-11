#!/bin/bash
# Start de factory-devcontainer vanaf de host (macOS). Het factory-token komt
# uit de Keychain en gaat alleen als omgevingsvariabele naar de container;
# er wordt geen bestand met de waarde geschreven.
#
# Gebruik: .devcontainer/start-devcontainer.sh [up|shell|claude|verify] [args]
#
# Eenmalig het token in de Keychain zetten (vraagt om de waarde):
#   security add-generic-password -s software-factory-gh-token -a "$USER" -w
set -euo pipefail

service="${FACTORY_KEYCHAIN_SERVICE:-software-factory-gh-token}"
workspace="$(cd "$(dirname "$0")/.." && pwd)"
cmd="${1:-up}"
shift || true

if ! command -v devcontainer >/dev/null 2>&1; then
    echo "De devcontainer-CLI ontbreekt: npm install -g @devcontainers/cli" >&2
    exit 1
fi

# De plugin van de factory op de host; in de container alleen-lezen op /opt/software-factory.
FACTORY_PLUGIN_DIR="${FACTORY_PLUGIN_DIR:-$HOME/development/software-factory/plugin}"
if [ ! -f "$FACTORY_PLUGIN_DIR/.claude-plugin/plugin.json" ]; then
    echo "Geen plugin van de factory in $FACTORY_PLUGIN_DIR; zet FACTORY_PLUGIN_DIR op de map plugin/ van de factory-repo." >&2
    exit 1
fi
export FACTORY_PLUGIN_DIR

if FACTORY_GH_TOKEN=$(security find-generic-password -s "$service" -w 2>/dev/null); then
    export FACTORY_GH_TOKEN
else
    echo "Let op: geen token '$service' in de Keychain; gh en git push werken dan niet." >&2
    export FACTORY_GH_TOKEN=""
fi

# Interactief via docker exec -it: devcontainer exec geeft toetsen niet goed
# door aan een TUI zoals Claude Code. GH_TOKEN gaat alleen als naam mee op de
# commandoregel; docker leest de waarde uit de omgeving.
interactive() {
    local container
    container=$(docker ps -q --filter "label=devcontainer.local_folder=$workspace" | head -n 1)
    if [ -z "$container" ]; then
        echo "Geen draaiende container voor $workspace; start eerst met: $0 up" >&2
        exit 1
    fi
    GH_TOKEN="$FACTORY_GH_TOKEN" docker exec -it -u node -w /workspace \
        -e GH_TOKEN -e LC_ALL=C.UTF-8 "$container" "$@"
}

case "$cmd" in
    up)     devcontainer up --workspace-folder "$workspace" "$@" ;;
    shell)  interactive zsh "$@" ;;
    claude) interactive claude --plugin-dir /opt/software-factory "$@" ;;
    verify) devcontainer exec --workspace-folder "$workspace" factory-verify "$@" ;;
    *)      echo "Onbekend commando: $cmd (up, shell, claude, verify)" >&2; exit 1 ;;
esac
