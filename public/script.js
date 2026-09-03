// Hartahub - shared frontend logic.
// This one file powers every page. It checks who's logged in, builds the
// nav bar, and runs whichever function matches the current page
// (read from <body data-page="...">).

// Keep these lists/constants identical to utils/constants.js on the server -
// they're duplicated here because the browser can't "require" server files.
const PROPERTY_TYPES = [
  "Condominium/Apartment",
  "Terrace/Link House",
  "Semi-Detached",
  "Bungalow/Detached",
  "Townhouse",
  "Commercial",
  "Land",
];

const MALAYSIAN_STATES = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Kuala Lumpur",
  "Labuan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Perak",
  "Perlis",
  "Pulau Pinang",
  "Putrajaya",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
];

const TENURE_OPTIONS = ["Freehold", "Leasehold"];
const BUMI_LOT_OPTIONS = ["Bumi Lot", "Non-Bumi Lot"];
const TENURE_PREFERENCE_OPTIONS = ["Any", "Freehold", "Leasehold"];
const BUMI_LOT_PREFERENCE_OPTIONS = ["Any", "Bumi Lot", "Non-Bumi Lot"];

// Fixed budget bands for the buyer requirement form - must stay identical to
// utils/constants.js on the server. The gap between RM650,000 and
// RM800,000 is intentional, as requested.
const BUDGET_RANGES = [
  { key: "150000-250000", min: 150000, max: 250000, label: "RM150,000 - RM250,000" },
  { key: "251000-350000", min: 251000, max: 350000, label: "RM251,000 - RM350,000" },
  { key: "351000-450000", min: 351000, max: 450000, label: "RM351,000 - RM450,000" },
  { key: "451000-550000", min: 451000, max: 550000, label: "RM451,000 - RM550,000" },
  { key: "551000-650000", min: 551000, max: 650000, label: "RM551,000 - RM650,000" },
  { key: "800000-1000000", min: 800000, max: 1000000, label: "RM800,000 - RM1,000,000" },
  { key: "1000001-10000000", min: 1000001, max: 10000000, label: "Above RM1,000,000" },
];

// Structured area/town list, keyed by state - must stay identical to
// utils/areas.js on the server. Drives the dependent Area dropdown on both
// the Post Listing and Post Buyer Requirement forms, so matching.js can
// compare areas exactly instead of guessing at free text.
const AREAS_BY_STATE = {
  Johor: [
    "Johor Bahru", "Iskandar Puteri", "Nusajaya", "Skudai", "Kulai", "Pasir Gudang",
    "Kluang", "Batu Pahat", "Muar", "Segamat", "Pontian", "Kota Tinggi", "Mersing",
    "Tangkak", "Gelang Patah", "Ulu Tiram",
  ],
  Kedah: [
    "Alor Setar", "Sungai Petani", "Kulim", "Langkawi", "Jitra", "Baling",
    "Kuala Kedah", "Gurun", "Pendang", "Yan", "Lunas", "Sik",
  ],
  Kelantan: [
    "Kota Bharu", "Pasir Mas", "Tanah Merah", "Machang", "Gua Musang", "Tumpat",
    "Kuala Krai", "Wakaf Bharu", "Pasir Puteh",
  ],
  "Kuala Lumpur": [
    "Bangsar", "Mont Kiara", "Sri Hartamas", "Damansara Heights", "KLCC", "Bukit Bintang",
    "Cheras", "Setapak", "Wangsa Maju", "Titiwangsa", "Sentul", "Kepong", "Bukit Jalil",
    "Sri Petaling", "Taman Desa", "Segambut", "Ampang Hilir", "Pantai", "Bandar Tun Razak",
    "Jinjang", "OUG (Old Klang Road)",
  ],
  Labuan: ["Bandar Labuan", "Victoria", "Rancha-Rancha", "Patau-Patau"],
  Melaka: [
    "Bandar Melaka", "Ayer Keroh", "Alor Gajah", "Jasin", "Batu Berendam", "Bukit Katil",
    "Klebang", "Tanjung Kling", "Masjid Tanah",
  ],
  "Negeri Sembilan": [
    "Seremban", "Port Dickson", "Nilai", "Bahau", "Kuala Pilah", "Rembau", "Tampin", "Mantin",
  ],
  Pahang: [
    "Kuantan", "Temerloh", "Bentong", "Raub", "Jerantut", "Cameron Highlands",
    "Genting Highlands", "Mentakab", "Pekan", "Kuala Lipis",
  ],
  Perak: [
    "Ipoh", "Taiping", "Sitiawan", "Teluk Intan", "Lumut", "Batu Gajah", "Kampar",
    "Tapah", "Bidor", "Kuala Kangsar", "Manjung", "Gopeng", "Parit Buntar",
  ],
  Perlis: ["Kangar", "Arau", "Padang Besar", "Kuala Perlis"],
  "Pulau Pinang": [
    "George Town", "Bayan Lepas", "Bukit Mertajam", "Butterworth", "Sungai Ara",
    "Tanjung Bungah", "Batu Ferringhi", "Air Itam", "Gelugor", "Simpang Ampat",
    "Nibong Tebal", "Balik Pulau", "Jelutong", "Bayan Baru",
  ],
  Putrajaya: [
    "Precinct 1", "Precinct 8", "Precinct 9", "Precinct 11", "Precinct 14",
    "Precinct 16", "Precinct 18",
  ],
  Sabah: [
    "Kota Kinabalu", "Sandakan", "Tawau", "Penampang", "Putatan", "Papar", "Kudat",
    "Ranau", "Keningau", "Lahad Datu", "Semporna",
  ],
  Sarawak: [
    "Kuching", "Miri", "Sibu", "Bintulu", "Kota Samarahan", "Sri Aman", "Limbang",
    "Sarikei", "Mukah",
  ],
  Selangor: [
    "Petaling Jaya", "Shah Alam", "Subang Jaya", "USJ", "Puchong", "Klang", "Kajang",
    "Cheras", "Ampang", "Cyberjaya", "Bangi", "Semenyih", "Rawang", "Sungai Buloh",
    "Damansara", "Kota Damansara", "Sepang", "Selayang", "Gombak", "Balakong",
    "Seri Kembangan", "Kuala Selangor", "Sabak Bernam", "Banting", "Kuala Langat",
    "Setia Alam", "Bandar Sunway",
  ],
  Terengganu: [
    "Kuala Terengganu", "Kemaman", "Dungun", "Marang", "Besut", "Chukai", "Jerteh",
  ],
};

