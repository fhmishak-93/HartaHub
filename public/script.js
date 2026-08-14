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

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

// Skeleton placeholder shown while a list is loading, instead of plain text.
function skeletonListHtml(count = 3) {
  return `<div class="skeleton-list">${Array.from({ length: count }, () => `<div class="skeleton-card"></div>`).join("")}</div>`;
}

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
        ${listing.description ? `<div class="data-card-meta">${escapeHtml(listing.description)}</div>` : ""}
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
        return `
          <div class="data-card match-card">
            <div class="data-card-body">
              <h3>${escapeHtml(m.listing.title)} &harr; ${escapeHtml(m.requirement.clientLabel)}</h3>
              <span class="badge">${escapeHtml(m.listing.propertyType)}</span>
              <span class="badge">${escapeHtml(m.listing.state)}</span>
              <div class="price-tag">${formatPrice(m.listing.price)}</div>
              <div class="data-card-meta">
                Budget: ${formatPrice(m.requirement.budgetMin)} - ${formatPrice(m.requirement.budgetMax)}
              </div>
              <div class="data-card-meta">
                ${
                  counterpart.locked
                    ? `<span class="locked-contact">Co-broke with: ${escapeHtml(counterpart.name)}${verifiedTickHtml(counterpart)} - <a href="upgrade.html">Upgrade to view contact details</a></span>`
                    : `Co-broke with: ${escapeHtml(counterpart.name)}${verifiedTickHtml(counterpart)} - ${escapeHtml(counterpart.email)}${counterpart.phone ? " - " + escapeHtml(counterpart.phone) : ""}`
                }
              </div>
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
  fillSelect(document.getElementById("propertyType"), PROPERTY_TYPES);
  fillSelect(document.getElementById("state"), MALAYSIAN_STATES);

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
      "Uploading a real photo is a Pro & Premium feature. Paste a photo link above instead, or upgrade to unlock uploads.";
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
      document.getElementById("state").value = listing.state || "";
      document.getElementById("area").value = listing.area || "";
      document.getElementById("price").value = listing.price != null ? listing.price : "";
      document.getElementById("bedrooms").value = listing.bedrooms != null ? listing.bedrooms : "";
      document.getElementById("bathrooms").value = listing.bathrooms != null ? listing.bathrooms : "";
      document.getElementById("sizeSqft").value = listing.sizeSqft != null ? listing.sizeSqft : "";
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
      photoUrl: photoUrlInput.value,
      description: document.getElementById("description").value,
    };
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
  fillSelect(document.getElementById("propertyType"), PROPERTY_TYPES);
  fillSelect(document.getElementById("state"), MALAYSIAN_STATES);

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
      document.getElementById("state").value = requirement.state || "";
      document.getElementById("area").value = requirement.area || "";
      document.getElementById("budgetMin").value = requirement.budgetMin != null ? requirement.budgetMin : "";
      document.getElementById("budgetMax").value = requirement.budgetMax != null ? requirement.budgetMax : "";
      document.getElementById("bedrooms").value = requirement.bedrooms != null ? requirement.bedrooms : "";
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
