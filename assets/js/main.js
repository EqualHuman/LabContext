(function () {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  function formatDate(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load " + url);
    return await res.json();
  }

  function resolveBase() {
    const p = window.location.pathname;
    const isDeep = p.includes("/in-context/") || p.includes("/education/") || p.includes("/infographics/") || p.includes("/about/");
    const isMonthly = p.includes("/in-context/monthly/");
    if (isMonthly) return "../../";
    if (isDeep) return "../";
    return "./";
  }
  function injectFavicon() {
  const base = resolveBase();

  if (document.querySelector('link[rel="icon"]')) return;

  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/svg+xml";
  link.href = base + "assets/img/favicon.svg";

  document.head.appendChild(link);
}

  async function injectSharedLayout() {
  const base = resolveBase();

  // Header
  const header = document.querySelector("header.site-header");
  if (header) {
    try {
      const res = await fetch(base + "assets/partials/header.html", { cache: "no-store" });
      if (res.ok) {
        header.innerHTML = await res.text();
      }
    } catch (_) {}
  }

  // Footer
  const footer = document.querySelector("footer.site-footer");
  if (footer) {
    try {
      const res = await fetch(base + "assets/partials/footer.html", { cache: "no-store" });
      if (res.ok) {
        footer.innerHTML = await res.text();
      }
    } catch (_) {}
  }

  // Fix all relative links inside injected partials
  document.querySelectorAll("[data-href]").forEach((el) => {
    const href = el.getAttribute("data-href") || "";
    el.setAttribute("href", base + href);
  });

  // Fix logo src
  document.querySelectorAll("img[data-src]").forEach((img) => {
    const src = img.getAttribute("data-src");
    if (src) img.setAttribute("src", base + src);
  });

  // Mark active nav item
  const path = window.location.pathname;

  const is = (segment) => path.includes(`/${segment}/`) || path.endsWith(`/${segment}`) || path.includes(`/${segment}.html`);

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
  }
}


  function uniqueFromKey(items, key) {
    const set = new Set();
    items.forEach(i => (i[key] || []).forEach(v => set.add(v)));
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
      tags.slice(0, 5).forEach(tag => {
        const chip = document.createElement("span");
        chip.className = "tag";
        chip.textContent = tag;
        wrap.appendChild(chip);
      });
      a.appendChild(wrap);
    }

    return a;
  }

  // HOME: latest library updates (optional list)
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

    sorted.forEach(p => {
      mount.appendChild(
        card({
          title: p.title,
          meta: "Updated " + formatDate(p.updated),
          summary: p.summary,
          tags: p.tags || [],
          href: p.link || "#"
        })
      );
    });
  }

  // IN CONTEXT LIBRARY: search/filter/tag chips
  async function renderInContextLibrary() {
    const mount = document.getElementById("ic-library");
    const searchEl = document.getElementById("ic-search");
    const tagEl = document.getElementById("ic-tag");
    const chipsEl = document.getElementById("ic-tag-chips");
    if (!mount || !searchEl || !tagEl || !chipsEl) return;

    const base = resolveBase();
    const library = await fetchJson(base + "data/in_context_library.json");

    const tags = uniqueFromKey(library, "tags");
    tags.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      tagEl.appendChild(opt);
    });

    chipsEl.innerHTML = "";
    tags.slice(0, 10).forEach(t => {
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

      const filtered = library.filter(p => {
        const hay = (p.title + " " + p.summary + " " + (p.tags || []).join(" ")).toLowerCase();
        const matchesQuery = q === "" || hay.includes(q);
        const matchesTag = tag === "" || (p.tags || []).includes(tag);
        return matchesQuery && matchesTag;
      });

      mount.innerHTML = "";

      const sorted = filtered
        .slice()
        .sort((a, b) => String(b.updated).localeCompare(String(a.updated)));

      if (sorted.length === 0) {
        const empty = document.createElement("div");
        empty.className = "muted";
        empty.textContent = "No matches. Try clearing filters.";
        mount.appendChild(empty);
        return;
      }

      sorted.forEach(p => {
        mount.appendChild(
          card({
            title: p.title,
            meta: "Updated " + formatDate(p.updated),
            summary: p.summary,
            tags: p.tags || [],
            href: p.link || "#"
          })
        );
      });
    }

    searchEl.addEventListener("input", run);
    tagEl.addEventListener("change", run);
    run();
  }

  // MONTHLY ISSUES: search/filter/themes
  async function renderInContextIssues() {
    const mount = document.getElementById("ic-issues");
    const searchEl = document.getElementById("ic-issue-search");
    const themeEl = document.getElementById("ic-issue-theme");
    const chipsEl = document.getElementById("ic-issue-chips");
    if (!mount || !searchEl || !themeEl || !chipsEl) return;

    const base = resolveBase();
    const issues = await fetchJson(base + "data/in_context_issues.json");

    const themes = uniqueFromKey(issues, "themes");
    themes.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      themeEl.appendChild(opt);
    });

    chipsEl.innerHTML = "";
    themes.slice(0, 10).forEach(t => {
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

      const filtered = issues.filter(p => {
        const hay = (p.title + " " + p.summary + " " + (p.themes || []).join(" ")).toLowerCase();
        const matchesQuery = q === "" || hay.includes(q);
        const matchesTheme = theme === "" || (p.themes || []).includes(theme);
        return matchesQuery && matchesTheme;
      });

      mount.innerHTML = "";

      const sorted = filtered
        .slice()
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));

      if (sorted.length === 0) {
        const empty = document.createElement("div");
        empty.className = "muted";
        empty.textContent = "No matches. Try clearing filters.";
        mount.appendChild(empty);
        return;
      }

      sorted.forEach(p => {
        mount.appendChild(
          card({
            title: p.title,
            meta: formatDate(p.date),
            summary: p.summary,
            tags: p.themes || [],
            href: p.link || "#"
          })
        );
      });
    }

    searchEl.addEventListener("input", run);
    themeEl.addEventListener("change", run);
    run();
  }

  // Boot
// Boot
// Boot
Promise.resolve()
  .then(injectFavicon)
  .then(renderHomeLatest)
  .then(renderInContextLibrary)
  .then(renderInContextIssues)
  .catch(() => {
    const ids = ["latest-posts", "ic-library", "ic-issues"];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '<p class="muted">Content list unavailable right now.</p>';
    });
  });

})();
