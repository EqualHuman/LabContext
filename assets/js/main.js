(function () {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  async function fetchPosts() {
    const isSubpage = window.location.pathname.includes("/in-context/") ||
                      window.location.pathname.includes("/education/") ||
                      window.location.pathname.includes("/infographics/") ||
                      window.location.pathname.includes("/about/");

    const base = isSubpage ? "../" : "./";
    const url = base + "data/posts.json";

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load posts.json");
    return await res.json();
  }

  function formatDate(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function postCard(post) {
    const a = document.createElement("a");
    a.className = "post-card";
    a.href = post.link || "#";

    const meta = document.createElement("div");
    meta.className = "post-meta";
    meta.textContent = formatDate(post.date);

    const title = document.createElement("div");
    title.className = "post-title";
    title.textContent = post.title;

    const summary = document.createElement("div");
    summary.className = "post-summary";
    summary.textContent = post.summary;

    const tags = document.createElement("div");
    tags.className = "post-tags";
    (post.tags || []).slice(0, 4).forEach(t => {
      const chip = document.createElement("span");
      chip.className = "tag";
      chip.textContent = t;
      tags.appendChild(chip);
    });

    a.appendChild(meta);
    a.appendChild(title);
    a.appendChild(summary);
    a.appendChild(tags);
    return a;
  }

  function renderLatest(posts) {
    const mount = document.getElementById("latest-posts");
    if (!mount) return;

    mount.innerHTML = "";
    const sorted = posts
      .slice()
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 6);

    sorted.forEach(p => mount.appendChild(postCard(p)));
  }

  function uniqueTags(posts) {
    const set = new Set();
    posts.forEach(p => (p.tags || []).forEach(t => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  function renderInContext(posts) {
    const mount = document.getElementById("posts");
    const searchEl = document.getElementById("search");
    const tagEl = document.getElementById("tag");
    const chipsEl = document.getElementById("tag-chips");
    if (!mount || !searchEl || !tagEl || !chipsEl) return;

    const tags = uniqueTags(posts);

    tags.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      tagEl.appendChild(opt);
    });

    chipsEl.innerHTML = "";
    tags.slice(0, 8).forEach(t => {
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

      const filtered = posts.filter(p => {
        const hay = (p.title + " " + p.summary + " " + (p.tags || []).join(" ")).toLowerCase();
        const matchesQuery = q === "" || hay.includes(q);
        const matchesTag = tag === "" || (p.tags || []).includes(tag);
        return matchesQuery && matchesTag;
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

      sorted.forEach(p => mount.appendChild(postCard(p)));
    }

    searchEl.addEventListener("input", run);
    tagEl.addEventListener("change", run);
    run();
  }

  fetchPosts()
    .then(posts => {
      renderLatest(posts);
      renderInContext(posts);
    })
    .catch(() => {
      const latest = document.getElementById("latest-posts");
      const posts = document.getElementById("posts");
      if (latest) latest.innerHTML = '<p class="muted">Posts list unavailable right now.</p>';
      if (posts) posts.innerHTML = '<p class="muted">Posts list unavailable right now.</p>';
    });
})();

