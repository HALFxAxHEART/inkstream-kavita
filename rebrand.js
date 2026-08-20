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

    // Kavita 0.8.7 nests nav items below .side-nav, so homeItem.nextSibling
    // is NOT a child of .side-nav - insert into homeItem's ACTUAL parent, and
    // guard everything so a DOM mismatch can never throw (a throw here would
    // also block the Discover button, which runs after this in the poll).
    try {
      var homeItem = sideNav.querySelector('a[href="/home/"], a[href="/home"]');
      if (homeItem && homeItem.parentNode) {
        homeItem.parentNode.insertBefore(a, homeItem.nextSibling);
      } else {
        var anyItem = sideNav.querySelector('a.side-nav-item');
        if (anyItem && anyItem.parentNode) {
          anyItem.parentNode.insertBefore(a, anyItem.nextSibling);
        } else {
          sideNav.appendChild(a);
        }
      }
    } catch (e) {
      try { sideNav.appendChild(a); } catch (e2) {}
    }
  }

  // Series detail pages list chapters oldest-first inside an Angular
  // virtual-scroller, with no built-in reverse/sort toggle - reversing the
  // DOM order would fight the virtual-scroller's internal positioning, so
  // instead we jump the page's real scroll container (.companion-bar, the
  // same element the browser's own scrollbar drives - confirmed via direct
  // testing) to the bottom whenever the "Chapter" tab becomes active, so the
  // newest chapter is on screen immediately instead of requiring a scroll.
  function isChapterTabActive() {
    var chapterTab = Array.prototype.find.call(
      document.querySelectorAll('a[role="tab"]'),
      function (a) { return /^\s*Chapter\b/.test(a.textContent); },
    );
    return !!(chapterTab && chapterTab.getAttribute('aria-selected') === 'true');
  }

  function scrollToNewestChapter() {
    var scroller = document.querySelector('.companion-bar');
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
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
    var wasChapterTabActive = false;
    setInterval(function () {
      try { addGridSidebarLink(); } catch (e) {}
      if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        updateDiscoverButtonVisibility();
      }
      var chapterTabActive = isChapterTabActive();
      if (chapterTabActive && !wasChapterTabActive) {
        scrollToNewestChapter();
        setTimeout(scrollToNewestChapter, 500);
      }
      wasChapterTabActive = chapterTabActive;
    }, 300);
    updateDiscoverButtonVisibility();
    addGridSidebarLink();
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
