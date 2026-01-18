(function(){
  const el = document.querySelector("[data-last-updated]");
  if(!el) return;

  const d = new Date(document.lastModified);
  if(Number.isNaN(d.getTime())) return;

  const fmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" });
  el.textContent = fmt.format(d);
})();
