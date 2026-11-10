#!/bin/sh
# Renders the product page assets with headless Chrome. Run from anywhere.
cd "$(dirname "$0")" || exit 1
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
shot() { "$CHROME" --headless --hide-scrollbars --force-device-scale-factor=1 --window-size="$2,$3" \
  --screenshot="$PWD/$1" "file://$PWD/product-page.html"; }
shot header-3840x1646.png 3840 1646
shot search-results-3840x2560.png 3840 2560
