/* app.js — clean + stable mobile behavior (nav, drawer, reveal, estimate) */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* =========================
     YEAR
     ========================= */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* =========================
     MOBILE DRAWER
     ========================= */
  const drawer = $("#drawer");
  const openBtn = $("#openDrawer");
  const closeBtn = $("#closeDrawer");

  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }

  if (openBtn) openBtn.addEventListener("click", openDrawer);
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);

  if (drawer) {
    drawer.addEventListener("click", (e) => {
      // close when clicking backdrop
      if (e.target === drawer) closeDrawer();
    });

    // close when clicking a menu link
    $$(".panel a", drawer).forEach((a) => a.addEventListener("click", closeDrawer));
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  // If user rotates / resizes, ensure drawer doesn't trap scroll
  window.addEventListener("resize", () => {
    if (!drawer) return;
    if (!drawer.classList.contains("open")) {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
  });

  /* =========================
     REVEAL ON SCROLL
     ========================= */
  const revealEls = $$(".reveal");
  if (revealEls.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((ent) => {
          if (ent.isIntersecting) {
            ent.target.classList.add("show");
            io.unobserve(ent.target);
          }
        });
      },
      { root: null, threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );

    revealEls.forEach((el) => io.observe(el));
  }

  /* =========================
     SMOOTH SCROLL (iOS safe)
     ========================= */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.getElementById(href.slice(1));
      if (!target) return;

      // allow normal if cmd/ctrl click
      if (e.metaKey || e.ctrlKey) return;

      e.preventDefault();
      closeDrawer();

      const nav = $(".nav-wrap");
      const navH = nav ? nav.getBoundingClientRect().height : 0;
      const y = target.getBoundingClientRect().top + window.scrollY - navH - 12;

      window.scrollTo({ top: y, behavior: "smooth" });
    });
  });

  /* =========================
     ESTIMATE CALCULATOR
     ========================= */
  const serviceTypeEl = $("#serviceType");
  const homeTypeEl = $("#homeType");
  const bedsEl = $("#beds");
  const bathsEl = $("#baths");
  const sqftEl = $("#sqft");
  const frequencyEl = $("#frequency");
  const notesEl = $("#notes"); // not used in price, kept for later
  const allergiesEl = $("#allergies"); // not used in price, kept for later

  const priceRangeEl = $("#priceRange");
  const durationEl = $("#duration");
  const lineItemsEl = $("#lineItems");

  const addonCheckboxes = $$(".addons input[type='checkbox']");

  // Pricing model — simple + predictable (adjust anytime)
  const SERVICE_BASE = {
    standard: 110,
    deep: 155,
    move: 190,
  };

  const HOME_MULT = {
    apt: 1.0,
    house: 1.1,
  };

  // Frequency discounts
  const FREQ_MULT = {
    oneTime: 1.0,
    weekly: 0.82,
    biweekly: 0.88,
    monthly: 0.94,
  };

  // Add-ons fixed price
  const ADDONS = {
    fridge: 35,
    oven: 35,
    windows: 45,
    cabinets: 55,
    laundry: 25,
    pet: 20,
  };

  // Time estimate (hours)
  function estimateHours({ service, beds, baths, sqft, addOnCount }) {
    const serviceBoost = service === "deep" ? 1.25 : service === "move" ? 1.35 : 1.0;
    const base = 1.25;
    const room = beds * 0.35 + baths * 0.45;
    const size = Math.max(0, (sqft - 600) / 600) * 0.6; // adds up as size grows
    const addons = addOnCount * 0.18;
    const hours = (base + room + size + addons) * serviceBoost;
    return Math.max(1.5, Math.round(hours * 10) / 10); // min 1.5h, 0.1h precision
  }

  function money(n) {
    return `$${Math.round(n)}`;
  }

  function clampNum(n, min, max) {
    if (Number.isNaN(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function getState() {
    const service = serviceTypeEl ? serviceTypeEl.value : "standard";
    const home = homeTypeEl ? homeTypeEl.value : "apt";
    const beds = bedsEl ? parseInt(bedsEl.value, 10) : 1;
    const baths = bathsEl ? parseInt(bathsEl.value, 10) : 2;

    const sqftRaw = sqftEl ? parseInt(String(sqftEl.value || "900"), 10) : 900;
    const sqft = clampNum(sqftRaw, 300, 8000);

    const frequency = frequencyEl ? frequencyEl.value : "oneTime";

    const selectedAddons = addonCheckboxes
      .filter((c) => c.checked)
      .map((c) => c.value)
      .filter((k) => k in ADDONS);

    return { service, home, beds, baths, sqft, frequency, selectedAddons };
  }

  function calcPrice(state) {
    const base = SERVICE_BASE[state.service] ?? SERVICE_BASE.standard;

    const sqftCost = Math.max(0, state.sqft - 300) * 0.11; // per sqft after first 300
    const bedsCost = state.beds * 18;
    const bathsCost = state.baths * 22;

    const addonCost = state.selectedAddons.reduce((sum, k) => sum + (ADDONS[k] || 0), 0);

    const preMult = base + sqftCost + bedsCost + bathsCost + addonCost;

    const homeMult = HOME_MULT[state.home] ?? 1.0;
    const freqMult = FREQ_MULT[state.frequency] ?? 1.0;

    const subtotal = preMult * homeMult * freqMult;

    // range +/- 6% to feel realistic
    const low = subtotal * 0.94;
    const high = subtotal * 1.06;

    return {
      low,
      high,
      lineItems: [
        { label: "Service base", value: base },
        { label: `Bedrooms (${state.beds})`, value: bedsCost },
        { label: `Bathrooms (${state.baths})`, value: bathsCost },
        { label: `Square footage (${state.sqft} sqft)`, value: sqftCost },
        ...(addonCost > 0
          ? [{ label: `Add-ons (${state.selectedAddons.length})`, value: addonCost }]
          : []),
        ...(state.home === "house" ? [{ label: "House multiplier", value: 0 }] : []),
        ...(state.frequency !== "oneTime" ? [{ label: "Frequency discount", value: 0 }] : []),
      ],
      addOnCount: state.selectedAddons.length,
    };
  }

  function render() {
    if (!priceRangeEl || !durationEl || !lineItemsEl) return;

    const state = getState();

    // normalize sqft input back if needed
    if (sqftEl) sqftEl.value = String(state.sqft);

    const price = calcPrice(state);
    const hours = estimateHours({
      service: state.service,
      beds: state.beds,
      baths: state.baths,
      sqft: state.sqft,
      addOnCount: price.addOnCount,
    });

    priceRangeEl.textContent = `${money(price.low)} – ${money(price.high)}`;
    durationEl.textContent = `• ${hours} hours`;

    // Build line items HTML (no huge icons)
    const lines = [];

    // helpful top row (service name)
    const serviceName =
      state.service === "deep" ? "Deep Clean" : state.service === "move" ? "Move-In/Move-Out" : "Residential Standard";

    lines.push(`
      <div class="li">
        <span><em>Selected:</em> ${serviceName}</span>
        <span></span>
      </div>
    `);

    // Only show cost items that are > 0 to avoid confusion
    price.lineItems.forEach((it) => {
      if (it.value <= 0) return;
      lines.push(`
        <div class="li">
          <span>${it.label}</span>
          <span>${money(it.value)}</span>
        </div>
      `);
    });

    // add small foot note for discounts/mults
    if (state.frequency !== "oneTime") {
      const label =
        state.frequency === "weekly"
          ? "Weekly discount applied"
          : state.frequency === "biweekly"
          ? "Bi-weekly discount applied"
          : "Monthly discount applied";
      lines.push(`
        <div class="li">
          <span><em>${label}</em></span>
          <span></span>
        </div>
      `);
    }

    if (state.home === "house") {
      lines.push(`
        <div class="li">
          <span><em>House factor applied</em></span>
          <span></span>
        </div>
      `);
    }

    lineItemsEl.innerHTML = lines.join("");
  }

  // bind events
  const inputsToWatch = [
    serviceTypeEl,
    homeTypeEl,
    bedsEl,
    bathsEl,
    sqftEl,
    frequencyEl,
    notesEl,
    allergiesEl,
    ...addonCheckboxes,
  ].filter(Boolean);

  inputsToWatch.forEach((el) => {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });

  // first render
  render();
})();