const COMMISSION_RATE = 0.03;

// Pages that don't require a logged-in user.
const PUBLIC_PAGES = ["home"];

// ---------- small helpers ----------

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong.");
  }
  return data;
}

function formatPrice(price) {
  return "RM " + Number(price).toLocaleString("en-MY");
}

function fillSelect(select, options) {
  for (const opt of options) {
    const el = document.createElement("option");
    el.value = opt;
    el.textContent = opt;
    select.appendChild(el);
  }
}

// Repopulates an Area <select> from AREAS_BY_STATE for the given state,
// keeping that select's own placeholder option (its first <option>, e.g.
// "No specific area" or "Select area"). If selectedValue is passed and it's
// not in that state's list - e.g. an older record's free-text area from
// before this structured list existed - it's injected as an extra option so
// editing the record doesn't silently drop or overwrite it.
function fillAreaSelect(select, state, selectedValue) {
  const placeholderText = select.options.length ? select.options[0].textContent : "Select area";
  select.innerHTML = "";
  select.appendChild(new Option(placeholderText, ""));
  const options = AREAS_BY_STATE[state] || [];
  fillSelect(select, options);
  if (selectedValue) {
    if (!options.includes(selectedValue)) {
      select.appendChild(new Option(selectedValue, selectedValue));
    }
    select.value = selectedValue;
  }
}

// Populates the Budget Range <select> from BUDGET_RANGES, keeping its own
// placeholder option (first <option>).
function fillBudgetRangeSelect(select) {
  const placeholderText = select.options.length ? select.options[0].textContent : "Select budget range";
  select.innerHTML = "";
  select.appendChild(new Option(placeholderText, ""));
  BUDGET_RANGES.forEach((r) => select.appendChild(new Option(r.label, r.key)));
}

// Finds which fixed range a min/max pair belongs to, or null if it's a
// legacy value (e.g. a free-typed budget from before fixed ranges existed).
function findBudgetRangeKey(min, max) {
  const range = BUDGET_RANGES.find((r) => r.min === Number(min) && r.max === Number(max));
  return range ? range.key : null;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

// Skeleton placeholder shown while a list is loading, instead of plain text.
function skeletonListHtml(count = 3) {
  return `<div class="skeleton-list">${Array.from({ length: count }, () => `<div class="skeleton-card"></div>`).join("")}</div>`;
}

// Agents paste listing descriptions as one dense emoji-separated block with
// no real line breaks. Break it into readable lines/paragraphs: a new line
// before each bullet-style symbol, and a paragraph break on "====" dividers.
// Rendered with `white-space: pre-line` (see .data-card-description) so the
// newlines inserted here actually show up as line breaks.
function formatDescription(raw) {
  if (!raw) return "";
  let text = escapeHtml(raw);
  text = text.replace(/=[=\s]{2,}/g, "\n\n");
  // Only trim trailing spaces/tabs before a bullet symbol - not newlines,
  // so a paragraph break already inserted above (e.g. from "====") survives.
  text = text.replace(/[ \t]*([\u{2022}\u{00BB}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F300}-\u{1FAFF}\u{2190}-\u{21FF}])/gu, "\n$1");
  text = text.replace(/\n{3,}/g, "\n\n").trim();
  return text;
}

// Builds a wa.me link for a Malaysian phone number (assumes local numbers
// start with 0 and adds the 60 country code) with an optional prefilled message.
function whatsappLink(phone, message) {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = "60" + digits.slice(1);
  else if (!digits.startsWith("60")) digits = "60" + digits;
  return `https://wa.me/${digits}${message ? "?text=" + encodeURIComponent(message) : ""}`;
}

const WHATSAPP_ICON_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 18.2a8.1 8.1 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.7.8-.8 1-.2.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.2.2-.4.1-.1 0-.3 0-.4l-.7-1.7c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.4c.1.2 1.6 2.5 3.9 3.4.5.2.9.4 1.3.5.5.2 1 .1 1.4.1.4-.1 1.3-.5 1.5-1 .2-.5.2-.9.1-1Z"/></svg>`;

const PHONE_ICON_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>`;

// Pro and Premium agents see full contact details and the commission
// dashboard; Free agents don't. Mirrors utils/plan.js on the server.
function canSeeCommissionDashboardClient(tier) {
  return tier === "pro" || tier === "premium";
}

function canUploadPhotoClient(tier) {
  return tier === "pro" || tier === "premium";
}

function daysOnPlatform(createdAt) {
  if (!createdAt) return 0;
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now - created;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return days < 0 ? 0 : days;
}

// Small gold tick shown next to a REN-verified agent's name.
function verifiedTickHtml(agent) {
  if (!agent || !agent.renVerified) return "";
  return `<span class="verified-tick" title="Verified REN agent">&#10003;</span>`;
}

