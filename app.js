// Drawer menu
const drawer = document.getElementById('drawer');
const openDrawer = document.getElementById('openDrawer');
const closeDrawer = document.getElementById('closeDrawer');

function setDrawer(open){
  drawer.classList.toggle('open', open);
  drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
}
openDrawer?.addEventListener('click', () => setDrawer(true));
closeDrawer?.addEventListener('click', () => setDrawer(false));
drawer?.addEventListener('click', (e) => { if(e.target === drawer) setDrawer(false); });

// Reveal on scroll
const revealEls = Array.from(document.querySelectorAll('.reveal'));
const io = new IntersectionObserver((entries)=>{
  for(const ent of entries){
    if(ent.isIntersecting){
      ent.target.classList.add('show');
      io.unobserve(ent.target);
    }
  }
}, { threshold: 0.12 });
revealEls.forEach(el => io.observe(el));

// Year
const yearEl = document.getElementById('year');
if(yearEl) yearEl.textContent = new Date().getFullYear();

// ---------------------------------
// Image fallback (prevents broken icons)
// ---------------------------------
function brandedFallbackSVG(label) {
  const safe = (label || "Elite Cleaning").slice(0, 42);
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1000" viewBox="0 0 1400 1000">
    <defs>
      <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#BFDDE6" stop-opacity="0.85"/>
        <stop offset="0.55" stop-color="#CDE8D3" stop-opacity="0.78"/>
        <stop offset="1" stop-color="#F6CBDD" stop-opacity="0.65"/>
      </linearGradient>
      <radialGradient id="glow" cx="30%" cy="20%" r="70%">
        <stop offset="0" stop-color="#FAE7A1" stop-opacity="0.55"/>
        <stop offset="0.6" stop-color="#ADCCE6" stop-opacity="0.25"/>
        <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
      </radialGradient>
      <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="18"/>
      </filter>
    </defs>

    <rect width="1400" height="1000" fill="url(#g1)"/>
    <circle cx="360" cy="220" r="260" fill="url(#glow)" filter="url(#soft)"/>
    <circle cx="1120" cy="260" r="260" fill="#ADCCE6" opacity="0.20" filter="url(#soft)"/>
    <circle cx="820" cy="900" r="320" fill="#CDE8D3" opacity="0.28" filter="url(#soft)"/>

    <g opacity="0.9">
      <path d="M180 160l14 44 44 14-44 14-14 44-14-44-44-14 44-14z" fill="#FFFFFF" opacity="0.7"/>
      <path d="M1230 170l10 32 32 10-32 10-10 32-10-32-32-10 32-10z" fill="#FFFFFF" opacity="0.65"/>
      <path d="M1150 820l12 40 40 12-40 12-12 40-12-40-40-12 40-12z" fill="#FFFFFF" opacity="0.55"/>
    </g>

    <g>
      <rect x="90" y="730" width="1220" height="170" rx="34" fill="rgba(255,255,255,0.70)"/>
      <rect x="90" y="730" width="1220" height="170" rx="34" fill="none" stroke="rgba(22,35,28,0.14)" stroke-width="2"/>
      <text x="140" y="820" font-family="Manrope, Arial" font-size="44" font-weight="800" fill="#0f1a14">${safe}</text>
      <text x="140" y="872" font-family="Manrope, Arial" font-size="26" font-weight="700" fill="rgba(15,26,20,0.65)">
        Premium clean • Calm home • Elite finish
      </text>
    </g>
  </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function applyImageFallback(img) {
  if (img.dataset.fallbackApplied === "1") return;
  img.dataset.fallbackApplied = "1";
  img.src = brandedFallbackSVG(img.alt || "Elite Cleaning");
}

function wireUpFallbacks() {
  document.querySelectorAll("img").forEach((img) => {
    img.addEventListener("error", () => applyImageFallback(img));
    if (img.complete && img.naturalWidth === 0) applyImageFallback(img);
  });
}
wireUpFallbacks();

// ---------------------------------
// ESTIMATION (kept)
// ---------------------------------
const $ = (id) => document.getElementById(id);

const serviceType = $('serviceType');
const homeType = $('homeType');
const beds = $('beds');
const baths = $('baths');
const sqft = $('sqft');
const frequency = $('frequency');
const notes = $('notes');

const priceRange = $('priceRange');
const duration = $('duration');
const lineItems = $('lineItems');

const addonPrices = {
  fridge: 35,
  oven: 35,
  windows: 45,
  cabinets: 55,
  laundry: 25,
  pet: 20
};

const base = {
  standard: { start: 120, perBath: 25, perBed: 18, perSqft: 0.06, hours: 2.0 },
  deep:     { start: 170, perBath: 35, perBed: 25, perSqft: 0.09, hours: 3.0 },
  move:     { start: 210, perBath: 40, perBed: 28, perSqft: 0.10, hours: 3.6 }
};

const homeMult = { apt: 1.00, house: 1.08 };
const freqMult = { oneTime: 1.00, weekly: 0.82, biweekly: 0.88, monthly: 0.95 };

function money(n){
  return n.toLocaleString(undefined, { style:'currency', currency:'USD', maximumFractionDigits:0 });
}

function calc(){
  if(!serviceType || !homeType || !beds || !baths || !sqft || !frequency) return;

  const t = serviceType.value;
  const b = parseInt(beds.value, 10);
  const ba = parseInt(baths.value, 10);
  const s = Math.max(300, parseInt(sqft.value || "0", 10) || 0);

  let subtotal =
    base[t].start +
    (b * base[t].perBed) +
    (ba * base[t].perBath) +
    (s * base[t].perSqft);

  subtotal *= homeMult[homeType.value];
  subtotal *= freqMult[frequency.value];

  const addons = Array.from(document.querySelectorAll('.chip input[type="checkbox"]:checked'))
    .map(cb => cb.value);

  let addonTotal = addons.reduce((sum, k) => sum + (addonPrices[k] || 0), 0);

  let hrs = base[t].hours + (b * 0.25) + (ba * 0.35) + Math.max(0, (s - 900) / 900) * 0.6;
  if(t === 'move') hrs += 0.4;
  if(addons.includes('cabinets')) hrs += 0.4;
  if(addons.includes('windows')) hrs += 0.35;
  if(addons.includes('oven')) hrs += 0.25;
  if(addons.includes('fridge')) hrs += 0.25;
  if(addons.includes('pet')) hrs += 0.2;

  const low = Math.max(99, subtotal + addonTotal);
  const high = low * 1.18;

  if(priceRange) priceRange.textContent = `${money(low)} – ${money(high)}`;
  if(duration) duration.textContent = `• ~${hrs.toFixed(1)}–${(hrs+0.8).toFixed(1)} hours`;

  const items = [];
  items.push({ name: "Service base", val: money(base[t].start) });
  const bedLine = b > 0 ? `${b} bed` : "Studio";
  items.push({ name: `Bedrooms (${bedLine})`, val: b > 0 ? money(b * base[t].perBed) : money(0) });
  items.push({ name: `Bathrooms (${ba})`, val: money(ba * base[t].perBath) });
  items.push({ name: `Sqft (${s})`, val: money(s * base[t].perSqft) });

  const hm = homeMult[homeType.value];
  if(hm !== 1) items.push({ name: "Home type factor", val: `× ${hm.toFixed(2)}` });

  const fm = freqMult[frequency.value];
  if(fm !== 1) items.push({ name: "Frequency factor", val: `× ${fm.toFixed(2)}` });

  items.push({ name: "Add-ons", val: money(addonTotal) });

  if(lineItems){
    lineItems.innerHTML = items.map(i => `
      <div class="li">
        <span>${i.name}</span>
        <em>${i.val}</em>
      </div>
    `).join('');
  }
}

[serviceType, homeType, beds, baths, sqft, frequency, notes].forEach(el => {
  el?.addEventListener('input', calc);
  el?.addEventListener('change', calc);
});
document.querySelectorAll('.chip input[type="checkbox"]').forEach(cb => {
  cb.addEventListener('change', calc);
});
calc();
