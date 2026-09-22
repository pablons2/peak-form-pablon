"use strict";

/*
 * Guia do Usuário PeakForm — comportamento interativo.
 * Sem dependências externas, sem build: roda direto em file://.
 * Cada seção abaixo é independente e falha de forma isolada (nenhum bloco
 * derruba os outros se algo faltar no DOM).
 */

document.addEventListener("DOMContentLoaded", function () {
  initMobileMenu();
  initCollapsibleChapters();
  initActiveNavOnScroll();
  initFilters();
  initSearch();
  initBackToTop();
});

/* ==========================================================================
   Menu mobile (sidebar deslizante)
   ========================================================================== */
function initMobileMenu() {
  var toggle = document.getElementById("menuToggle");
  var sidebar = document.getElementById("sidebar");
  var backdrop = document.getElementById("sidebarBackdrop");
  if (!toggle || !sidebar || !backdrop) return;

  function openMenu() {
    sidebar.classList.add("is-open");
    backdrop.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }

  function closeMenu() {
    sidebar.classList.remove("is-open");
    backdrop.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  toggle.addEventListener("click", function () {
    var isOpen = sidebar.classList.contains("is-open");
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  backdrop.addEventListener("click", closeMenu);

  // Fecha com Escape, e devolve o foco ao botão que abriu o menu.
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && sidebar.classList.contains("is-open")) {
      closeMenu();
      toggle.focus();
    }
  });

  // Fecha automaticamente ao navegar para uma seção (mobile).
  sidebar.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      if (window.matchMedia("(max-width: 1023px)").matches) {
        closeMenu();
      }
    });
  });

  // Se a viewport crescer para desktop enquanto o menu mobile está aberto,
  // normaliza o estado para não deixar o overlay travado.
  window.addEventListener("resize", function () {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      closeMenu();
    }
  });
}

/* ==========================================================================
   Capítulos colapsáveis (acordeão acessível via aria-expanded)
   ========================================================================== */
function initCollapsibleChapters() {
  var toggles = document.querySelectorAll(".chapter__toggle");
  toggles.forEach(function (button) {
    button.addEventListener("click", function () {
      var expanded = button.getAttribute("aria-expanded") === "true";
      var bodyId = button.getAttribute("aria-controls");
      var body = bodyId ? document.getElementById(bodyId) : null;
      if (!body) return;

      button.setAttribute("aria-expanded", String(!expanded));
      body.hidden = expanded;
    });
  });

  // Se a página abrir com um link direto para #prd-XX (ou #prd-XX-body),
  // garante que aquele capítulo já esteja expandido e visível.
  expandChapterFromHash(location.hash);
  window.addEventListener("hashchange", function () {
    expandChapterFromHash(location.hash);
  });
}

function expandChapterFromHash(hash) {
  if (!hash) return;
  var id = hash.replace("#", "");
  var chapter = document.getElementById(id) || document.getElementById(id + "-body");
  if (!chapter) return;

  var article = chapter.closest ? chapter.closest(".chapter") : null;
  var target = article || (chapter.classList.contains("chapter") ? chapter : null);
  if (!target) return;

  var button = target.querySelector(".chapter__toggle");
  var body = target.querySelector(".chapter__body");
  if (button && body) {
    button.setAttribute("aria-expanded", "true");
    body.hidden = false;
  }
}

/* ==========================================================================
   Navegação ativa conforme rolagem (destaca o item correspondente)
   ========================================================================== */
function initActiveNavOnScroll() {
  var sections = document.querySelectorAll("main [id]");
  var links = document.querySelectorAll(".sidebar__link");
  if (!sections.length || !links.length || !("IntersectionObserver" in window)) return;

  var linkByHash = {};
  links.forEach(function (link) {
    linkByHash[link.getAttribute("href")] = link;
  });

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        var hash = "#" + entry.target.id;
        var link = linkByHash[hash];
        if (!link) return;

        if (entry.isIntersecting) {
          links.forEach(function (l) {
            l.classList.remove("is-active");
          });
          link.classList.add("is-active");
        }
      });
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
  );

  sections.forEach(function (section) {
    if ("#" + section.id in linkByHash) {
      observer.observe(section);
    }
  });
}

/* ==========================================================================
   Filtros por papel e por status (estilo multi-seleção via checkboxes)
   ========================================================================== */