// Green badge for a buyer requirement whose loan eligibility has been
// checked - also earns a small priority bonus in the match score itself
// (server-side, see utils/matching.js).
function loanCheckedBadgeHtml(requirement) {
  if (!requirement || !requirement.loanChecked) return "";
  const amount = requirement.loanAmount ? ` - ${formatPrice(requirement.loanAmount)}` : "";
  return `<span class="info-tag info-tag-loan-checked">&#10003; Loan Checked${amount}</span>`;
}

// ---------- mobile nav drawer ----------

function initNavToggle() {
  const toggle = document.getElementById("nav-toggle");
  const nav = document.getElementById("nav-links");
  const scrim = document.getElementById("nav-scrim");
  if (!toggle || !nav) return;

  function closeMenu() {
    document.body.classList.remove("nav-open");
    toggle.setAttribute("aria-expanded", "false");
  }
  function openMenu() {
    document.body.classList.add("nav-open");
    toggle.setAttribute("aria-expanded", "true");
  }

  toggle.addEventListener("click", () => {
    if (document.body.classList.contains("nav-open")) closeMenu();
    else openMenu();
  });
  if (scrim) scrim.addEventListener("click", closeMenu);
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 860) closeMenu();
  });
}

// ---------- collapsible sections (dashboard: Matches / My Listings / My Buyer Requirements) ----------

function initCollapsibles() {
  document.querySelectorAll(".collapsible").forEach((section) => {
    const toggle = section.querySelector(".section-toggle");
    if (!toggle) return;
    const key = section.dataset.collapsible;
    const storageKey = key ? "hh-collapse-" + key : null;
    const stored = storageKey ? localStorage.getItem(storageKey) : null;

    function setOpen(open) {
      section.dataset.open = open ? "true" : "false";
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }

    setOpen(stored !== "closed");

    toggle.addEventListener("click", () => {
      const isOpen = section.dataset.open !== "false";
      setOpen(!isOpen);
      if (storageKey) localStorage.setItem(storageKey, isOpen ? "closed" : "open");
    });
  });
}

// ---------- scroll-reveal (entry animation for landing-page sections) ----------

function initScrollReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  items.forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i % 4, 3) * 0.08}s`;
    observer.observe(el);
  });
}

// ---------- listing description "Read more" toggle (event delegation, so it
// works for cards rendered/re-rendered after the initial page load) ----------

function initDescToggles() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".desc-toggle");
    if (!btn) return;
    const wrap = btn.closest(".desc-wrap");
    if (!wrap) return;
    const expanded = wrap.classList.toggle("is-expanded");
    btn.textContent = expanded ? "Show less" : "Read more";
  });
}

// ---------- nav bar ----------

function renderNav(user) {
  const nav = document.getElementById("nav-links");
  if (!nav) return;

  if (user) {
    let planBadge = `<span class="plan-badge plan-badge-free">Free</span>`;
    if (user.plan === "pro") {
      planBadge = `<span class="plan-badge plan-badge-pro">Pro</span>`;
    } else if (user.plan === "premium") {
      planBadge = `<span class="plan-badge plan-badge-premium">Premium</span>`;
    }
    const tick = user.renVerified ? verifiedTickHtml({ renVerified: true }) : "";
    nav.innerHTML = `
      <a href="dashboard.html">Dashboard</a>
      <a href="browse.html">Browse Listings</a>
      <a href="post-listing.html">Post Listing</a>
      <a href="post-requirement.html">Post Buyer</a>
      <a href="upgrade.html">Upgrade</a>
      <span class="nav-user">Hi, ${escapeHtml(user.name)}${tick}${planBadge}</span>
      <button id="logout-btn">Log Out</button>
    `;
    document.getElementById("logout-btn").addEventListener("click", async () => {
      await api("/api/auth/logout", { method: "POST" });
      window.location.href = "index.html";
    });
  } else {
    // Logged-out visitor on the landing page - show Log In + a prominent
    // Sign Up button that jumps down to the account form.
    nav.innerHTML = `
      <a href="#get-started" class="js-goto-login">Log In</a>
      <a href="#get-started" class="btn btn-primary js-goto-signup">Get Started Free</a>
    `;
  }
}

// ---------- page: home (login / signup) ----------

function initHomePage() {
  const tabs = document.querySelectorAll(".auth-tab");
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");

  function activateTab(tabName) {
    tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === tabName));
    if (tabName === "login") {
      loginForm.classList.remove("hidden");
      signupForm.classList.add("hidden");
    } else {
      signupForm.classList.remove("hidden");
      loginForm.classList.add("hidden");
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
  });

  // CTA buttons scattered around the landing page (nav, hero, final banner)
  // link to #get-started and should also switch the form to the right tab.
  document.querySelectorAll(".js-goto-signup").forEach((el) => {
    el.addEventListener("click", () => activateTab("signup"));
  });
  document.querySelectorAll(".js-goto-login").forEach((el) => {
    el.addEventListener("click", () => activateTab("login"));
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("login-message");
    msg.textContent = "";
    msg.className = "form-message";
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: document.getElementById("login-email").value,
          password: document.getElementById("login-password").value,
        }),
      });
      window.location.href = "dashboard.html";
    } catch (err) {
      msg.textContent = err.message;
      msg.className = "form-message error";
    }
  });

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("signup-message");
    msg.textContent = "";
    msg.className = "form-message";
    try {
      await api("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name: document.getElementById("signup-name").value,
          email: document.getElementById("signup-email").value,
          phone: document.getElementById("signup-phone").value,
          renNumber: document.getElementById("signup-ren").value,
          password: document.getElementById("signup-password").value,
        }),
      });
      window.location.href = "dashboard.html";
    } catch (err) {
      msg.textContent = err.message;
      msg.className = "form-message error";
    }
  });
}

// ---------- shared card rendering ----------

// Clean layout: 1 photo, title, location, price - plus small info tags for
// days on Hartahub, price reduction, estimated commission, and status.
function listingCardHtml(listing, options = {}) {
  const photo = listing.photoUrl
    ? `<img class="data-card-photo" src="${escapeHtml(listing.photoUrl)}" alt="${escapeHtml(listing.title)}" onerror="this.style.display='none'" />`
    : `<div class="data-card-photo-placeholder">No photo yet</div>`;

  const agentInfo = listing.agent
    ? `<div class="data-card-meta">Agent: ${escapeHtml(listing.agent.name)}${verifiedTickHtml(listing.agent)}${
        listing.agent.locked
          ? ""
          : " - " + escapeHtml(listing.agent.email) + (listing.agent.phone ? " - " + escapeHtml(listing.agent.phone) : "")
      }</div>`
    : "";

  const tags = [`<span class="info-tag info-tag-days">${daysOnPlatform(listing.createdAt)} days on Hartahub</span>`];
  if (listing.tenure) {
    tags.push(`<span class="info-tag">${escapeHtml(listing.tenure)}</span>`);
  }
  if (listing.bumiLot) {
    tags.push(`<span class="info-tag">${escapeHtml(listing.bumiLot)}</span>`);
  }
  if (listing.status === "closed") {
    tags.push(`<span class="info-tag info-tag-closed">Closed</span>`);
  }
  if (listing.originalPrice != null && Number(listing.originalPrice) > Number(listing.price)) {
    const reduction = Number(listing.originalPrice) - Number(listing.price);
    tags.push(`<span class="info-tag info-tag-price-drop">Reduced by ${formatPrice(reduction)}</span>`);
  }
  if (options.showCommission) {
    const commission = Number(listing.price) * COMMISSION_RATE;
    tags.push(`<span class="info-tag info-tag-commission">Est. commission ${formatPrice(Math.round(commission))}</span>`);
  }

  const hasLongDescription = listing.description && listing.description.length > 160;
  const descriptionHtml = listing.description
    ? `<div class="desc-wrap">
        <div class="data-card-meta data-card-description">${formatDescription(listing.description)}</div>
        ${hasLongDescription ? `<button type="button" class="desc-toggle">Read more</button>` : ""}
      </div>`
    : "";

  const editBtn = options.showEdit
    ? `<a class="btn btn-sm btn-edit" href="post-listing.html?id=${listing._id}">Edit</a>`
    : "";
  const statusToggleBtn = options.showStatusToggle
    ? `<button class="btn btn-sm btn-secondary" data-toggle-status="${listing._id}" data-current-status="${listing.status}">${
        listing.status === "closed" ? "Mark Active" : "Mark Closed"
      }</button>`
    : "";
  const deleteBtn = options.showDelete
    ? `<button class="btn btn-sm btn-danger" data-delete-listing="${listing._id}">Delete</button>`
    : "";

  return `
    <div class="data-card data-card-clean">
      ${photo}
      <div class="data-card-body">
        <div class="data-card-title-row">
          <h3>${escapeHtml(listing.title)}</h3>
        </div>
        <div class="data-card-location">${escapeHtml(listing.propertyType)} - ${escapeHtml(listing.state)}${
    listing.area ? ", " + escapeHtml(listing.area) : ""
  }</div>
        <div class="price-tag">${formatPrice(listing.price)}</div>
        <div class="tag-row">${tags.join("")}</div>
        ${descriptionHtml}
        ${agentInfo}
        ${editBtn || statusToggleBtn || deleteBtn ? `<div class="card-actions">${editBtn}${statusToggleBtn}${deleteBtn}</div>` : ""}
      </div>
    </div>
  `;
}

function requirementCardHtml(requirement, options = {}) {
  const agentInfo = requirement.agent
    ? `<div class="data-card-meta">Agent: ${escapeHtml(requirement.agent.name)}${verifiedTickHtml(requirement.agent)}${
        requirement.agent.locked
          ? ""
          : " - " +
            escapeHtml(requirement.agent.email) +
            (requirement.agent.phone ? " - " + escapeHtml(requirement.agent.phone) : "")
      }</div>`
    : "";

  const editBtn = options.showEdit
    ? `<a class="btn btn-sm btn-edit" href="post-requirement.html?id=${requirement._id}">Edit</a>`
    : "";
  const deleteBtn = options.showDelete
    ? `<button class="btn btn-sm btn-danger" data-delete-requirement="${requirement._id}">Delete</button>`
    : "";

  return `
    <div class="data-card">
      <div class="data-card-body">
        <h3>${escapeHtml(requirement.clientLabel)}</h3>
        <span class="badge">${escapeHtml(requirement.propertyType)}</span>
        <span class="badge">${escapeHtml(requirement.state)}${requirement.area ? " - " + escapeHtml(requirement.area) : ""}</span>
        <div class="price-tag">${formatPrice(requirement.budgetMin)} - ${formatPrice(requirement.budgetMax)}</div>
        <div class="tag-row">${loanCheckedBadgeHtml(requirement)}</div>
        <div class="data-card-meta">${requirement.bedrooms ? "Min " + requirement.bedrooms + " bed" : ""}</div>
        ${requirement.notes ? `<div class="data-card-meta">${escapeHtml(requirement.notes)}</div>` : ""}
        ${agentInfo}
        ${editBtn || deleteBtn ? `<div class="card-actions">${editBtn}${deleteBtn}</div>` : ""}
      </div>
    </div>
  `;
}

// ---------- page: dashboard ----------

async function initDashboardPage(user) {
  let welcome = `Welcome back, ${user.name}. You're on the Free plan. Upgrade to Pro or Premium for more room and full match contact details.`;
  if (user.plan === "pro") {
    welcome = `Welcome back, ${user.name}. You're on the Pro plan - up to 10 listings, 10 buyer requirements, full contact details, and photo upload.`;
  } else if (user.plan === "premium") {
    welcome = `Welcome back, ${user.name}. You're on the Premium plan - unlimited listings and requirements, plus your commission dashboard below.`;
  }
  document.getElementById("welcome-message").textContent = welcome;

  const [myListings, myRequirements, matches] = await Promise.all([
    api("/api/listings/mine"),
    api("/api/requirements/mine"),
    api("/api/matches"),
  ]);

  document.getElementById("stat-listings").textContent = myListings.length;
  document.getElementById("stat-requirements").textContent = myRequirements.length;
  document.getElementById("stat-matches").textContent = matches.length;

  // Commission dashboard - Pro & Premium only.
  const showCommission = canSeeCommissionDashboardClient(user.plan);
  const commissionSection = document.getElementById("commission-section");
  if (showCommission) {
    commissionSection.classList.remove("hidden");
    const activeListings = myListings.filter((l) => l.status !== "closed");
    const closedListings = myListings.filter((l) => l.status === "closed");
    const potentialCommission = activeListings.reduce((sum, l) => sum + Number(l.price) * COMMISSION_RATE, 0);
    const closedCommission = closedListings.reduce((sum, l) => sum + Number(l.price) * COMMISSION_RATE, 0);
    document.getElementById("stat-potential-commission").textContent = formatPrice(Math.round(potentialCommission));
    document.getElementById("stat-closed-commission").textContent = formatPrice(Math.round(closedCommission));
  } else {
    commissionSection.classList.add("hidden");
  }

  // Matches
  const matchesEl = document.getElementById("matches-list");
  if (matches.length === 0) {
    matchesEl.innerHTML = `<p class="empty-state">No matches yet. Post a listing or a buyer requirement to get matched.</p>`;
  } else {
    matchesEl.innerHTML = matches
      .map((m) => {
        const isMyListing = String(m.listing.agent._id) === String(user.id);
        const counterpart = isMyListing ? m.requirement.agent : m.listing.agent;
        const scoreTier = m.matchScore >= 80 ? "high" : m.matchScore >= 50 ? "medium" : "low";
        return `
          <div class="data-card match-card">
            <div class="data-card-body">
              <div class="match-header">
                <h3>${escapeHtml(m.listing.title)} &harr; ${escapeHtml(m.requirement.clientLabel)}</h3>
                <span class="match-score-badge match-score-${scoreTier}">${m.matchScore}% Match</span>
              </div>
              <span class="badge">${escapeHtml(m.listing.propertyType)}</span>
              <span class="badge">${escapeHtml(m.listing.state)}</span>
              <div class="price-tag">${formatPrice(m.listing.price)}</div>
              <div class="data-card-meta">
                Budget: ${formatPrice(m.requirement.budgetMin)} - ${formatPrice(m.requirement.budgetMax)}
              </div>
              ${loanCheckedBadgeHtml(m.requirement) ? `<div class="tag-row">${loanCheckedBadgeHtml(m.requirement)}</div>` : ""}
              <div class="cobroke-line">
                ${
                  counterpart.locked
                    ? `<span class="locked-contact">Co-broke with ${escapeHtml(counterpart.name)}${verifiedTickHtml(counterpart)} - <a href="upgrade.html">Upgrade to view contact details</a></span>`
                    : `<span class="cobroke-label">Co-broke with</span> <strong>${escapeHtml(counterpart.name)}</strong>${verifiedTickHtml(counterpart)}${
                        counterpart.phone
                          ? `<span class="cobroke-phone">${PHONE_ICON_SVG}${escapeHtml(counterpart.phone)}</span>`
                          : ""
                      }`
                }
              </div>
              ${
                counterpart.locked
                  ? ""
                  : `<div class="match-cta">
                      <p class="match-cta-text">Ask for viewing. Let's try to close this deal.</p>
                      ${
                        counterpart.phone
                          ? `<a class="btn btn-whatsapp" href="${whatsappLink(
                              counterpart.phone,
                              `Hi ${counterpart.name}, saw we have a match on Hartahub - "${m.listing.title}" for ${m.requirement.clientLabel}. Can we arrange a viewing?`
                            )}" target="_blank" rel="noopener">${WHATSAPP_ICON_SVG} WhatsApp ${escapeHtml(counterpart.name.split(" ")[0])}</a>`
                          : ""
                      }
                    </div>`
              }
            </div>
          </div>
        `;
      })
      .join("");
  }

  // My listings
  const myListingsEl = document.getElementById("my-listings-list");
  myListingsEl.innerHTML =
    myListings.length === 0
      ? `<p class="empty-state">You haven't posted any listings yet. <a href="post-listing.html">Post one</a>.</p>`
      : myListings
          .map((l) => listingCardHtml(l, { showDelete: true, showEdit: true, showStatusToggle: true, showCommission }))
          .join("");

  myListingsEl.querySelectorAll("[data-delete-listing]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this listing?")) return;
      await api(`/api/listings/${btn.dataset.deleteListing}`, { method: "DELETE" });
      window.location.reload();
    });
  });

  myListingsEl.querySelectorAll("[data-toggle-status]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const newStatus = btn.dataset.currentStatus === "closed" ? "active" : "closed";
      try {
        await api(`/api/listings/${btn.dataset.toggleStatus}`, {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus }),
        });
        window.location.reload();
      } catch (err) {
        alert(err.message);
      }
    });
  });

  // My buyer requirements
  const myReqEl = document.getElementById("my-requirements-list");
  myReqEl.innerHTML =
    myRequirements.length === 0
      ? `<p class="empty-state">You haven't posted any buyer requirements yet. <a href="post-requirement.html">Post one</a>.</p>`
      : myRequirements.map((r) => requirementCardHtml(r, { showDelete: true, showEdit: true })).join("");

  myReqEl.querySelectorAll("[data-delete-requirement]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this buyer requirement?")) return;
      await api(`/api/requirements/${btn.dataset.deleteRequirement}`, { method: "DELETE" });
      window.location.reload();
    });
  });
}

