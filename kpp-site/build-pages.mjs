#!/usr/bin/env node
// Builds public/*.html from the shared partials below.
//   node build-pages.mjs
// The home page is authored by hand in src/home.html (it is the scroll-craft
// page) and only has its chrome, form and footer filled in here. Every other
// page is composed from the small section helpers in this file.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, "public");
const TEL = { href: "tel:+12262404250", text: "(226) 240-4250" };

const NAV = [
  ["index.html", "Home", "The short version"],
  ["residential.html", "Residential", "Homes, condos, rentals"],
  ["commercial.html", "Commercial", "Restaurants, offices, shops"],
  ["emergency.html", "Emergency", "24 hours a day"],
  ["about.html", "About", "Who turns up"],
  ["faq.html", "Questions", "Straight answers"],
  ["contact.html", "Book a service call", "One form, one number"],
];

const lines = (...ls) => ls.map((l) => `<span class="l"><span>${l}</span></span>`).join("");

const chrome = (current) => `<a class="kp-skip" href="#main">Skip to content</a>
<header class="kp-top">
  <a class="kp-brand kp-plate" href="index.html" aria-label="Kitchener Plumbing Pros, home">
    <img src="assets/logo-dark.png" width="732" height="138" alt="Kitchener Plumbing Pros">
  </a>
  <div class="kp-top__right">
    <a class="kp-call kp-plate" href="${TEL.href}" aria-label="Call ${TEL.text}, open 24 hours">
      <span class="kp-call__dot" aria-hidden="true"></span><span class="kp-call__k">24 hours</span>${TEL.text}
    </a>
    <button class="kp-menu-btn kp-plate" type="button" aria-expanded="false" aria-controls="kp-menu"><i aria-hidden="true"></i><b>Menu</b></button>
  </div>
</header>
<div class="kp-menu" id="kp-menu">
  <div class="kp-menu__grid">
    <nav aria-label="Pages">
      <ul class="kp-menu__links">
${NAV.map(([h, t, s]) => `        <li><a href="${h}"${h === current ? ' aria-current="page"' : ""}>${t}<small>${s}</small></a></li>`).join("\n")}
      </ul>
    </nav>
    <div class="kp-menu__side">
      <p class="kp-eyebrow">Day or night</p>
      <a class="kp-tel" href="${TEL.href}">${TEL.text}</a>
      <p>1201-812 King St W, Kitchener ON N2G 1E9</p>
      <p>Kitchener, Waterloo and Cambridge</p>
    </div>
  </div>
</div>`;

const form = (indent = "") => `<form class="kp-form" data-kp-book data-sc-in action="/api/bookings" method="post">
  <label class="kp-half">Your name<input name="name" autocomplete="name" required minlength="2" maxlength="80"></label>
  <label class="kp-half">Phone number<input name="phone" type="tel" autocomplete="tel" inputmode="tel" required minlength="10" maxlength="24"></label>
  <label class="kp-half">Email <span>(optional)</span><input name="email" type="email" autocomplete="email" maxlength="120"></label>
  <label class="kp-half">How soon?
    <select name="when">
      <option>As soon as possible</option>
      <option>Today</option>
      <option>This week</option>
      <option>Just a quote for now</option>
    </select>
  </label>
  <label>What's wrong?
    <select name="problem" data-kp-select>
      <option value="A leak or a burst pipe" data-k="leak">A leak or a burst pipe</option>
      <option value="A blocked drain" data-k="drain">A blocked drain</option>
      <option value="No hot water" data-k="heat">No hot water</option>
      <option value="A bathroom or kitchen job" data-k="room">A bathroom or kitchen job</option>
      <option value="Basement, laundry or outdoors" data-k="out">Basement, laundry or outdoors</option>
      <option value="It's for my business" data-k="biz">It's for my business</option>
    </select>
  </label>
  <label>Anything we should know <span>(optional)</span><textarea name="details" rows="3" maxlength="1500"></textarea></label>
  <label class="kp-form__trap" aria-hidden="true">Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label>
  <p class="kp-form__msg" role="alert"></p>
  <button class="kp-btn" type="submit">Book a service call</button>
  <small>Your details go to the office and nowhere else. For anything urgent, call the number instead.</small>
</form>`.split("\n").map((l) => indent + l).join("\n");

