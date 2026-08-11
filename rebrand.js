(function () {
  function fix(text) {
    return text.replace(/Kavita/g, 'InkStream');
  }

  // Kavita's own Angular code calls document.title = "... Kavita" on route
  // changes after the app boots, overriding any static <title> edit - so
  // patch document.title itself rather than the HTML.
  var titleEl = document.querySelector('title');
  if (titleEl) {
    var observer = new MutationObserver(function () {
      var fixed = fix(document.title);
      if (fixed !== document.title) document.title = fixed;
    });
    observer.observe(titleEl, { childList: true });
  }

  // Catch-all: any other stray "Kavita" text node the app renders
  function fixTextNodes(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue && node.nodeValue.indexOf('Kavita') !== -1) {
        node.nodeValue = fix(node.nodeValue);
      }
    }
  }

  var bodyObserver = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      mutations[i].addedNodes.forEach(function (n) {
        if (n.nodeType === Node.TEXT_NODE && n.nodeValue.indexOf('Kavita') !== -1) {
          n.nodeValue = fix(n.nodeValue);
        } else if (n.nodeType === Node.ELEMENT_NODE) {
          fixTextNodes(n);
        }
      });
    }
  });

  // Kavita has no concept of browsing/searching source sites (Asura Scans,
  // Webtoons, etc.) - that only exists in the old app (Suwayomi). Rather than
  // depend on Kavita's internal Angular DOM structure (fragile, breaks on
  // updates), add a standalone floating button that opens the old app in an
  // in-page overlay panel (iframe), so it feels like part of this app instead
  // of navigating away to a separate site.
  function addDiscoverButton() {
    if (document.getElementById('inkstream-discover-btn')) return;

    var btn = document.createElement('button');
    btn.id = 'inkstream-discover-btn';
    btn.textContent = '+ Discover New Series';
    btn.style.cssText = [
      'position:fixed', 'right:1.25rem', 'bottom:1.25rem', 'z-index:9999',
      'background:linear-gradient(135deg,#3060ad,#b64499)', 'color:#fff',
      'padding:.75rem 1.1rem', 'border:none', 'border-radius:2rem',
      'font-family:sans-serif', 'font-size:.9rem', 'font-weight:600',
      'box-shadow:0 .25rem .75rem rgba(0,0,0,.4)', 'cursor:pointer'
    ].join(';');

    var overlay = document.createElement('div');
    overlay.id = 'inkstream-discover-overlay';
    overlay.style.cssText = [
      'display:none', 'position:fixed', 'inset:0', 'z-index:10000',
      'background:#16191f'
    ].join(';');

    var closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Close Discover';
    closeBtn.style.cssText = [
      'position:absolute', 'top:.75rem', 'right:.75rem', 'z-index:10001',
      'background:linear-gradient(135deg,#3060ad,#b64499)', 'color:#fff',
      'border:none', 'border-radius:1.5rem', 'padding:.6rem 1rem',
      'font-family:sans-serif', 'font-size:.85rem', 'font-weight:600',
      'box-shadow:0 .2rem .5rem rgba(0,0,0,.4)', 'cursor:pointer'
    ].join(';');

    var iframe = document.createElement('iframe');
    iframe.title = 'Discover New Series';
    iframe.style.cssText = 'width:100%;height:100%;border:0;';
    // Lazy-load the iframe src on first open so it doesn't load on every page.

    function open() {
      if (!iframe.src) iframe.src = 'https://discover.stapulasolutions.com';
      overlay.style.display = 'block';
    }
    function close() {
      overlay.style.display = 'none';
    }

    btn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);

    overlay.appendChild(closeBtn);
    overlay.appendChild(iframe);
    document.body.appendChild(btn);
    document.body.appendChild(overlay);
  }

  function start() {
    fixTextNodes(document.body);
    bodyObserver.observe(document.body, { childList: true, subtree: true });
    addDiscoverButton();
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
