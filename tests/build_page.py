"""Builds a self-testing copy of the app: index.html plus one test suite.

Usage: build_page.py INDEX_HTML SUITE_JS OUT_HTML

The copy records page errors, runs the suite after the app has started, and
the suite writes its results into <pre id="test-out"> between @@START and @@END.
"""
import sys

src, suite, out = sys.argv[1], sys.argv[2], sys.argv[3]
page = open(src, encoding='utf-8').read()
catch_errors = "<script>window.__errs=[];window.onerror=function(m,u,l){__errs.push(m+' @'+l)};</script>"
page = page.replace('<head>', '<head>' + catch_errors, 1)
end = page.rindex('</body>')
page = page[:end] + '<pre id="test-out"></pre><script>' + open(suite, encoding='utf-8').read() + '</script>' + page[end:]
open(out, 'w', encoding='utf-8').write(page)