// ---------- page: browse ----------

async function initBrowsePage() {
  const stateSelect = document.getElementById("filter-state");
  const typeSelect = document.getElementById("filter-type");
  const areaInput = document.getElementById("filter-area");
  const priceMinInput = document.getElementById("filter-price-min");
  const priceMaxInput = document.getElementById("filter-price-max");
  fillSelect(stateSelect, MALAYSIAN_STATES);
  fillSelect(typeSelect, PROPERTY_TYPES);

  async function loadListings() {
    const params = new URLSearchParams();
    if (stateSelect.value) params.set("state", stateSelect.value);
    if (typeSelect.value) params.set("propertyType", typeSelect.value);
    if (areaInput.value.trim()) params.set("area", areaInput.value.trim());
    if (priceMinInput.value) params.set("priceMin", priceMinInput.value);
    if (priceMaxInput.value) params.set("priceMax", priceMaxInput.value);

    const listingsEl = document.getElementById("listings-list");
    listingsEl.innerHTML = skeletonListHtml(4);

    const listings = await api("/api/listings?" + params.toString());
    listingsEl.innerHTML =
      listings.length === 0
        ? `<p class="empty-state">No listings match your filters.</p>`
        : listings.map((l) => listingCardHtml(l)).join("");
  }

  [stateSelect, typeSelect].forEach((el) => el.addEventListener("change", loadListings));
  [areaInput, priceMinInput, priceMaxInput].forEach((el) => {
    el.addEventListener("change", loadListings);
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        loadListings();
      }
    });
  });
  document.getElementById("filter-clear").addEventListener("click", () => {
    stateSelect.value = "";
    typeSelect.value = "";
    areaInput.value = "";
    priceMinInput.value = "";
    priceMaxInput.value = "";
    loadListings();
  });

  loadListings();
}