const footer = () => `<div class="kp-foot-wrap">
  <footer class="sc-wrap kp-foot">
    <div>
      <img src="assets/logo-dark.png" width="732" height="138" alt="Kitchener Plumbing Pros">
      <p>Licensed and insured plumbers for homes and businesses in Kitchener, Waterloo and Cambridge. On call 24 hours a day.</p>
    </div>
    <nav aria-label="Footer">
      <h2>Pages</h2>
      <ul>${NAV.map(([h, t]) => `<li><a href="${h}">${t}</a></li>`).join("")}</ul>
    </nav>
    <div>
      <h2>Reach us</h2>
      <ul>
        <li><a href="${TEL.href}">${TEL.text}</a></li>
        <li><a href="mailto:info@kwplumbingpros.com">info@kwplumbingpros.com</a></li>
        <li>1201-812 King St W, Kitchener ON N2G 1E9</li>
      </ul>
    </div>
    <p class="kp-foot__note">Concept website prepared for Kitchener Plumbing Pros as a design demonstration. It is not the company's live website, which is at <a href="https://kwplumbingpros.com/" rel="noopener">kwplumbingpros.com</a>.</p>
  </footer>
</div>`;

/* ------------------------------------------------------- section helpers -- */
const phero = ({ eyebrow, h1, lede, img, alt, alert, water }) => `
  <section class="sc-wrap kp-phero${img || water ? "" : " kp-phero--plain"}" data-sc-act="flow">
    <div>
      ${alert ? `<p class="kp-alert">${alert}</p>` : `<p class="kp-eyebrow">${eyebrow}</p>`}
      <h1 class="sc-display kp-h kp-lines" data-kp-load>${h1}</h1>
      <p class="sc-lede">${lede}</p>
      <div class="kp-phero__cta">
        <a class="kp-btn" href="contact.html" data-sc-magnet="0.25">Book a service call</a>
        <a class="kp-btn kp-btn--ghost" href="${TEL.href}">${TEL.text}</a>
      </div>
    </div>
    ${water ? `<figure class="kp-phero__fig" data-sc-in><div class="kp-water" aria-hidden="true"><img src="assets/night.webp" alt=""><img src="assets/night.webp" alt=""></div></figure>`
      : img ? `<figure class="kp-phero__fig" data-sc-in><img src="assets/${img}" alt="${alt}" data-sc-parallax="1.1"></figure>` : ""}
  </section>`;

const band = ({ h2, intro, body, raised }) => `
  <section class="kp-band${raised ? " kp-band--raised" : ""}">
    <div class="sc-wrap">
      <div class="kp-band__head">
        <h2 class="sc-display kp-h kp-lines">${h2}</h2>
        ${intro ? `<p class="sc-body" data-sc-in>${intro}</p>` : ""}
      </div>
      ${body}
    </div>
  </section>`;

const ledger = (groups, two) => `<div class="kp-ledger${two ? " kp-ledger--2" : ""}" data-sc-in data-sc-stagger="70">
        ${groups.map(([t, items]) => `<div><h3>${t}</h3><ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul></div>`).join("\n        ")}
      </div>`;

const cta = (h2) => `
  <section class="kp-band">
    <div class="sc-wrap">
      <div class="kp-cta" data-sc-in data-light>
        <div class="kp-water" aria-hidden="true"><img src="assets/night.webp" alt="" loading="lazy"><img src="assets/night.webp" alt="" loading="lazy"></div>
        <h2 class="sc-display kp-h kp-lines">${h2}</h2>
        <div>
          <a class="kp-tel" href="${TEL.href}">${TEL.text}</a>
          <a class="kp-btn" href="contact.html">Book a service call</a>
        </div>
      </div>
    </div>
  </section>`;

