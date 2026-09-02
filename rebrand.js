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

  // Single Discover entry point, shown on every page EXCEPT the "My
  // Library" grid (/grid) - that page IS the library, so a "find something"
  // button there is redundant/confusing. Kavita is a single-page app, so
  // route changes don't reload this script; visibility is re-checked on
  // every navigation via the poll in start().
  function isLibraryPage() {
    return location.pathname.replace(/\/+$/, '').indexOf('/grid') === 0;
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

  // Discover / chat assistant: ONE floating button + panel, wired to a small
  // locked-down backend (inkstream-assistant) that can only search the
  // library/sources and add a title - never delete/edit anything. Reuses
  // Kavita's own login (the token it already stores in localStorage under
  // "kavita-user") so the assistant isn't reachable by anyone who isn't
  // already a logged-in user. This replaced two separate floating buttons
  // (a plain "+ Discover New Series" link and a chat bubble) - the backend
  // itself always checks the existing library before reaching for the AI
  // source search, so this one button covers both "is it here" and "find it
  // for me" without the user needing to pick which button to press.
  var ASSISTANT_URL = 'https://inkstream-assistant.stapulasolutions.com';
  var chatHistory = [];

  function getKavitaToken() {
    try {
      var raw = localStorage.getItem('kavita-user');
      if (!raw) return null;
      return JSON.parse(raw).token || null;
    } catch (e) { return null; }
  }

  function addChatWidget() {
    if (document.getElementById('inkstream-chat-btn')) return;

    var btn = document.createElement('button');
    btn.id = 'inkstream-chat-btn';
    btn.setAttribute('aria-label', 'Discover - find or add a story');
    btn.innerHTML = '&#128269; Discover';
    btn.style.cssText = [
      'position:fixed', 'right:1.25rem', 'bottom:1.25rem', 'z-index:9999',
      'border:none', 'background:linear-gradient(135deg,#3060ad,#b64499)', 'color:#fff',
      'padding:.75rem 1.1rem', 'border-radius:2rem', 'font-family:sans-serif',
      'font-size:.9rem', 'font-weight:600',
      'box-shadow:0 .25rem .75rem rgba(0,0,0,.4)', 'cursor:pointer'
    ].join(';');

    var panel = document.createElement('div');
    panel.id = 'inkstream-chat-panel';
    panel.style.cssText = [
      'position:fixed', 'right:1.25rem', 'bottom:5rem', 'z-index:9999',
      'width:min(22rem,90vw)', 'height:min(28rem,70vh)', 'display:none',
      'flex-direction:column', 'background:#202122', 'color:#efefef',
      'border-radius:.75rem', 'overflow:hidden', 'box-shadow:0 .5rem 2rem rgba(0,0,0,.5)',
      'font-family:sans-serif', 'font-size:.85rem'
    ].join(';');
    panel.innerHTML =
      '<div style="padding:.75rem 1rem;background:linear-gradient(135deg,#3060ad,#b64499);font-weight:600">' +
        'Find something to read' +
      '</div>' +
      '<div id="inkstream-chat-log" style="flex:1;overflow-y:auto;padding:.75rem;display:flex;flex-direction:column;gap:.5rem"></div>' +
      '<form id="inkstream-chat-form" style="display:flex;border-top:1px solid rgba(255,255,255,.1)">' +
        '<input id="inkstream-chat-input" placeholder="Looking for a story..." autocomplete="off" ' +
          'style="flex:1;padding:.6rem;border:none;background:#353535;color:#fff" />' +
        '<button type="submit" style="padding:.6rem .9rem;border:none;background:#3060ad;color:#fff;cursor:pointer">Send</button>' +
      '</form>';

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    btn.addEventListener('click', function () {
      panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
    });

    function addBubble(text, who) {
      var log = document.getElementById('inkstream-chat-log');
      var b = document.createElement('div');
      b.textContent = text;
      b.style.cssText = [
        'max-width:85%', 'padding:.5rem .75rem', 'border-radius:.75rem', 'white-space:pre-wrap',
        who === 'user'
          ? 'align-self:flex-end;background:#3060ad;color:#fff'
          : 'align-self:flex-start;background:#353535;color:#efefef'
      ].join(';');
      log.appendChild(b);
      log.scrollTop = log.scrollHeight;
    }

    panel.querySelector('#inkstream-chat-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = document.getElementById('inkstream-chat-input');
      var text = input.value.trim();
      if (!text) return;
      var token = getKavitaToken();
      if (!token) {
        addBubble('Please log in first.', 'assistant');
        return;
      }
      input.value = '';
      addBubble(text, 'user');
      chatHistory.push({ role: 'user', content: text });
      addBubble('...', 'assistant-pending');

      fetch(ASSISTANT_URL + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ message: text, history: chatHistory.slice(0, -1) })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var pending = document.querySelector('#inkstream-chat-log div:last-child');
          if (pending && pending.textContent === '...') pending.remove();
          var reply = data.reply || data.error || 'Something went wrong, try again.';
          addBubble(reply, 'assistant');
          chatHistory.push({ role: 'assistant', content: reply });
        })
        .catch(function () {
          var pending = document.querySelector('#inkstream-chat-log div:last-child');
          if (pending && pending.textContent === '...') pending.remove();
          addBubble('Assistant is unavailable right now.', 'assistant');
        });
    });
  }

  function updateChatWidgetVisibility() {
    var btn = document.getElementById('inkstream-chat-btn');
    var panel = document.getElementById('inkstream-chat-panel');
    if (!btn) return;
    var hide = isLibraryPage();
    btn.style.display = hide ? 'none' : '';
    if (hide && panel) panel.style.display = 'none';
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
      try { addChatWidget(); } catch (e) {}
      if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        updateChatWidgetVisibility();
      }
      var chapterTabActive = isChapterTabActive();
      if (chapterTabActive && !wasChapterTabActive) {
        scrollToNewestChapter();
        setTimeout(scrollToNewestChapter, 500);
      }
      wasChapterTabActive = chapterTabActive;
    }, 300);
    addGridSidebarLink();
    addChatWidget();
    updateChatWidgetVisibility();
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