// ---------- page: post-listing ----------

async function initPostListingPage(user) {
  const propertyTypeSelect = document.getElementById("propertyType");
  const stateSelect = document.getElementById("state");
  const areaSelect = document.getElementById("area");
  fillSelect(propertyTypeSelect, PROPERTY_TYPES);
  fillSelect(stateSelect, MALAYSIAN_STATES);
  fillSelect(document.getElementById("tenure"), TENURE_OPTIONS);
  fillSelect(document.getElementById("bumiLot"), BUMI_LOT_OPTIONS);

  // Area options depend on which state is selected.
  fillAreaSelect(areaSelect, stateSelect.value);
  stateSelect.addEventListener("change", () => fillAreaSelect(areaSelect, stateSelect.value));

  const params = new URLSearchParams(window.location.search);
  const editId = params.get("id");
  const isEdit = Boolean(editId);

  const titleEl = document.getElementById("listing-form-title");
  const subtitleEl = document.getElementById("listing-form-subtitle");
  const submitBtn = document.getElementById("listing-submit-btn");
  const statusWrap = document.getElementById("status-field-wrap");
  const photoUploadWrap = document.getElementById("photo-upload-wrap");
  const photoLockedHint = document.getElementById("photo-upload-locked-hint");
  const photoFileInput = document.getElementById("photoFile");
  const photoUploadStatus = document.getElementById("photo-upload-status");
  const photoUrlInput = document.getElementById("photoUrl");

  // Maintenance fee & floor level only make sense for condos/apartments.
  const condoFieldsWrap = document.getElementById("condo-fields-wrap");
  function toggleCondoFields() {
    condoFieldsWrap.classList.toggle("hidden", propertyTypeSelect.value !== "Condominium/Apartment");
  }
  propertyTypeSelect.addEventListener("change", toggleCondoFields);
  toggleCondoFields();

  // Uploading a real photo (vs. pasting a link) is a Pro & Premium feature.
  const canUpload = canUploadPhotoClient(user.plan);
  if (canUpload) {
    photoUploadWrap.classList.remove("hidden");
    photoFileInput.addEventListener("change", async () => {
      const file = photoFileInput.files[0];
      if (!file) return;
      photoUploadStatus.textContent = "Uploading photo...";
      try {
        const formData = new FormData();
        formData.append("photo", file);
        const res = await fetch("/api/uploads/photo", {
          method: "POST",
          credentials: "same-origin",
          body: formData,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Upload failed.");
        photoUrlInput.value = data.url;
        photoUploadStatus.textContent = "Photo uploaded.";
      } catch (err) {
        photoUploadStatus.textContent = err.message;
      }
    });
  } else {
    photoLockedHint.textContent =
      "Uploading a real photo is a Pro & Premium feature. Upgrade to add a photo to your listing.";
  }

  if (isEdit) {
    titleEl.textContent = "Edit Listing";
    subtitleEl.textContent = "Update your listing details below.";
    submitBtn.textContent = "Save Changes";
    statusWrap.classList.remove("hidden");

    try {
      const listing = await api(`/api/listings/${editId}`);
      document.getElementById("title").value = listing.title || "";
      document.getElementById("propertyType").value = listing.propertyType || "";
      stateSelect.value = listing.state || "";
      fillAreaSelect(areaSelect, listing.state, listing.area); // area options depend on state - repopulate before setting it
      document.getElementById("price").value = listing.price != null ? listing.price : "";
      document.getElementById("bedrooms").value = listing.bedrooms != null ? listing.bedrooms : "";
      document.getElementById("bathrooms").value = listing.bathrooms != null ? listing.bathrooms : "";
      document.getElementById("sizeSqft").value = listing.sizeSqft != null ? listing.sizeSqft : "";
      document.getElementById("tenure").value = listing.tenure || "";
      document.getElementById("bumiLot").value = listing.bumiLot || "";
      document.getElementById("maintenanceFee").value = listing.maintenanceFee != null ? listing.maintenanceFee : "";
      document.getElementById("floorLevel").value = listing.floorLevel || "";
      toggleCondoFields();
      photoUrlInput.value = listing.photoUrl || "";
      document.getElementById("description").value = listing.description || "";
      document.getElementById("status").value = listing.status || "active";
    } catch (err) {
      const msg = document.getElementById("listing-message");
      msg.textContent = "Could not load this listing for editing.";
      msg.className = "form-message error";
    }
  }

  document.getElementById("listing-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("listing-message");
    msg.textContent = "";
    msg.className = "form-message";

    const payload = {
      title: document.getElementById("title").value,
      propertyType: document.getElementById("propertyType").value,
      state: document.getElementById("state").value,
      area: document.getElementById("area").value,
      price: document.getElementById("price").value,
      bedrooms: document.getElementById("bedrooms").value,
      bathrooms: document.getElementById("bathrooms").value,
      sizeSqft: document.getElementById("sizeSqft").value,
      tenure: document.getElementById("tenure").value,
      bumiLot: document.getElementById("bumiLot").value,
      photoUrl: photoUrlInput.value,
      description: document.getElementById("description").value,
    };
    if (propertyTypeSelect.value === "Condominium/Apartment") {
      payload.maintenanceFee = document.getElementById("maintenanceFee").value;
      payload.floorLevel = document.getElementById("floorLevel").value;
    }
    if (isEdit) {
      payload.status = document.getElementById("status").value;
    }

    try {
      if (isEdit) {
        await api(`/api/listings/${editId}`, { method: "PATCH", body: JSON.stringify(payload) });
        msg.textContent = "Listing updated! Redirecting to your dashboard...";
      } else {
        await api("/api/listings", { method: "POST", body: JSON.stringify(payload) });
        msg.textContent = "Listing posted! Redirecting to your dashboard...";
      }
      msg.className = "form-message success";
      setTimeout(() => (window.location.href = "dashboard.html"), 900);
    } catch (err) {
      msg.textContent = err.message;
      msg.className = "form-message error";
    }
  });
}

// ---------- page: post-requirement ----------

async function initPostRequirementPage() {
  const stateSelect = document.getElementById("state");
  const areaSelect = document.getElementById("area");
  const budgetRangeSelect = document.getElementById("budgetRange");
  const budgetMinInput = document.getElementById("budgetMin");
  const budgetMaxInput = document.getElementById("budgetMax");
  const loanCheckedInput = document.getElementById("loanChecked");
  const loanAmountWrap = document.getElementById("loan-amount-wrap");
  const loanAmountInput = document.getElementById("loanAmount");

  fillSelect(document.getElementById("propertyType"), PROPERTY_TYPES);
  fillSelect(stateSelect, MALAYSIAN_STATES);
  fillSelect(document.getElementById("tenurePreference"), TENURE_PREFERENCE_OPTIONS);
  fillSelect(document.getElementById("bumiLotPreference"), BUMI_LOT_PREFERENCE_OPTIONS);
  fillBudgetRangeSelect(budgetRangeSelect);

  // Area options depend on which state is selected.
  fillAreaSelect(areaSelect, stateSelect.value);
  stateSelect.addEventListener("change", () => fillAreaSelect(areaSelect, stateSelect.value));

  // Picking a fixed range fills the two hidden inputs the rest of the form
  // (and the API) actually reads.
  budgetRangeSelect.addEventListener("change", () => {
    const range = BUDGET_RANGES.find((r) => r.key === budgetRangeSelect.value);
    budgetMinInput.value = range ? range.min : "";
    budgetMaxInput.value = range ? range.max : "";
  });

  loanCheckedInput.addEventListener("change", () => {
    loanAmountWrap.classList.toggle("hidden", !loanCheckedInput.checked);
    if (!loanCheckedInput.checked) loanAmountInput.value = "";
  });

  const params = new URLSearchParams(window.location.search);
  const editId = params.get("id");
  const isEdit = Boolean(editId);

  const titleEl = document.getElementById("requirement-form-title");
  const subtitleEl = document.getElementById("requirement-form-subtitle");
  const submitBtn = document.getElementById("requirement-submit-btn");

  if (isEdit) {
    titleEl.textContent = "Edit Buyer Requirement";
    subtitleEl.textContent = "Update what your client is looking for below.";
    submitBtn.textContent = "Save Changes";

    try {
      const requirement = await api(`/api/requirements/${editId}`);
      document.getElementById("clientLabel").value = requirement.clientLabel || "";
      document.getElementById("propertyType").value = requirement.propertyType || "";
      stateSelect.value = requirement.state || "";
      fillAreaSelect(areaSelect, requirement.state, requirement.area); // area options depend on state - repopulate before setting it

      const rangeKey = findBudgetRangeKey(requirement.budgetMin, requirement.budgetMax);
      if (rangeKey) {
        budgetRangeSelect.value = rangeKey;
      } else if (requirement.budgetMin != null && requirement.budgetMax != null) {
        // Legacy free-typed budget from before fixed ranges existed - inject
        // it as its own option so editing doesn't silently remap it.
        const customLabel = `${formatPrice(requirement.budgetMin)} - ${formatPrice(requirement.budgetMax)} (existing)`;
        budgetRangeSelect.appendChild(new Option(customLabel, "existing"));
        budgetRangeSelect.value = "existing";
      }
      budgetMinInput.value = requirement.budgetMin != null ? requirement.budgetMin : "";
      budgetMaxInput.value = requirement.budgetMax != null ? requirement.budgetMax : "";

      document.getElementById("bedrooms").value = requirement.bedrooms != null ? requirement.bedrooms : "";
      document.getElementById("tenurePreference").value = requirement.tenurePreference || "Any";
      document.getElementById("bumiLotPreference").value = requirement.bumiLotPreference || "Any";
      loanCheckedInput.checked = Boolean(requirement.loanChecked);
      loanAmountWrap.classList.toggle("hidden", !requirement.loanChecked);
      loanAmountInput.value = requirement.loanAmount != null ? requirement.loanAmount : "";
      document.getElementById("notes").value = requirement.notes || "";
    } catch (err) {
      const msg = document.getElementById("requirement-message");
      msg.textContent = "Could not load this buyer requirement for editing.";
      msg.className = "form-message error";
    }
  }

  document.getElementById("requirement-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("requirement-message");
    msg.textContent = "";
    msg.className = "form-message";

    const payload = {
      clientLabel: document.getElementById("clientLabel").value,
      propertyType: document.getElementById("propertyType").value,
      state: document.getElementById("state").value,
      area: document.getElementById("area").value,
      budgetMin: document.getElementById("budgetMin").value,
      budgetMax: document.getElementById("budgetMax").value,
      bedrooms: document.getElementById("bedrooms").value,
      tenurePreference: document.getElementById("tenurePreference").value,
      bumiLotPreference: document.getElementById("bumiLotPreference").value,
      loanChecked: loanCheckedInput.checked,
      loanAmount: loanCheckedInput.checked ? loanAmountInput.value : "",
      notes: document.getElementById("notes").value,
    };

    try {
      if (isEdit) {
        await api(`/api/requirements/${editId}`, { method: "PATCH", body: JSON.stringify(payload) });
        msg.textContent = "Buyer requirement updated! Redirecting to your dashboard...";
      } else {
        await api("/api/requirements", { method: "POST", body: JSON.stringify(payload) });
        msg.textContent = "Buyer requirement posted! Redirecting to your dashboard...";
      }
      msg.className = "form-message success";
      setTimeout(() => (window.location.href = "dashboard.html"), 900);
    } catch (err) {
      msg.textContent = err.message;
      msg.className = "form-message error";
    }
  });
}