/* ------------------------------------------------------------------ pages -- */
const PAGES = {
  "residential.html": {
    title: "Residential plumbing in Kitchener-Waterloo",
    desc: "Bathrooms, kitchens, drains, pipes and water heaters for houses, condos and mobile homes in Kitchener-Waterloo.",
    body: [
      phero({ eyebrow: "Residential", h1: lines("Every room with", "a <strong>tap in it.</strong>"), lede: "Houses, condos and mobile homes. Repairs when something fails and installations when something is new, quoted before the work starts.", img: "under-sink.webp", alt: "A plumber working inside a sink cabinet with a red pipe wrench" }),
      band({ raised: true, h2: lines("Room by", "<strong>room.</strong>"), intro: "If your job is not on the list, ask. Custom work starts with a conversation about what you need.", body: ledger([
        ["Bathroom", ["Clogged toilets and new toilets", "Tubs taken out and fitted", "Showers, including walk-in upgrades", "Sinks, faucets and bidets", "Blocked bathroom drains"]],
        ["Kitchen", ["Clogged kitchen sinks", "New sinks and faucets", "Dishwasher plumbing", "Garbage disposal units", "Water lines to the fridge"]],
        ["Laundry and outdoors", ["Washing machine connections", "Garden hoses and outdoor taps", "Outdoor showers", "Hot tub plumbing", "Sump pumps"]],
      ]) }),
      band({ h2: lines("Behind", "<strong>the walls.</strong>"), intro: "A drain camera finds the cause of a blockage before anything is cut open, so the fix is aimed at the actual problem.", body: ledger([
        ["Pipes", ["Frozen pipes thawed", "Leaks and cracks found and repaired", "Re-piping and pipe replacement", "Low water pressure traced to its cause"]],
        ["Drains", ["Drain cleaning and repair", "Drain snaking", "Camera inspections", "Main sewer line work"]],
        ["Water and heat", ["Water heater repair and installation", "Tankless water heaters", "Filtration and water treatment", "Advice on fixtures that fit the room"]],
      ]) }),
      band({ raised: true, h2: lines("One honest", "<strong>limit.</strong>"), intro: "We plumb appliances in and connect their water lines. We do not repair the appliance itself, and a fault under warranty is best taken to the retailer.", body: "" }),
      cta(lines("Something dripping?", "<strong>Tell us.</strong>")),
    ],
  },
  "commercial.html": {
    title: "Commercial plumbing in Kitchener-Waterloo",
    desc: "Plumbing for restaurants, offices, salons, clinics, shops and property managers in Kitchener-Waterloo.",
    body: [
      phero({ eyebrow: "Commercial", h1: lines("Water that works", "while <strong>you do.</strong>"), lede: "Washrooms, kitchens and the particular fixtures your trade depends on. The job is inspected first, then fixed promptly.", img: "trap-wide.webp", alt: "Chrome shut-off valves and a basin trap being tightened with a wrench" }),
      band({ raised: true, h2: lines("Who we", "<strong>work for.</strong>"), intro: "Not listed? A short consultation settles whether we are the right fit for your premises.", body: `<ul class="kp-tags" data-sc-in>${["Restaurants, bars and pubs", "Offices", "Hair salons", "Fitness centres", "Medical clinics", "Spas", "Schools", "Supermarkets", "Convenience stores", "Gas stations and car washes", "Laundromats", "Garden centres", "Warehouses", "Property managers"].map((t) => `<li>${t}</li>`).join("")}</ul>` }),
      band({ h2: lines("What gets", "<strong>done.</strong>"), body: ledger([
        ["Fixtures", ["Commercial sinks and faucets", "Toilets and washroom basins", "Commercial dishwashers and laundry", "Bar taps and drinking fountains", "Hair-washing basins and showers"]],
        ["Supply", ["Pipe sizing for several basins at once", "Water heaters sized for heavy use", "Water lines to fridges and kitchenettes", "Garbage disposal units"]],
        ["Repairs", ["Clogged drains and toilets", "Leaking pipes", "Low water pressure", "Sewer drain blockages", "Sump pump faults"]],
      ]) }),
      cta(lines("Closed washrooms", "<strong>cost money.</strong>")),
    ],
  },
  "emergency.html": {
    title: "24-hour emergency plumber in Kitchener-Waterloo",
    desc: "Burst pipes, flooding basements and overflowing toilets. A 24-hour emergency plumbing line for Kitchener-Waterloo.",
    body: [
      phero({ alert: "The emergency line is open now", h1: lines("Shut the water off.", "<strong>Then call.</strong>"), lede: "Plumbers are on call through the night and arrive as quickly as they can. Four things to do while you wait.", water: true }),
      band({ raised: true, h2: lines("While you", "<strong>wait.</strong>"), intro: "The order matters. Every minute the supply stays on is more water in the house.", body: `<ol class="kp-steps" data-sc-in data-sc-stagger="70">
        <li data-light><h3>Shut off the main</h3><p>Close the main water supply to the building.</p></li>
        <li data-light><h3>Catch the leak</h3><p>Put a bucket under whatever is still dripping.</p></li>
        <li data-light><h3>Contain it</h3><p>Pack towels around the base so the water stays put.</p></li>
        <li data-light><h3>Call</h3><p><a href="${TEL.href}">${TEL.text}</a>, any hour.</p></li>
      </ol>` }),
      band({ h2: lines("What counts as", "<strong>an emergency.</strong>"), body: ledger([
        ["Pipes", ["Burst water pipes", "Frozen lines, before they burst", "Water coming through a ceiling"]],
        ["Drains", ["Basement drains backing up", "Overflowing toilets", "Storm drains overflowing in heavy rain"]],
        ["Pumps", ["A failed sump pump", "A sump pump with no battery backup"]],
      ]) }),
      band({ raised: true, h2: lines("Cold snaps and", "<strong>long rain.</strong>"), body: `<dl class="kp-values" data-sc-in data-sc-stagger="60">
        <div><dt>A frozen line.</dt><dd>Warm the pipe gently and keep the heat at a distance. Call even if the water starts flowing again, because the pipe may already be damaged.</dd></div>
        <div><dt>Going away in winter.</dt><dd>Take precautions before you leave and give the emergency number to whoever is watching the house.</dd></div>
        <div><dt>Days of rain.</dt><dd>Check the storm drains. If they look stressed, call before the water finds its way indoors.</dd></div>
        <div><dt>After hours.</dt><dd>Emergency calls outside regular hours are billed at a higher rate. You are told the figure before the work begins.</dd></div>
      </dl>` }),
      cta(lines("Water on the floor?", "<strong>Call now.</strong>")),
    ],
  },
  "about.html": {
    title: "About Kitchener Plumbing Pros",
    desc: "A local, licensed and insured plumbing company serving Kitchener-Waterloo, on call day and night.",
    body: [
      phero({ eyebrow: "About", h1: lines("Local plumbers,", "<strong>homeowners too.</strong>"), lede: "We live here and own homes here, so we know what a flooded basement does to a week. The company has served Kitchener-Waterloo for years and guards its reputation above everything else.", img: "faucet.webp", alt: "A plumber fitting a braided supply line to a chrome tap" }),
      band({ raised: true, h2: lines("What you can", "<strong>hold us to.</strong>"), body: `<dl class="kp-values" data-sc-in data-sc-stagger="60">
        <div><dt>Licensed only.</dt><dd>Every plumber we employ is licensed to work in Ontario.</dd></div>
        <div><dt>Fully insured.</dt><dd>The work on your property is covered.</dd></div>
        <div><dt>The price first.</dt><dd>A clear figure for the repair or installation before anything starts.</dd></div>
        <div><dt>Respect.</dt><dd>For you, for your time and for your home, which is left as clean as it was found.</dd></div>
        <div><dt>Day or night.</dt><dd>Plumbers are on call around the clock for emergencies.</dd></div>
      </dl>` }),
      band({ h2: lines("Worth knowing", "<strong>before you renovate.</strong>"), intro: "Bring the plumber in when the planning starts, not when the walls are open. It is the cheapest moment to get the layout right, and we will suggest fixtures that suit the room.", body: ledger([
        ["Inside", ["Fixtures matched to the room's layout", "Bathroom renovations kept on time and on budget", "Seasonal and annual service calls that head off emergencies"]],
        ["Outside", ["Main sewer lines out to the municipal connection", "Methods that keep the mess in your yard to a minimum", "Outdoor taps, showers and drainage"]],
      ], true) }),
      cta(lines("Meet us on", "<strong>a service call.</strong>")),
    ],
  },
  "faq.html": {
    title: "Plumbing questions, answered",
    desc: "Hours, licensing, slow drains, drain cleaners, low pressure and other common plumbing questions, answered plainly.",
    body: [
      phero({ eyebrow: "Questions", h1: lines("Straight", "<strong>answers.</strong>"), lede: "The things people ask us most, without the sales pitch." }),
      `
  <section class="kp-band kp-band--raised">
    <div class="sc-wrap">
      <div class="kp-faq" data-sc-in data-sc-stagger="40">
${[
  ["When are you open?", "The emergency line runs 24 hours a day across Kitchener-Waterloo. Emergency calls outside regular hours are billed at a higher rate, and you hear the figure first."],
  ["Are your plumbers licensed and insured?", "Yes. Every plumber is fully licensed and insured to work in Ontario."],
  ["Another plumber left a mess. Can you fix it?", "We will assess what was left behind and give you a quote for putting it right."],
  ["Do you repair dishwashers and washing machines?", "No. We connect the water lines and do the plumbing for appliances, but we do not repair the appliance itself. If it is under warranty, the retailer is the place to start."],
  ["Should I use a chemical drain cleaner?", "Sparingly, if at all. They can damage pipes and they are hard on the environment. A drain that keeps clogging needs a plumber, not another bottle."],
  ["Why is my drain slow?", "Almost always a blockage: food waste, congealed oil, something that should not be down there, or tree roots further along the line. We clean and repair drains."],
  ["What is that smell from the drain?", "Usually the P-trap, the bend that holds water to keep sewer gas out. It may be damaged, or it may never have been fitted. That is a drain repair."],
  ["Water is dripping through the ceiling. What do I do?", "If it only drips when one tap runs, stop using that tap. If it drips regardless, shut off the water supply. Then call promptly, because waiting raises the cost and can put the structure at risk."],
  ["Why is my shower pressure low?", "If it is only the shower, the fixture is the likely cause. Taking the showerhead off shows whether it needs cleaning or whether the shower control is at fault."],
  ["My toilet rocks. Does it matter?", "Yes, and we repair them. A rocking toilet can turn into a leak and then into water damage, so it is worth doing early."],
  ["Do you install water heaters?", "We repair and install electric hot water heaters, and we fit tankless models."],
  ["Is a low-flush toilet worth it?", "It is a good choice. It uses less water, which is better for the environment and can bring your water bill down."],
].map(([q, a]) => `        <details><summary>${q}</summary><p>${a}</p></details>`).join("\n")}
      </div>
    </div>
  </section>`,
      cta(lines("Still", "<strong>wondering?</strong>")),
    ],
  },
  "contact.html": {
    title: "Book a service call",
    desc: "Book a plumber in Kitchener, Waterloo or Cambridge. One short form, or call (226) 240-4250 at any hour.",
    body: [`
  <section class="sc-wrap kp-contact">
    <div>
      <p class="kp-eyebrow">Book</p>
      <h1 class="sc-display kp-h kp-lines" data-kp-load style="font-size:clamp(2.7rem,5.6vw,5.6rem);line-height:.98;margin-top:var(--sc-5)">${lines("Tell us", "<strong>what's wrong.</strong>")}</h1>
      <p class="sc-lede" style="margin-top:var(--sc-6);color:var(--sc-ink-soft)">Send the details and the office will ring you back with a time and a price. If water is running right now, call instead.</p>
      <a class="kp-tel" href="${TEL.href}" style="margin-top:var(--sc-7);font-size:var(--sc-t-2xl)">${TEL.text}</a>
      <dl class="kp-facts">
        <div><dt>Hours</dt><dd>24 hours a day, 7 days a week</dd></div>
        <div><dt>Area</dt><dd>Kitchener, Waterloo and Cambridge</dd></div>
        <div><dt>Address</dt><dd>1201-812 King St W<br>Kitchener ON N2G 1E9</dd></div>
        <div><dt>Email</dt><dd><a href="mailto:info@kwplumbingpros.com">info@kwplumbingpros.com</a></dd></div>
      </dl>
    </div>
${form("    ")}
  </section>`],
  },
  "thanks.html": {
    title: "Request received",
    desc: "Your service call request has been received.",
    noindex: true,
    body: [`
  <section class="sc-wrap kp-status">
    <p class="kp-eyebrow">Request received</p>
    <h1 class="sc-display kp-h kp-lines" data-kp-load>${lines("Thanks. It's", "<strong>with the office.</strong>")}</h1>
    <p class="sc-lede">Your reference is <strong data-kp-ref>on its way</strong>. If water is running right now, do not wait for a reply: call <a href="${TEL.href}">${TEL.text}</a>.</p>
    <p><a class="kp-btn kp-btn--ghost" href="index.html">Back to the home page</a></p>
    <script>(function(){var r=new URLSearchParams(location.search).get('ref');if(r&&/^KPP-[A-Z0-9]{6}$/.test(r))document.querySelector('[data-kp-ref]').textContent=r;})();</script>
  </section>`],
  },
  "404.html": {
    title: "Page not found",
    desc: "That page does not exist.",
    noindex: true,
    body: [`
  <section class="sc-wrap kp-status">
    <p class="kp-eyebrow">404</p>
    <h1 class="sc-display kp-h kp-lines" data-kp-load>${lines("That pipe goes", "<strong>nowhere.</strong>")}</h1>
    <p class="sc-lede">The page you asked for is not here. The home page is, and so is the phone.</p>
    <p class="kp-phero__cta"><a class="kp-btn" href="index.html">Back to the home page</a><a class="kp-btn kp-btn--ghost" href="${TEL.href}">${TEL.text}</a></p>
  </section>`],
  },
};

