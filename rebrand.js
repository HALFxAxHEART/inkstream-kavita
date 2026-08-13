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
  // Webtoons, etc.) - that's handled by discover-app, a small page built to
  // match InkStream's own branding, served at /discover on this SAME domain
  // (not a separate site/iframe) via Traefik path routing. Only shown on the
  // main/home page ('' and 'libraries' both redirect to 'home' per Kavita's
  // own routing config) - Kavita is a single-page app, so route changes don't
  // reload this script; visibility has to be re-checked on every navigation.
  function isMainPage() {
    var p = location.pathname.replace(/\/+$/, '');
    return p === '' || p === '/home';
  }

  function addDiscoverButton() {
    if (document.getElementById('inkstream-discover-btn')) return null;
    var a = document.createElement('a');
    a.id = 'inkstream-discover-btn';
    a.href = '/discover';
    a.textContent = '+ Discover New Series';
    a.style.cssText = [
      'position:fixed', 'right:1.25rem', 'bottom:1.25rem', 'z-index:9999',
      'background:linear-gradient(135deg,#3060ad,#b64499)', 'color:#fff',
      'padding:.75rem 1.1rem', 'border-radius:2rem', 'font-family:sans-serif',
      'font-size:.9rem', 'font-weight:600', 'text-decoration:none',
      'box-shadow:0 .25rem .75rem rgba(0,0,0,.4)', 'cursor:pointer'
    ].join(';');
    document.body.appendChild(a);
    return a;
  }

  function updateDiscoverButtonVisibility() {
    var btn = document.getElementById('inkstream-discover-btn') || addDiscoverButton();
    btn.style.display = isMainPage() ? '' : 'none';
  }

  function watchRouteChanges(onChange) {
    var origPushState = history.pushState;
    var origReplaceState = history.replaceState;
    history.pushState = function () {
      origPushState.apply(this, arguments);
      onChange();
    };
    history.replaceState = function () {
      origReplaceState.apply(this, arguments);
      onChange();
    };
    window.addEventListener('popstate', onChange);
  }

  function start() {
    fixTextNodes(document.body);
    bodyObserver.observe(document.body, { childList: true, subtree: true });
    updateDiscoverButtonVisibility();
    watchRouteChanges(updateDiscoverButtonVisibility);
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