// ---------- page: upgrade ----------

function initUpgradePage(user) {
  const msg = document.getElementById("current-plan-message");
  if (user.plan === "premium") {
    msg.textContent = "You're on the Premium plan. Thanks for supporting Hartahub!";
  } else if (user.plan === "pro") {
    msg.textContent = "You're on the Pro plan. Upgrade to Premium for unlimited listings and the commission dashboard.";
  } else {
    msg.textContent = "You're currently on the Free plan.";
  }
}

// ---------- boot ----------

async function boot() {
  initNavToggle();
  initScrollReveal();
  initCollapsibles();
  initDescToggles();

  const page = document.body.dataset.page;
  let user = null;

  try {
    user = await api("/api/auth/me");
  } catch {
    user = null;
  }

  renderNav(user);

  const isPublic = PUBLIC_PAGES.includes(page);

  if (!user && !isPublic) {
    window.location.href = "index.html";
    return;
  }
  if (user && page === "home") {
    window.location.href = "dashboard.html";
    return;
  }

  if (page === "home") initHomePage();
  if (page === "dashboard") initDashboardPage(user);
  if (page === "browse") initBrowsePage();
  if (page === "post-listing") initPostListingPage(user);
  if (page === "post-requirement") initPostRequirementPage(user);
  if (page === "upgrade") initUpgradePage(user);
}

document.addEventListener("DOMContentLoaded", boot);
