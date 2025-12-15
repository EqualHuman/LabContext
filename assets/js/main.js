(function () {
  function resolveBase() {
    const p = window.location.pathname;
    const isDeep =
      p.includes("/in-context/") ||
      p.includes("/education/") ||
      p.includes("/infographics/") ||
      p.includes("/about/");
    const isMonthly = p.includes("/in-context/monthly/");
    if (isMonthly) return "../../";
    if (isDeep) return "../";
    return "./";
  }

  function injectFavicon() {
    const base = resolveBase();

    // If a favicon already exists, don't duplicate it
    if (document.querySelector('link[rel="icon"]')) return;

    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";

    // Use your existing SVG name so you don't need a separate favicon.svg file
    link.href = base + "assets/img/labcontext-logo.svg";

    document.head.appendChild(link);
  }

  async function injectSharedLayout() {
    const base = resolveBase();

    // Header
    const header = document.querySelector("header.site-header");
    if (header) {
      try {
        const res = await fetch(base + "assets/partials/header.html", { cache: "no-store" });
        if (res.ok) header.innerHTML = await res.text();
      } catch (_) {}
    }

    // Footer (optional; keep if you have assets/partials/footer.html)
    const footer = document.querySelector("footer.site-footer");
    if (footer) {
      try {
        const res = await fetch(base + "assets/partials/footer.html", { cache: "no-store" });
        if (res.ok) footer.innerHTML = await res.text();
      } catch (_) {}
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
    const path = window.location.pathname;
    const is = (segment) =>
      path.includes(`/${segment}/`) ||
      path.endsWith(`/${segment}`) ||
      path.includes(`/${segment}.html`);

    document.querySelectorAll(".nav-link[data-nav]").forEach((a) => a.classList.remove("is-active"));

    if (is("in-context")) {
      const a = document.querySelector('.nav-link[data-nav="in-context"]');
      if (a) a.classList.add("is-active");
    } else if (is("education")) {
      const a = document.querySelector('.nav-link[data-nav="education"]');
      if (a) a.classList.add("is-active");
    } else if (is("infographics")) {
      const a = document.querySelector('.nav-link[data-nav="infographics"]');
      if (a) a.classList.add("is-active");
    } else if (is("about")) {
      const a = document.querySelector('.nav-link[data-nav="about"]');
      if (a) a.classList.add("is-active");
    } else {
      const a = document.querySelector('.nav-link[data-nav="home"]');
      if (a) a.classList.add("is-active");
    }

    // Header search → route to /search/?q=
    const searchForm = document.querySelector(".header-search");
    const searchInput = document.getElementById("site-search");
    if (searchForm && searchInput) {
      searchForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const q = (searchInput.value || "").trim();
        if (!q) return;
        window.location.href = base + "search/?q=" + encodeURIComponent(q);
      });
    }


  function formatDate(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load " + url);
    return await res.json();
  }

  function uniqueFromKey(items, key) {
    const set = new Set();
    items.forEach((i) => (i[key] || []).forEach((v) => set.add(v)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  function card({ title, meta, summary, tags, href }) {
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
    t.textContent = title;
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

  // HOME: latest library updates
  async function renderHomeLatest() {
    const mount = document.getElementById("latest-posts");
    if (!mount) return;

    const base = resolveBase();
    const library = await fetchJson(base + "data/in_context_library.json");

    mount.innerHTML = "";

    const sorted = library
      .slice()
      .sort((a, b) => String(b.updated).localeCompare(String(a.updated)))
      .slice(0, 6);

    sorted.forEach((p) => {
        mount.appendChild(
        card({
          title: p.title,
          summary: p.summary,
          tags: p.tags || [],
          href: p.link || "#",
        })
      );

    });
  }

  // IN CONTEXT LIBRARY
  async function renderInContextLibrary() {
    const mount = document.getElementById("ic-library");
    const searchEl = document.getElementById("ic-search");
    const tagEl = document.getElementById("ic-tag");
    const chipsEl = document.getElementById("ic-tag-chips");
    if (!mount || !searchEl || !tagEl || !chipsEl) return;

    const base = resolveBase();
    const library = await fetchJson(base + "data/in_context_library.json");

    const tags = uniqueFromKey(library, "tags");
    tags.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      tagEl.appendChild(opt);
    });

    chipsEl.innerHTML = "";
    tags.slice(0, 10).forEach((t) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = t;
      btn.addEventListener("click", () => {
        tagEl.value = t;
        run();
      });
      chipsEl.appendChild(btn);
    });

    function run() {
      const q = (searchEl.value || "").trim().toLowerCase();
      const tag = tagEl.value || "";

      const filtered = library.filter((p) => {
        const hay = (p.title + " " + p.summary + " " + (p.tags || []).join(" ")).toLowerCase();
        const matchesQuery = q === "" || hay.includes(q);
        const matchesTag = tag === "" || (p.tags || []).includes(tag);
        return matchesQuery && matchesTag;
      });

      mount.innerHTML = "";

      const sorted = filtered.slice().sort((a, b) => String(b.updated).localeCompare(String(a.updated)));

      if (sorted.length === 0) {
        const empty = document.createElement("div");
        empty.className = "muted";
        empty.textContent = "No matches. Try clearing filters.";
        mount.appendChild(empty);
        return;
      }

    }

    searchEl.addEventListener("input", run);
    tagEl.addEventListener("change", run);
    run();
  }

  // MONTHLY ISSUES
  async function renderInContextIssues() {
    const mount = document.getElementById("ic-issues");
    const searchEl = document.getElementById("ic-issue-search");
    const themeEl = document.getElementById("ic-issue-theme");
    const chipsEl = document.getElementById("ic-issue-chips");
    if (!mount || !searchEl || !themeEl || !chipsEl) return;

    const base = resolveBase();
    const issues = await fetchJson(base + "data/in_context_issues.json");

    const themes = uniqueFromKey(issues, "themes");
    themes.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      themeEl.appendChild(opt);
    });

    chipsEl.innerHTML = "";
    themes.slice(0, 10).forEach((t) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = t;
      btn.addEventListener("click", () => {
        themeEl.value = t;
        run();
      });
      chipsEl.appendChild(btn);
    });

    function run() {
      const q = (searchEl.value || "").trim().toLowerCase();
      const theme = themeEl.value || "";

      const filtered = issues.filter((p) => {
        const hay = (p.title + " " + p.summary + " " + (p.themes || []).join(" ")).toLowerCase();
        const matchesQuery = q === "" || hay.includes(q);
        const matchesTheme = theme === "" || (p.themes || []).includes(theme);
        return matchesQuery && matchesTheme;
      });

      mount.innerHTML = "";

      const sorted = filtered.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));

      if (sorted.length === 0) {
        const empty = document.createElement("div");
        empty.className = "muted";
        empty.textContent = "No matches. Try clearing filters.";
        mount.appendChild(empty);
        return;
      }

      sorted.forEach((p) => {
        mount.appendChild(
          card({
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
  // GLOBAL SEARCH PAGE
  async function renderGlobalSearch() {
    const mount = document.getElementById("search-results");
    const status = document.getElementById("search-status");
    const input = document.getElementById("global-search");
    const sectionEl = document.getElementById("global-section");
    const chipsEl = document.getElementById("global-chips");
    if (!mount || !status || !input || !sectionEl || !chipsEl) return;

    const base = resolveBase();

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
        section: item.section || "In Context",
        date: item.date || item.updated || "",
        link: item.link || "#",
      };
    }

    const [posts, library, issues] = await Promise.all([
      fetchJson(base + "data/posts.json").catch(() => []),
      fetchJson(base + "data/in_context_library.json").catch(() => []),
      fetchJson(base + "data/in_context_issues.json").catch(() => []),
    ]);

    // Normalize + lightly label sources
    const all = []
      .concat((posts || []).map((p) => normalize({ ...p, section: p.section || "In Context" })))
      .concat((library || []).map((p) => normalize({ ...p, section: "In Context" })))
      .concat((issues || []).map((p) => normalize({ ...p, section: "In Context: Monthly" })));

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

    chipsEl.innerHTML = "";
    topTags.forEach((t) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = t;
      btn.addEventListener("click", () => {
        input.value = t;
        setParam("q", t);
        run();
      });
      chipsEl.appendChild(btn);
    });

    // Seed from URL
    const initialQ = getParam("q");
    if (initialQ) input.value = initialQ;

    function haystack(i) {
      return (i.title + " " + i.summary + " " + (i.tags || []).join(" ") + " " + i.section).toLowerCase();
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

      if (!q && !section) {
        status.textContent = "Type a keyword to search (or choose a section).";
      } else {
        status.textContent = filtered.length + " result" + (filtered.length === 1 ? "" : "s") + (q ? ` for “${q}”` : "");
      }

      if (filtered.length === 0) {
        const empty = document.createElement("div");
        empty.className = "muted";
        empty.textContent = "No matches. Try a different keyword or clear filters.";
        mount.appendChild(empty);
        return;
      }

      filtered
        .slice()
        .sort(sortByDateDesc)
        .slice(0, 50)
        .forEach((p) => {
                   mount.appendChild(
            card({
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

  // Boot
  Promise.resolve()
    .then(injectFavicon)
    .then(injectSharedLayout)
      .then(renderHomeLatest)
    .then(renderInContextLibrary)
    .then(renderInContextIssues)
    .then(renderGlobalSearch)
    .catch(() => {
      const ids = ["latest-posts", "ic-library", "ic-issues"];
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<p class="muted">Content list unavailable right now.</p>';
      });
    });
})();
