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

  function makeFloatingLink(id, href, text, bottomRem) {
    var a = document.createElement('a');
    a.id = id;
    a.href = href;
    a.textContent = text;
    a.style.cssText = [
      'position:fixed', 'right:1.25rem', 'bottom:' + bottomRem + 'rem', 'z-index:9999',
      'background:linear-gradient(135deg,#3060ad,#b64499)', 'color:#fff',
      'padding:.75rem 1.1rem', 'border-radius:2rem', 'font-family:sans-serif',
      'font-size:.9rem', 'font-weight:600', 'text-decoration:none',
      'box-shadow:0 .25rem .75rem rgba(0,0,0,.4)', 'cursor:pointer'
    ].join(';');
    document.body.appendChild(a);
    return a;
  }

  function addDiscoverButton() {
    return document.getElementById('inkstream-discover-btn') ||
      makeFloatingLink('inkstream-discover-btn', '/discover', '+ Discover New Series', 1.25);
  }

  function updateDiscoverButtonVisibility() {
    var discoverBtn = addDiscoverButton();
    discoverBtn.style.display = isMainPage() ? '' : 'none';
  }

  // Add "My Library" as a real, permanent item in Kavita's own sidebar
  // (not a floating button) - matches the structure Kavita's own
  // app-side-nav-item component renders, so it looks native.
  function addGridSidebarLink() {
    if (document.getElementById('inkstream-grid-nav-item')) return;
    var sideNav = document.querySelector('.side-nav');
    if (!sideNav) return;

    var a = document.createElement('a');
    a.id = 'inkstream-grid-nav-item';
    a.className = 'side-nav-item';
    a.href = '/grid';
    a.innerHTML =
      '<div class="active-highlight"></div>' +
      '<span class="phone-hidden" title="My Library"><div><i class="fa fa-table-cells" aria-hidden="true"></i></div></span>' +
      '<span class="side-nav-text"><div>My Library</div></span>';

    var homeItem = sideNav.querySelector('a[href="/home/"], a[href="/home"]');
    if (homeItem && homeItem.nextSibling) {
      sideNav.insertBefore(a, homeItem.nextSibling);
    } else {
      sideNav.insertBefore(a, sideNav.firstChild);
    }
  }

  function start() {
    fixTextNodes(document.body);
    bodyObserver.observe(document.body, { childList: true, subtree: true });
    // Hooking history.pushState/replaceState didn't reliably catch Kavita's
    // route changes (likely using the newer Navigation API in some
    // browsers, which bypasses pushState entirely) - polling is crude but
    // can't be missed regardless of how Kavita navigates. Same poll also
    // re-adds the sidebar link if Angular's own re-render ever drops it.
    var lastPath = null;
    setInterval(function () {
      addGridSidebarLink();
      if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        updateDiscoverButtonVisibility();
      }
    }, 300);
    updateDiscoverButtonVisibility();
    addGridSidebarLink();
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
