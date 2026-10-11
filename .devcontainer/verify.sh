#!/bin/bash
# Controleert in de container of de beveiliging werkt (fase 2, "klaar als").
# Draai als: factory-verify            (alles behalve Claude-login)
#            factory-verify --claude   (ook een echte vraag aan Claude)
set -uo pipefail

pass=0
fail=0
ok()   { echo "  ok    $1"; pass=$((pass + 1)); }
nok()  { echo "  FOUT  $1"; fail=$((fail + 1)); }
expect_ok()   { local name="$1"; shift; if "$@" >/dev/null 2>&1; then ok "$name"; else nok "$name"; fi; }
expect_fail() { local name="$1"; shift; if "$@" >/dev/null 2>&1; then nok "$name"; else ok "$name"; fi; }

echo "Netwerk"
expect_fail "example.com geblokkeerd"           curl -s --connect-timeout 5 https://example.com
expect_fail "IPv6 geblokkeerd"                  curl -6 -s --connect-timeout 5 https://ipv6.google.com
expect_fail "DNS naar 1.1.1.1 geblokkeerd"      dig +time=3 +tries=1 @1.1.1.1 example.com
expect_ok   "GitHub API bereikbaar"             curl -s --connect-timeout 5 https://api.github.com/zen
expect_ok   "Claude-API bereikbaar"             curl -s --connect-timeout 5 -o /dev/null https://api.anthropic.com
expect_ok   "Claude-docs bereikbaar"            curl -s --connect-timeout 5 -o /dev/null https://code.claude.com/docs/en/overview
expect_ok   "npm-registry bereikbaar"           curl -s --connect-timeout 5 -o /dev/null https://registry.npmjs.org/
expect_ok   "PyPI bereikbaar"                   curl -s --connect-timeout 5 -o /dev/null https://pypi.org/simple/

echo "Afscherming"
expect_fail "allowlist niet schrijfbaar"        test -w /etc/factory/allowlist.txt
expect_fail "managed settings niet schrijfbaar" test -w /etc/claude-code/managed-settings.json
expect_fail "git-hook niet schrijfbaar"         test -w /usr/local/share/factory/git-hooks/pre-push
expect_fail "geen algemene sudo"                sudo -n true
expect_ok   "auto-update uit"                   test "${DISABLE_AUTOUPDATER:-}" = 1
expect_ok   "connectors uit"                    jq -e '.disableClaudeAiConnectors == true' /etc/claude-code/managed-settings.json
expect_ok   "factory-plugin aanwezig"            test -f /opt/software-factory/.claude-plugin/plugin.json
expect_fail "factory-plugin niet schrijfbaar"     touch /opt/software-factory/.schrijftest

echo "Secret-scan bij push"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
git init -q --bare "$tmp/remote.git"
git clone -q "$tmp/remote.git" "$tmp/work" 2>/dev/null
cd "$tmp/work" || exit 1
git config user.name "factory-verify"
git config user.email "verify@factory.invalid"
commit() { git add -A && git commit -qm "$1"; }

echo "hallo" > README.md && commit "schoon"
expect_ok   "schone push gaat door"             git push -q origin HEAD:main

# Nep-token, pas hier gegenereerd zodat het nergens in een repo staat
fake="ghp_$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 36)"
echo "token = \"$fake\"" > config.txt && commit "nep-secret"
expect_fail "nep-secret blokkeert push"         git push -q origin HEAD:main
git reset -q --hard HEAD~1

echo "DATABASE_URL=postgres://localhost/test" > .env && commit "env-bestand"
expect_fail ".env blokkeert push"               git push -q origin HEAD:main
git reset -q --hard HEAD~1

marker="gitleaks"
echo "x = 1  # ${marker}:allow" > code.py && commit "allow-markering"
expect_fail "allow-markering blokkeert push"    git push -q origin HEAD:main
git reset -q --hard HEAD~1
cd / || exit 1

echo "Claude Code"
expect_ok   "claude start"                      claude --version
if [ "${1:-}" = "--claude" ]; then
    expect_ok "claude antwoordt"                timeout 120 claude -p "Antwoord alleen met: ok"
fi

echo
echo "$pass geslaagd, $fail mislukt"
[ "$fail" -eq 0 ]
