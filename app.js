/* app.js — LuxyNest Cleaning (clean + not funny)
   - Mobile drawer (hamburger)
   - Reveal on scroll
   - Year in footer
   - Instant estimate calculator (clean line items)
*/

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* -----------------------------
     Footer year
  ------------------------------*/
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* -----------------------------
     Drawer / Mobile menu
  ------------------------------*/
  const drawer = $("#drawer");
  const openDrawerBtn = $("#openDrawer");
  const closeDrawerBtn = $("#closeDrawer");

  const openDrawer = () => {
    if (!drawer) return;
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };

  const closeDrawer = () => {
    if (!drawer) return;
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  if (openDrawerBtn) openDrawerBtn.addEventListener("click", openDrawer);
  if (closeDrawerBtn) closeDrawerBtn.addEventListener("click", closeDrawer);

  if (drawer) {
    drawer.addEventListener("click", (e) => {
      if (e.target === drawer) closeDrawer();
    });
    $$(".panel a", drawer).forEach((a) => a.addEventListener("click", closeDrawer));
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  /* -----------------------------
     Reveal on scroll
  ------------------------------*/
  const revealEls = $$(".reveal");
  if (revealEls.length) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => en.isIntersecting && en.target.classList.add("show")),
      { threshold: 0.12 }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* -----------------------------
     Estimate calculator
  ------------------------------*/
  const serviceType = $("#serviceType");
  const homeType = $("#homeType");
  const beds = $("#beds");
  const baths = $("#baths");
  const sqft = $("#sqft");
  const frequency = $("#frequency");
  const notes = $("#notes");
  const allergies = $("#allergies");

  const priceRangeEl = $("#priceRange");
  const durationEl = $("#duration");
  const lineItemsEl = $("#lineItems");

  const addonChecks = $$(".addons-row input[type='checkbox']");

  const PRICING = {
    service: {
      standard: { base: 110, perSqft: 0.11, bed: 18, bath: 28, min: 140, timeMult: 1.0 },
      deep: { base: 150, perSqft: 0.14, bed: 22, bath: 38, min: 190, timeMult: 1.22 },
      move: { base: 175, perSqft: 0.16, bed: 24, bath: 42, min: 220, timeMult: 1.32 },
    },
    homeTypeMultiplier: { apt: 1.0, house: 1.08 },
    frequencyDiscount: { oneTime: 0, weekly: 0.15, biweekly: 0.10, monthly: 0.05 },
    addons: { fridge: 35, oven: 35, windows: 45, cabinets: 55, laundry: 25, pet: 20 },
  };

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const round = (n) => Math.round(n);

  const money = (n) => {
    const v = round(Math.abs(n));
    const str = `$${v.toLocaleString()}`;
    return n < 0 ? `–${str}` : str;
  };

  const escapeHtml = (str) =>
    String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  // Get label text from the chip label, clean out the “+$xx” part
  const cleanAddonLabel = (labelEl) => {
    if (!labelEl) return "Add-on";
    // label text includes checkbox + text + small
    let t = labelEl.textContent || "";
    t = t.replace(/\+\$\s*\d+/g, "").trim(); // remove +$35
    t = t.replace(/\s+/g, " ");
    return t;
  };

  function calcEstimate() {
    if (!serviceType || !homeType || !beds || !baths || !sqft || !frequency) return;
    if (!priceRangeEl || !durationEl || !lineItemsEl) return;

    const svcKey = serviceType.value || "standard";
    const svc = PRICING.service[svcKey] || PRICING.service.standard;

    const bedCount = clamp(parseInt(beds.value, 10) || 0, 0, 10);
    const bathCount = clamp(parseInt(baths.value, 10) || 1, 1, 10);
    const sqftVal = clamp(parseInt(sqft.value, 10) || 900, 300, 12000);

    const homeMult = PRICING.homeTypeMultiplier[homeType.value] ?? 1.0;
    const disc = PRICING.frequencyDiscount[frequency.value] ?? 0;

    // Add-ons
    let addonsTotal = 0;
    const addonLines = [];

    addonChecks.forEach((cb) => {
      if (!cb.checked) return;
      const key = cb.value;
      const cost = PRICING.addons[key] || 0;
      addonsTotal += cost;

      const label = cleanAddonLabel(cb.closest("label"));
      addonLines.push({ label, cost });
    });

    // Core cost
    const base = svc.base;
    const sizeCost = sqftVal * svc.perSqft;
    const roomCost = bedCount * svc.bed + bathCount * svc.bath;

    let subtotal = (base + sizeCost + roomCost) * homeMult;
    subtotal = Math.max(subtotal, svc.min);

    const beforeDiscount = subtotal + addonsTotal;
    const discountAmt = beforeDiscount * disc;
    const total = beforeDiscount - discountAmt;

    // Range (±8% feels less “random”)
    const low = total * 0.94;
    const high = total * 1.06;

    priceRangeEl.textContent = `${money(low)} – ${money(high)}`;

    // Time estimate
    const addonMinutes = addonLines.length * 12;
    const mins = (60 + (sqftVal / 100) * 5 + bathCount * 16 + bedCount * 9) * svc.timeMult + addonMinutes;
    const hours = clamp(mins / 60, 1.5, 10);

    const prettyHours =
      hours < 2 ? `${hours.toFixed(1)} hours` : `${Math.round(hours)} hours`;
    durationEl.textContent = `• ${prettyHours}`;

    // Render line items (CLEAN)
    const lines = [
      { label: "Service base", cost: base },
      { label: `Square footage (${sqftVal.toLocaleString()} sqft)`, cost: sizeCost },
      { label: `Rooms (${bedCount} bed / ${bathCount} bath)`, cost: roomCost },
      ...addonLines.map((a) => ({ label: a.label, cost: a.cost })),
    ];

    if (disc > 0) {
      lines.push({ label: `Frequency discount (${Math.round(disc * 100)}%)`, cost: -discountAmt });
    }

    const itemsHtml = lines
      .map(
        (li) => `
        <div class="li">
          <span>${escapeHtml(li.label)}</span>
          <em>${money(li.cost)}</em>
        </div>
      `
      )
      .join("");

    // Notes / Allergies as full-width chips (NOT in the price column)
    const noteText = (notes?.value || "").trim();
    const allergyText = (allergies?.value || "").trim();

    const metaChips = []
    if (noteText) {
      metaChips.push(`<div class="li" style="justify-content:flex-start; gap:10px;">
        <span style="opacity:.75;">Notes:</span>
        <span style="font-weight:800; opacity:.9;">${escapeHtml(noteText)}</span>
      </div>`);
    }
    if (allergyText) {
      metaChips.push(`<div class="li" style="justify-content:flex-start; gap:10px;">
        <span style="opacity:.75;">Allergies:</span>
        <span style="font-weight:800; opacity:.9;">${escapeHtml(allergyText)}</span>
      </div>`);
    }

    lineItemsEl.innerHTML = itemsHtml + metaChips.join("");
  }

  [
    serviceType, homeType, beds, baths, sqft, frequency, notes, allergies, ...addonChecks
  ].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", calcEstimate);
    el.addEventListener("change", calcEstimate);
  });

  calcEstimate();
})();
