(function () {
  "use strict";

  // ------------------------------
  // Base path + shared layout
  // ------------------------------
  function resolveBase() {
    // Works on GitHub Pages project sites and local dev.
    // Computes how many folders deep you are, then returns "../" x depth.

    const path = window.location.pathname;

    // Split into parts, remove empty
    const parts = path.split("/").filter(Boolean);

    // If hosted as a GitHub Pages project site:
    // e.g. https://user.github.io/LabContext/...
    // the first part is usually the repo name (LabContext)
    // We treat that as the site root folder.
    const repoName = parts[0] || "";
    const isProjectSite = repoName.toLowerCase() === "labcontext";

    // Build a "relative parts" array that starts AFTER the repo folder
    const relParts = isProjectSite ? parts.slice(1) : parts.slice();

    // If last part is a file (has a dot), don't count it as a folder depth
    const last = relParts[relParts.length - 1] || "";
    const endsWithFile = last.includes(".");

    // If URL ends with "/" (directory), last part is already a folder
    // If URL ends with a file, depth is folders only
    const depth = endsWithFile ? Math.max(0, relParts.length - 1) : relParts.length;

    return depth === 0 ? "./" : "../".repeat(depth);
  }

  function injectFavicon(base) {
    if (document.querySelector('link[rel="icon"]')) return;

    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.href = base + "assets/img/labcontext-logo.svg";
    document.head.appendChild(link);
  }

  async function fetchText(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load " + url);
    return await res.text();
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load " + url);
    return await res.json();
  }

  async function injectSharedLayout(base) {
    // Header
    const header = document.querySelector("header.site-header");
    if (header) {
      try {
        header.innerHTML = await fetchText(base + "assets/partials/header.html");
      } catch (e) {
        console.warn(e);
      }
    }

    // Footer
    const footer = document.querySelector("footer.site-footer");
    if (footer) {
      try {
        footer.innerHTML = await fetchText(base + "assets/partials/footer.html");
      } catch (e) {
        console.warn(e);
      }
    }

    // Fix injected relative links
    document.querySelectorAll("[data-href]").forEach((el) => {
      const href = el.getAttribute("data-href") || "";
      el.setAttribute("href", base + href);
    });

    // Fix injected image src
    document.querySelectorAll("img[data-src]").forEach((img) => {
      const src = img.getAttribute("data-src");
      if (src) img.setAttribute("src", base + src);
    });

    // Year
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    // Active nav
    setActiveNav();

    // Header search → route to /search/?q=
    wireHeaderSearch(base);

    // Homepage search → route to /search/?q=
    wireHomeSearch(base);
  }

  function setActiveNav() {
    const path = window.location.pathname;

    const is = (segment) =>
      path.includes(`/${segment}/`) ||
      path.endsWith(`/${segment}`) ||
      path.includes(`/${segment}.html`);

    document
      .querySelectorAll(".nav-link[data-nav]")
      .forEach((a) => a.classList.remove("is-active"));

    const set = (key) => {
      const a = document.querySelector(`.nav-link[data-nav="${key}"]`);
      if (a) a.classList.add("is-active");
    };

    if (is("in-context")) set("in-context");
    else if (is("education")) set("education");
    else if (is("infographics")) set("infographics");
    else if (is("about")) set("about");
    else if (is("search")) set("search");
    else set("home");
  }

  function wireHeaderSearch(base) {
    const searchForm = document.querySelector(".header-search");
    const searchInput = document.getElementById("site-search");
    if (!searchForm || !searchInput) return;

    // Avoid double-binding if header re-injects for any reason
    if (searchForm.dataset.bound === "1") return;
    searchForm.dataset.bound = "1";

    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = (searchInput.value || "").trim();
      if (!q) return;
      window.location.href = base + "search/?q=" + encodeURIComponent(q);
    });
  }

  function wireHomeSearch(base) {
    const form = document.getElementById("home-search");
    const input = document.getElementById("home-search-input");
    if (!form || !input) return;

    if (form.dataset.bound === "1") return;
    form.dataset.bound = "1";

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = (input.value || "").trim();
      if (!q) return;
      window.location.href = base + "search/?q=" + encodeURIComponent(q);
    });
  }

  // ------------------------------
  // Shared UI helpers
  // ------------------------------
  function uniqueFromKey(items, key) {
    const set = new Set();
    items.forEach((i) => (i[key] || []).forEach((v) => set.add(v)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  function makeCard({ title, meta, summary, tags, href }) {
    const a = document.createElement("a");
    a.className = "post-card";
    a.href = href || "#";

    if (meta) {
      const m = document.createElement("div");
      m.className = "post-meta";
      m.textContent = meta;
      a.appendChild(m);
    }

    const t = document.createElement("div");
    t.className = "post-title";
    t.textContent = title || "";
    a.appendChild(t);

    if (summary) {
      const s = document.createElement("div");
      s.className = "post-summary";
      s.textContent = summary;
      a.appendChild(s);
    }

    if (tags && tags.length) {
      const wrap = document.createElement("div");
      wrap.className = "post-tags";
      tags.slice(0, 5).forEach((tag) => {
        const chip = document.createElement("span");
        chip.className = "tag";
        chip.textContent = tag;
        wrap.appendChild(chip);
      });
      a.appendChild(wrap);
    }

    return a;
  }

  function renderEmpty(mount, text) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = text;
    mount.appendChild(empty);
  }

  function wireChips(chipsEl, values, onPick) {
    chipsEl.innerHTML = "";
    values.slice(0, 10).forEach((v) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = v;
      btn.addEventListener("click", () => onPick(v));
      chipsEl.appendChild(btn);
    });
  }

  function populateSelect(selectEl, values) {
    values.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      selectEl.appendChild(opt);
    });
  }

  // ------------------------------
  // HOME: Featured (3 items)
  // ------------------------------
  async function renderHomeLatest(base) {
    const mount = document.getElementById("home-featured");
    if (!mount) return;

    let library = [];
    try {
      library = await fetchJson(base + "data/in_context_library.json");
    } catch (e) {
      mount.innerHTML = "";
      renderEmpty(mount, "Featured unavailable right now.");
      console.warn(e);
      return;
    }

    const sorted = (library || [])
      .slice()
      .sort((a, b) => String(b.updated || "").localeCompare(String(a.updated || "")))
      .slice(0, 3);

    mount.innerHTML = "";

    if (!sorted.length) {
      renderEmpty(mount, "No featured posts yet.");
      return;
    }

    sorted.forEach((p) => {
      mount.appendChild(
        makeCard({
          title: p.title,
          meta: "", // no dates
          summary: p.summary,
          tags: p.tags || [],
          href: p.link || "#",
        })
      );
    });
  }

  // ------------------------------
  // HOME: latest Monthly Issue teaser
  // ------------------------------
  async function renderHomeIssue(base) {
    const mount = document.getElementById("home-monthly");
    if (!mount) return;

    let issues = [];
    try {
      issues = await fetchJson(base + "data/in_context_issues.json");
    } catch (e) {
      mount.innerHTML = "";
      renderEmpty(mount, "Monthly unavailable right now.");
      console.warn(e);
      return;
    }

    const sorted = (issues || [])
      .slice()
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

    mount.innerHTML = "";

    if (!sorted.length) {
      const fallback = document.createElement("div");
      fallback.className = "quiet-card";
      fallback.innerHTML =
        '<div class="quiet-card-title">No issues yet.</div><div class="quiet-card-desc">Monthly issues will appear here once published.</div>';
      mount.appendChild(fallback);
      return;
    }

    const issue = sorted[0];
    const issueCard = makeCard({
      title: issue.title || "Latest issue",
      meta: "", // no dates
      summary: issue.summary || "",
      tags: issue.themes || [],
      href: issue.link || "#",
    });
    issueCard.classList.add("issue-card");
    mount.appendChild(issueCard);
  }

  // ------------------------------
  // IN CONTEXT: Library (search + tag filter)
  // ------------------------------
  async function renderInContextLibrary(base) {
    const mount = document.getElementById("ic-library");
    const searchEl = document.getElementById("ic-search");
    const tagEl = document.getElementById("ic-tag");
    const chipsEl = document.getElementById("ic-tag-chips");
    if (!mount || !searchEl || !tagEl || !chipsEl) return;

    const library = await fetchJson(base + "data/in_context_library.json");
    const tags = uniqueFromKey(library || [], "tags");

    populateSelect(tagEl, tags);

    wireChips(chipsEl, tags, (t) => {
      tagEl.value = t;
      run();
    });

    function run() {
      const q = (searchEl.value || "").trim().toLowerCase();
      const tag = tagEl.value || "";

      const filtered = (library || []).filter((p) => {
        const hay = (p.title + " " + p.summary + " " + (p.tags || []).join(" "))
          .toLowerCase()
          .trim();
        const matchesQuery = !q || hay.includes(q);
        const matchesTag = !tag || (p.tags || []).includes(tag);
        return matchesQuery && matchesTag;
      });

      mount.innerHTML = "";

      const sorted = filtered
        .slice()
        .sort((a, b) => String(b.updated || "").localeCompare(String(a.updated || "")));

      if (!sorted.length) {
        renderEmpty(mount, "No matches. Try clearing filters.");
        return;
      }

      sorted.forEach((p) => {
        mount.appendChild(
          makeCard({
            title: p.title,
            summary: p.summary,
            tags: p.tags || [],
            href: p.link || "#",
          })
        );
      });
    }

    searchEl.addEventListener("input", run);
    tagEl.addEventListener("change", run);
    run();
  }

  // ------------------------------
  // IN CONTEXT: Monthly Issues (search + theme filter)
  // ------------------------------
  async function renderInContextIssues(base) {
    const mount = document.getElementById("ic-issues");
    const searchEl = document.getElementById("ic-issue-search");
    const themeEl = document.getElementById("ic-issue-theme");
    const chipsEl = document.getElementById("ic-issue-chips");
    if (!mount || !searchEl || !themeEl || !chipsEl) return;

    const issues = await fetchJson(base + "data/in_context_issues.json");
    const themes = uniqueFromKey(issues || [], "themes");

    populateSelect(themeEl, themes);

    wireChips(chipsEl, themes, (t) => {
      themeEl.value = t;
      run();
    });

    function run() {
      const q = (searchEl.value || "").trim().toLowerCase();
      const theme = themeEl.value || "";

      const filtered = (issues || []).filter((p) => {
        const hay = (p.title + " " + p.summary + " " + (p.themes || []).join(" "))
          .toLowerCase()
          .trim();
        const matchesQuery = !q || hay.includes(q);
        const matchesTheme = !theme || (p.themes || []).includes(theme);
        return matchesQuery && matchesTheme;
      });

      mount.innerHTML = "";

      const sorted = filtered
        .slice()
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

      if (!sorted.length) {
        renderEmpty(mount, "No matches. Try clearing filters.");
        return;
      }

      sorted.forEach((p) => {
        mount.appendChild(
          makeCard({
            title: p.title,
            summary: p.summary,
            tags: p.themes || [],
            href: p.link || "#",
          })
        );
      });
    }

    searchEl.addEventListener("input", run);
    themeEl.addEventListener("change", run);
    run();
  }

  // ------------------------------
  // GLOBAL SEARCH PAGE
  // ------------------------------
  async function renderGlobalSearch(base) {
    const mount = document.getElementById("search-results");
    const status = document.getElementById("search-status");
    const input = document.getElementById("global-search");
    const sectionEl = document.getElementById("global-section");
    const chipsEl = document.getElementById("global-chips");
    if (!mount || !status || !input || !sectionEl || !chipsEl) return;

    function getParam(name) {
      const url = new URL(window.location.href);
      return url.searchParams.get(name) || "";
    }

    function setParam(name, value) {
      const url = new URL(window.location.href);
      if (!value) url.searchParams.delete(name);
      else url.searchParams.set(name, value);
      window.history.replaceState({}, "", url.toString());
    }

    function normalize(item) {
      return {
        title: item.title || "",
        summary: item.summary || "",
        tags: item.tags || item.themes || [],
        section: item.section || "Blog",
        date: item.date || item.updated || "",
        link: item.link || "#",
      };
    }

    const [posts, library, issues] = await Promise.all([
      fetchJson(base + "data/posts.json").catch(() => []),
      fetchJson(base + "data/in_context_library.json").catch(() => []),
      fetchJson(base + "data/in_context_issues.json").catch(() => []),
    ]);

    const all = []
      .concat((posts || []).map((p) => normalize({ ...p, section: p.section || "Blog" })))
      .concat((library || []).map((p) => normalize({ ...p, section: "Blog" })))
      .concat((issues || []).map((p) => normalize({ ...p, section: "Blog: Monthly" })));

    // Populate section filter
    const sectionSet = new Set(all.map((i) => i.section).filter(Boolean));
    Array.from(sectionSet)
      .sort((a, b) => a.localeCompare(b))
      .forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s;
        opt.textContent = s;
        sectionEl.appendChild(opt);
      });

    // Chips: most common tags (simple frequency)
    const freq = new Map();
    all.forEach((i) => (i.tags || []).forEach((t) => freq.set(t, (freq.get(t) || 0) + 1)));
    const topTags = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([t]) => t);

    wireChips(chipsEl, topTags, (t) => {
      input.value = t;
      setParam("q", t);
      run();
    });

    // Seed from URL
    const initialQ = getParam("q");
    if (initialQ) input.value = initialQ;

    function haystack(i) {
      return (i.title + " " + i.summary + " " + (i.tags || []).join(" ") + " " + i.section)
        .toLowerCase()
        .trim();
    }

    function sortByDateDesc(a, b) {
      return String(b.date || "").localeCompare(String(a.date || ""));
    }

    function run() {
      const q = (input.value || "").trim().toLowerCase();
      const section = sectionEl.value || "";

      const filtered = all.filter((i) => {
        const matchesQ = !q || haystack(i).includes(q);
        const matchesSection = !section || i.section === section;
        return matchesQ && matchesSection;
      });

      mount.innerHTML = "";

      if (!q && !section) status.textContent = "Type a keyword to search (or choose a section).";
      else
        status.textContent =
          filtered.length +
          " result" +
          (filtered.length === 1 ? "" : "s") +
          (q ? ` for “${q}”` : "");

      if (!filtered.length) {
        renderEmpty(mount, "No matches. Try a different keyword or clear filters.");
        return;
      }

      filtered
        .slice()
        .sort(sortByDateDesc)
        .slice(0, 50)
        .forEach((p) => {
          mount.appendChild(
            makeCard({
              title: p.title,
              summary: p.summary,
              tags: p.tags || [],
              href: p.link || "#",
            })
          );
        });
    }

    input.addEventListener("input", () => {
      setParam("q", input.value.trim());
      run();
    });

    sectionEl.addEventListener("change", run);
    run();
  }

  // ------------------------------
  // Boot
  // ------------------------------
  const base = resolveBase();

  Promise.resolve()
    .then(() => injectFavicon(base))
    .then(() => injectSharedLayout(base))
    .then(() => renderHomeLatest(base))
    .then(() => renderHomeIssue(base))
    .then(() => renderInContextLibrary(base))
    .then(() => renderInContextIssues(base))
    .then(() => renderGlobalSearch(base))
    .catch(() => {
      const ids = [
        "home-featured",
        "latest-posts",
        "home-monthly",
        "ic-library",
        "ic-issues",
        "search-results",
      ];
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<p class="muted">Content list unavailable right now.</p>';
      });
    });
})();
