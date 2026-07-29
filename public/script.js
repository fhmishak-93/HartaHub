// Hartahub - shared frontend logic.
// This one file powers every page. It checks who's logged in, builds the
// nav bar, and runs whichever function matches the current page
// (read from <body data-page="...">).

// Keep these two lists identical to utils/constants.js on the server -
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

// ---------- nav bar ----------

function renderNav(user) {
  const nav = document.getElementById("nav-links");
  if (!nav) return;

  if (user) {
    nav.innerHTML = `
      <a href="dashboard.html">Dashboard</a>
      <a href="browse.html">Browse Listings</a>
      <a href="post-listing.html">Post Listing</a>
      <a href="post-requirement.html">Post Buyer</a>
      <span class="nav-user">Hi, ${escapeHtml(user.name)}</span>
      <button id="logout-btn">Log Out</button>
    `;
    document.getElementById("logout-btn").addEventListener("click", async () => {
      await api("/api/auth/logout", { method: "POST" });
      window.location.href = "index.html";
    });
  } else {
    nav.innerHTML = "";
  }
}

// ---------- page: home (login / signup) ----------

function initHomePage() {
  const tabs = document.querySelectorAll(".auth-tab");
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      if (tab.dataset.tab === "login") {
        loginForm.classList.remove("hidden");
        signupForm.classList.add("hidden");
      } else {
        signupForm.classList.remove("hidden");
        loginForm.classList.add("hidden");
      }
    });
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

// ---------- page: dashboard ----------

function listingCardHtml(listing, options = {}) {
  const photo = listing.photoUrl
    ? `<img src="${escapeHtml(listing.photoUrl)}" alt="${escapeHtml(listing.title)}" onerror="this.style.display='none'" />`
    : "";
  const agentInfo = listing.agent
    ? `<div class="data-card-meta">Agent: ${escapeHtml(listing.agent.name)} - ${escapeHtml(listing.agent.email)}${listing.agent.phone ? " - " + escapeHtml(listing.agent.phone) : ""}</div>`
    : "";
  const deleteBtn = options.showDelete
    ? `<button class="btn btn-danger" data-delete-listing="${listing._id}">Delete</button>`
    : "";

  return `
    <div class="data-card">
      ${photo}
      <div class="data-card-body">
        <h3>${escapeHtml(listing.title)}</h3>
        <span class="badge">${escapeHtml(listing.propertyType)}</span>
        <span class="badge">${escapeHtml(listing.state)}${listing.area ? " - " + escapeHtml(listing.area) : ""}</span>
        <div class="price-tag">${formatPrice(listing.price)}</div>
        <div class="data-card-meta">
          ${listing.bedrooms ? listing.bedrooms + " bed" : ""}
          ${listing.bathrooms ? " - " + listing.bathrooms + " bath" : ""}
          ${listing.sizeSqft ? " - " + listing.sizeSqft + " sqft" : ""}
        </div>
        ${listing.description ? `<div class="data-card-meta">${escapeHtml(listing.description)}</div>` : ""}
        ${agentInfo}
        ${deleteBtn}
      </div>
    </div>
  `;
}