const ICON = `<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%23060B1D'/><rect x='5' y='20' width='22' height='5' rx='1.5' fill='%2300ADEF'/><rect x='8' y='8' width='5' height='12' fill='%23EEF2FB'/><rect x='19' y='8' width='5' height='12' fill='%23EEF2FB'/><rect x='7' y='7' width='7' height='3' fill='%23ED1B24'/><rect x='18' y='7' width='7' height='3' fill='%23ED1B24'/></svg>">`;

const page = (file, p) => `<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${p.title} · Kitchener Plumbing Pros</title>
<meta name="description" content="${p.desc}">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#060B1D">
${ICON}
<link rel="stylesheet" href="scrollcraft.css">
<link rel="stylesheet" href="site.css">
<noscript><style>[data-sc-in],[data-sc-stagger]>*{opacity:1!important;transform:none!important}.kp-lines .l>span{translate:none!important}[data-kp-draw]{transform:none!important}</style></noscript>
</head>
<body>
${chrome(file)}
<main id="main" class="kp-page">
${p.body.join("\n")}
</main>
${footer()}
<script src="scrollcraft.js"></script>
<script src="site.js"></script>
<script>ScrollCraft.mount(document.body);</script>
</body>
</html>
`;

for (const [file, p] of Object.entries(PAGES)) fs.writeFileSync(path.join(OUT, file), page(file, p));

let home = fs.readFileSync(path.join(ROOT, "src/home.html"), "utf8");
home = home
  .replace("<!--@chrome-->", chrome("index.html"))
  .replace("<!--@form-->", form("        "))
  .replace("<!--@footer-->", footer())
  .replace("<main>", '<main id="main">')
  .replace('<meta name="robots" content="noindex">', `<meta name="robots" content="noindex">\n<meta name="theme-color" content="#060B1D">`)
  .replace(/<link rel="icon"[^\n]*\n/, ICON + "\n");
fs.writeFileSync(path.join(OUT, "index.html"), home);
console.log("built", Object.keys(PAGES).length + 1, "pages into", OUT);