function initFilters() {
  var roleInputs = document.querySelectorAll(".filter-role");
  var statusInputs = document.querySelectorAll(".filter-status");
  var chapters = document.querySelectorAll(".chapter");
  var resetButton = document.getElementById("resetFilters");
  var countOutput = document.getElementById("filterResultCount");
  if (!chapters.length) return;

  function activeValues(inputs) {
    var values = [];
    inputs.forEach(function (input) {
      if (input.checked) values.push(input.value);
    });
    return values;
  }

  function applyFilters() {
    var activeRoles = activeValues(roleInputs);
    var activeStatuses = activeValues(statusInputs);
    var visibleCount = 0;

    chapters.forEach(function (chapter) {
      var chapterRoles = (chapter.dataset.roles || "").split(/\s+/).filter(Boolean);
      var chapterStatus = chapter.dataset.status || "";

      var roleMatches = activeRoles.length === 0 || chapterRoles.some(function (role) {
        return activeRoles.indexOf(role) !== -1;
      });
      var statusMatches = activeStatuses.length === 0 || activeStatuses.indexOf(chapterStatus) !== -1;

      var visible = roleMatches && statusMatches;
      chapter.hidden = !visible;
      if (visible) visibleCount++;
    });

    if (countOutput) {
      countOutput.textContent =
        visibleCount === chapters.length
          ? "Mostrando todos os " + chapters.length + " módulos."
          : "Mostrando " + visibleCount + " de " + chapters.length + " módulos.";
    }
  }

  roleInputs.forEach(function (input) {
    input.addEventListener("change", applyFilters);
  });
  statusInputs.forEach(function (input) {
    input.addEventListener("change", applyFilters);
  });

  if (resetButton) {
    resetButton.addEventListener("click", function () {
      roleInputs.forEach(function (input) {
        input.checked = true;
      });
      statusInputs.forEach(function (input) {
        input.checked = true;
      });
      applyFilters();
    });
  }

  applyFilters();
}

/* ==========================================================================
   Busca por palavra-chave com destaque de resultado
   ========================================================================== */
function initSearch() {
  var input = document.getElementById("searchInput");
  var resultCount = document.getElementById("searchResultCount");
  var chaptersSection = document.getElementById("capitulos");
  if (!input || !chaptersSection) return;

  var searchableItems = Array.prototype.slice.call(
    chaptersSection.querySelectorAll(".chapter")
  );

  var debounceTimer = null;

  input.addEventListener("input", function () {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(runSearch, 150);
  });

  function clearHighlights(root) {
    var marks = root.querySelectorAll("mark.search-hit");
    marks.forEach(function (mark) {
      var text = document.createTextNode(mark.textContent);
      mark.replaceWith(text);
    });
  }

  function highlightMatches(root, term) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var textNodes = [];
    var node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue.trim().length) textNodes.push(node);
    }

    var lowerTerm = term.toLowerCase();
    var found = false;

    textNodes.forEach(function (textNode) {
      var value = textNode.nodeValue;
      var lowerValue = value.toLowerCase();
      var index = lowerValue.indexOf(lowerTerm);
      if (index === -1) return;

      found = true;
      var fragment = document.createDocumentFragment();
      var cursor = 0;
      var searchIndex = index;

      while (searchIndex !== -1) {
        fragment.appendChild(document.createTextNode(value.slice(cursor, searchIndex)));
        var mark = document.createElement("mark");
        mark.className = "search-hit";
        mark.textContent = value.slice(searchIndex, searchIndex + term.length);
        fragment.appendChild(mark);
        cursor = searchIndex + term.length;
        searchIndex = lowerValue.indexOf(lowerTerm, cursor);
      }
      fragment.appendChild(document.createTextNode(value.slice(cursor)));
      textNode.replaceWith(fragment);
    });

    return found;
  }

  function removeNoResultsNotice() {
    var notice = chaptersSection.querySelector(".no-results");
    if (notice) notice.remove();
  }

  function runSearch() {
    var term = input.value.trim();

    searchableItems.forEach(function (chapter) {
      clearHighlights(chapter);
    });
    removeNoResultsNotice();

    if (!term) {
      searchableItems.forEach(function (chapter) {
        chapter.classList.remove("search-hidden");
        chapter.hidden = false;
      });
      if (resultCount) resultCount.textContent = "";
      reapplyActiveFilters();
      return;
    }

    var matchCount = 0;

    searchableItems.forEach(function (chapter) {
      var toggle = chapter.querySelector(".chapter__toggle");
      var body = chapter.querySelector(".chapter__body");

      var matches = highlightMatches(chapter, term);

      if (matches) {
        matchCount++;
        chapter.hidden = false;
        if (toggle && body) {
          toggle.setAttribute("aria-expanded", "true");
          body.hidden = false;
        }
      } else {
        chapter.hidden = true;
      }
    });

    if (resultCount) {
      resultCount.textContent =
        matchCount === 0
          ? 'Nenhum resultado para "' + term + '".'
          : matchCount + " módulo(s) encontrados para \"" + term + '".';
    }

    if (matchCount === 0) {
      var notice = document.createElement("p");
      notice.className = "no-results";
      notice.textContent =
        'Nenhum módulo contém "' + term + '". Tente outro termo ou confira o Glossário e o FAQ mais abaixo na página.';
      chaptersSection.appendChild(notice);
    }
  }

  // Ao limpar a busca, os filtros de papel/status voltam a valer normalmente.
  function reapplyActiveFilters() {
    var event = new Event("change");
    var firstFilter = document.querySelector(".filter-role, .filter-status");
    if (firstFilter) firstFilter.dispatchEvent(event);
  }
}

/* ==========================================================================
   Botão "voltar ao topo"
   ========================================================================== */
function initBackToTop() {
  var button = document.getElementById("backToTop");
  if (!button) return;

  button.addEventListener("click", function () {
    var prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });

    var heading = document.getElementById("hero-title");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus();
    }
  });
}