function requirementCardHtml(requirement, options = {}) {
  const agentInfo = requirement.agent
    ? `<div class="data-card-meta">Agent: ${escapeHtml(requirement.agent.name)} - ${escapeHtml(requirement.agent.email)}${requirement.agent.phone ? " - " + escapeHtml(requirement.agent.phone) : ""}</div>`
    : "";
  const deleteBtn = options.showDelete
    ? `<button class="btn btn-danger" data-delete-requirement="${requirement._id}">Delete</button>`
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
        ${deleteBtn}
      </div>
    </div>
  `;
}

async function initDashboardPage(user) {
  document.getElementById("welcome-message").textContent =
    `Welcome back, ${user.name}. Here's what's happening on Hartahub.`;

  const [myListings, myRequirements, matches] = await Promise.all([
    api("/api/listings/mine"),
    api("/api/requirements/mine"),
    api("/api/matches"),
  ]);

  document.getElementById("stat-listings").textContent = myListings.length;
  document.getElementById("stat-requirements").textContent = myRequirements.length;
  document.getElementById("stat-matches").textContent = matches.length;

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
                Co-broke with: ${escapeHtml(counterpart.name)} - ${escapeHtml(counterpart.email)}${counterpart.phone ? " - " + escapeHtml(counterpart.phone) : ""}
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
      : myListings.map((l) => listingCardHtml(l, { showDelete: true })).join("");

  myListingsEl.querySelectorAll("[data-delete-listing]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this listing?")) return;
      await api(`/api/listings/${btn.dataset.deleteListing}`, { method: "DELETE" });
      window.location.reload();
    });
  });

  // My requirements
  const myReqEl = document.getElementById("my-requirements-list");
  myReqEl.innerHTML =
    myRequirements.length === 0
      ? `<p class="empty-state">You haven't posted any buyer requirements yet. <a href="post-requirement.html">Post one</a>.</p>`
      : myRequirements.map((r) => requirementCardHtml(r, { showDelete: true })).join("");

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
  fillSelect(stateSelect, MALAYSIAN_STATES);
  fillSelect(typeSelect, PROPERTY_TYPES);

  async function loadListings() {
    const params = new URLSearchParams();
    if (stateSelect.value) params.set("state", stateSelect.value);
    if (typeSelect.value) params.set("propertyType", typeSelect.value);

    const listingsEl = document.getElementById("listings-list");
    listingsEl.innerHTML = `<p class="empty-state">Loading listings...</p>`;

    const listings = await api("/api/listings?" + params.toString());
    listingsEl.innerHTML =
      listings.length === 0
        ? `<p class="empty-state">No listings match your filters.</p>`
        : listings.map((l) => listingCardHtml(l)).join("");
  }

  stateSelect.addEventListener("change", loadListings);
  typeSelect.addEventListener("change", loadListings);
  document.getElementById("filter-clear").addEventListener("click", () => {
    stateSelect.value = "";
    typeSelect.value = "";
    loadListings();
  });

  loadListings();
}

// ---------- page: post-listing ----------

function initPostListingPage() {
  fillSelect(document.getElementById("propertyType"), PROPERTY_TYPES);
  fillSelect(document.getElementById("state"), MALAYSIAN_STATES);

  document.getElementById("listing-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("listing-message");
    msg.textContent = "";
    msg.className = "form-message";

    try {
      await api("/api/listings", {
        method: "POST",
        body: JSON.stringify({
          title: document.getElementById("title").value,
          propertyType: document.getElementById("propertyType").value,
          state: document.getElementById("state").value,
          area: document.getElementById("area").value,
          price: document.getElementById("price").value,
          bedrooms: document.getElementById("bedrooms").value,
          bathrooms: document.getElementById("bathrooms").value,
          sizeSqft: document.getElementById("sizeSqft").value,
          photoUrl: document.getElementById("photoUrl").value,
          description: document.getElementById("description").value,
        }),
      });
      msg.textContent = "Listing posted! Redirecting to your dashboard...";
      msg.className = "form-message success";
      setTimeout(() => (window.location.href = "dashboard.html"), 900);
    } catch (err) {
      msg.textContent = err.message;
      msg.className = "form-message error";
    }
  });
}

// ---------- page: post-requirement ----------

function initPostRequirementPage() {
  fillSelect(document.getElementById("propertyType"), PROPERTY_TYPES);
  fillSelect(document.getElementById("state"), MALAYSIAN_STATES);

  document.getElementById("requirement-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("requirement-message");
    msg.textContent = "";
    msg.className = "form-message";

    try {
      await api("/api/requirements", {
        method: "POST",
        body: JSON.stringify({
          clientLabel: document.getElementById("clientLabel").value,
          propertyType: document.getElementById("propertyType").value,
          state: document.getElementById("state").value,
          area: document.getElementById("area").value,
          budgetMin: document.getElementById("budgetMin").value,
          budgetMax: document.getElementById("budgetMax").value,
          bedrooms: document.getElementById("bedrooms").value,
          notes: document.getElementById("notes").value,
        }),
      });
      msg.textContent = "Buyer requirement posted! Redirecting to your dashboard...";
      msg.className = "form-message success";
      setTimeout(() => (window.location.href = "dashboard.html"), 900);
    } catch (err) {
      msg.textContent = err.message;
      msg.className = "form-message error";
    }
  });
}

// ---------- boot ----------

async function boot() {
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
  if (page === "post-listing") initPostListingPage();
  if (page === "post-requirement") initPostRequirementPage();
}

document.addEventListener("DOMContentLoaded", boot);
