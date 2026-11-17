#!/bin/bash
# Runs the test suites against index.html in headless Chrome.
#
#   tests/run.sh                 run every suite
#   tests/run.sh storage_backup  run one or more named suites
#
# Needs Chrome (or Chromium) and python3. Set CHROME=/path/to/chrome if it is
# not found. Exits non-zero if any check fails.
set -u
cd "$(dirname "$0")/.."

CHROME="${CHROME:-$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || command -v chromium-browser || true)}"
if [ -z "$CHROME" ]; then
  echo "No Chrome found. Set CHROME=/path/to/chrome"
  exit 2
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if [ "$#" -gt 0 ]; then
  suites=("$@")
else
  suites=()
  for f in tests/suites/*.js; do suites+=("$(basename "$f" .js)"); done
fi

failed=0
total=0
for t in "${suites[@]}"; do
  if ! python3 tests/build_page.py index.html "tests/suites/$t.js" "$TMP/$t.html"; then
    echo "FAIL  $t (could not build the test page)"
    failed=1
    continue
  fi
  # Each suite gets a fresh browser profile, so saved data never leaks between suites
  "$CHROME" --headless --disable-gpu --no-first-run --no-sandbox \
    --user-data-dir="$TMP/profile-$t" --virtual-time-budget=4000 \
    --dump-dom "file://$TMP/$t.html" 2>/dev/null > "$TMP/$t.dom"
  sed -n '/@@START/,/@@END/p' "$TMP/$t.dom" | sed 's/&gt;/>/g; s/&lt;/</g; s/&amp;/\&/g' > "$TMP/$t.out"
  ok=$(grep -c '^ok ' "$TMP/$t.out")
  total=$((total + ok))
  if grep -q '^RESULT: ALL PASSED' "$TMP/$t.out"; then
    echo "PASS  $t ($ok checks)"
  else
    echo "FAIL  $t"
    grep -A2 '^FAIL\|^EXCEPTION\|^PAGE ERRORS' "$TMP/$t.out"
    [ -s "$TMP/$t.out" ] || echo "      no result: the page did not finish loading or the suite did not report"
    failed=1
  fi
done

echo "$total checks passed"
exit $failed
