#!/bin/sh
# Gera index.html (home do GitHub Pages) embrulhando share.html num documento
# HTML completo. share.html é escrito sem <head> porque é a fonte do artifact do
# Claude, que injeta o wrapper; servido direto pelo Pages ele precisa do head.
# O <title> é movido de share.html para o <head>, onde é válido.
set -e
cd "$(dirname "$0")"

TITULO=$(sed -n 's:.*<title>\(.*\)</title>.*:\1:p' share.html | head -1)
[ -n "$TITULO" ] || { echo "erro: share.html sem <title>" >&2; exit 1; }

{
  echo '<!doctype html>'
  echo '<html lang="en">'
  echo '<head>'
  echo '<meta charset="utf-8">'
  echo '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
  echo '<meta name="theme-color" content="#060C1A">'
  echo '<meta name="robots" content="noindex, nofollow">'
  echo "<title>$TITULO</title>"
  echo '</head>'
  echo '<body>'
  grep -v '<title>' share.html
  echo '</body>'
  echo '</html>'
} > index.html

echo "index.html gerado ($(wc -c < index.html | tr -d ' ') bytes) - titulo: $TITULO"
