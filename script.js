/* Catalog demo with nested documents (categories, products with variants, inventory, reviews)
   - Data is seeded into localStorage on first run
   - Search, category tree, facets, filters, product details modal with variant selection and reviews
*/

const STORAGE_KEY = "shopnest_data_v1";

// ---------- Seed data ----------
const seed = {
  categories: [
    { id: "cat_men", name: "Men", parent: null },
    { id: "cat_women", name: "Women", parent: null },
    { id: "cat_tshirts", name: "T-Shirts", parent: "cat_men" },
    { id: "cat_hoodies", name: "Hoodies", parent: "cat_men" },
    { id: "cat_shoes", name: "Shoes", parent: "cat_men" },
    { id: "cat_dresses", name: "Dresses", parent: "cat_women" }
  ],

  products: [
    {
      _id: "prod_001",
      sku: "TSHIRT-001",
      title: "Organic Cotton T-Shirt",
      slug: "organic-cotton-tshirt",
      brand: { id: "brand_green", name: "GreenWear" },
      categories: ["cat_men", "cat_tshirts"],
      categoryPath: [{ id: "cat_men", name: "Men" }, { id: "cat_tshirts", name: "T-Shirts" }],
      attributes: { material: "cotton" },
      tags: ["organic", "bestseller"],
      rating: { avg: 4.6, count: 48 },
      variants: [
        {
          variantId: "v1",
          sku: "TSHIRT-001-BLK-M",
          price: 499,
          compareAt: 599,
          currency: "INR",
          attributes: { color: "Black", size: "M" },
          images: ["https://picsum.photos/seed/p1/800/600"],
          inventory: [{ warehouseId: "w1", qty: 30 }, { warehouseId: "w2", qty: 5 }]
        },
        {
          variantId: "v2",
          sku: "TSHIRT-001-WHT-L",
          price: 499,
          attributes: { color: "White", size: "L" },
          images: ["https://picsum.photos/seed/p1b/800/600"],
          inventory: [{ warehouseId: "w1", qty: 12 }]
        }
      ],
      reviews: [
        { userId: "u1", rating: 5, title: "Great!", text: "Super comfy.", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30 }
      ],
      published: true,
      createdAt: Date.now()
    },
    {
      _id: "prod_002",
      sku: "HOOD-RED-001",
      title: "Cozy Red Hoodie",
      slug: "cozy-red-hoodie",
      brand: { id: "brand_home", name: "HomeStyle" },
      categories: ["cat_men", "cat_hoodies"],
      categoryPath: [{ id: "cat_men", name: "Men" }, { id: "cat_hoodies", name: "Hoodies" }],
      attributes: { material: "polyester" },
      tags: ["warm", "winter"],
      rating: { avg: 4.2, count: 21 },
      variants: [
        {
          variantId: "v1",
          sku: "HOOD-RED-001-S",
          price: 1299,
          attributes: { color: "Red", size: "S" },
          images: ["https://picsum.photos/seed/p2/800/600"],
          inventory: [{ warehouseId: "w1", qty: 7 }]
        }
      ],
      reviews: [],
      published: true,
      createdAt: Date.now()
    },
    {
      _id: "prod_003",
      sku: "SHOE-001",
      title: "Runner Sports Shoe",
      slug: "runner-sports-shoe",
      brand: { id: "brand_run", name: "Fleet" },
      categories: ["cat_men", "cat_shoes"],
      categoryPath: [{ id: "cat_men", name: "Men" }, { id: "cat_shoes", name: "Shoes" }],
      attributes: { type: "sports" },
      tags: ["running", "lightweight"],
      rating: { avg: 4.8, count: 102 },
      variants: [
        {
          variantId: "v1",
          sku: "SHOE-001-8",
          price: 2499,
          attributes: { color: "Black", size: "8" },
          images: ["https://picsum.photos/seed/p3/800/600"],
          inventory: [{ warehouseId: "w2", qty: 18 }]
        }
      ],
      reviews: [],
      published: true,
      createdAt: Date.now()
    }
  ]
};

// ---------- Utilities ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return JSON.parse(JSON.stringify(seed));
  }
  return JSON.parse(raw);
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let db = loadData();

// ---------- UI Elements ----------
const categoryTreeEl = $("#categoryTree");
const productGrid = $("#productGrid");
const searchInput = $("#searchInput");
const brandFilter = $("#brandFilter");
const tagFilter = $("#tagFilter");
const priceMin = $("#priceMin");
const priceMax = $("#priceMax");
const applyFiltersBtn = $("#applyFilters");
const clearFiltersBtn = $("#clearFilters");
const clearCategoryBtn = $("#clearCategory");
const resultsInfo = $("#resultsInfo");
const sortSelect = $("#sortSelect");

const facetBrandsEl = $("#facetBrands");
const facetTagsEl = $("#facetTags");

const modal = $("#productModal");
const modalBody = $("#modalBody");
const closeModal = $("#closeModal");
const emptyState = $("#emptyState");

// ---------- State ----------
let activeCategory = null;
let filters = { brand: "", tag: "", min: null, max: null, q: "", sort: "relevance" };

// ---------- Render Category Tree (recursive) ----------
function buildCategoryTree(categories) {
  const map = new Map(categories.map(c => [c.id, { ...c, children: [] }]));
  const roots = [];

  map.forEach(node => {
    if (node.parent && map.has(node.parent)) {
      map.get(node.parent).children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function renderCategories() {
  const tree = buildCategoryTree(db.categories);
  categoryTreeEl.innerHTML = "";

  function renderNode(node, container) {
    const li = document.createElement("li");
    li.textContent = node.name;
    li.dataset.id = node.id;
    li.addEventListener("click", (e) => {
      e.stopPropagation();
      activeCategory = node.id;
      highlightActiveCategory();
      applySearchAndFilters();
    });
    container.appendChild(li);

    if (node.children && node.children.length) {
      const ul = document.createElement("ul");
      ul.className = "category-children";
      node.children.forEach(child => renderNode(child, ul));
      container.appendChild(ul);
    }
  }

  tree.forEach(root => renderNode(root, categoryTreeEl));
  highlightActiveCategory();
}

function highlightActiveCategory() {
  $$("li", categoryTreeEl).forEach(li => {
    li.style.background = li.dataset.id === activeCategory ? "#eaf6ff" : "transparent";
  });
}

// ---------- Facets and filters population ----------
function populateFilters() {
  // brands and tags from products
  const brands = new Map();
  const tags = new Map();
  db.products.forEach(p => {
    brands.set(p.brand.name, (brands.get(p.brand.name) || 0) + 1);
    (p.tags || []).forEach(t => tags.set(t, (tags.get(t) || 0) + 1));
  });

  brandFilter.innerHTML = `<option value="">Any</option>` + Array.from(brands.keys()).map(b => `<option value="${b}">${b}</option>`).join("");
  tagFilter.innerHTML = `<option value="">Any</option>` + Array.from(tags.keys()).map(t => `<option value="${t}">${t}</option>`).join("");

  // facets side panel
  facetBrandsEl.innerHTML = "<h4>Brands</h4>" + Array.from(brands.entries()).map(([b,c]) => `<div class="facet-item">${b} (${c})</div>`).join("");
  facetTagsEl.innerHTML = "<h4>Tags</h4>" + Array.from(tags.entries()).map(([t,c]) => `<div class="facet-item">${t} (${c})</div>`).join("");
}

// ---------- Product rendering ----------
function getActivePrice(p) {
  // choose min price across variants for listing
  const prices = (p.variants || []).map(v => v.price || Infinity);
  return Math.min(...prices);
}

function renderProducts(list) {
  productGrid.innerHTML = "";
  if (!list.length) {
    emptyState.hidden = false;
    resultsInfo.textContent = `0 products`;
    return;
  }
  emptyState.hidden = true;
  resultsInfo.textContent = `${list.length} product(s)`;

  list.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";
    const thumbUrl = (p.variants[0] && p.variants[0].images && p.variants[0].images[0]) || "";
    const price = getActivePrice(p);

    card.innerHTML = `
      <div class="thumb"><img src="${thumbUrl}" alt="${p.title}" /></div>
      <div class="title">${p.title}</div>
      <div class="meta">${p.brand.name} • ${p.categoryPath.map(c=>c.name).join(" > ")}</div>
      <div class="price">₹ ${price} <span class="small">(${p.rating.avg}★)</span></div>
      <div class="actions">
        <button class="btn primary" data-id="${p._id}">View</button>
        <button class="btn ghost" data-id="${p._id}-quick">Quick</button>
      </div>
    `;
    productGrid.appendChild(card);

    card.querySelector(".btn.primary").addEventListener("click", () => openProductModal(p._id));
    // quick actions can be wired to add-to-cart etc (not implemented)
  });
}

// ---------- Filtering & Sorting ----------
function matchesFilters(p) {
  if (activeCategory && !p.categories.includes(activeCategory)) return false;
  if (filters.brand && p.brand.name !== filters.brand) return false;
  if (filters.tag && !(p.tags || []).includes(filters.tag)) return false;
  if (filters.q) {
    const q = filters.q.toLowerCase();
    const inText = (p.title + " " + (p.brand.name||"") + " " + (p.tags||[]).join(" ")).toLowerCase();
    if (!inText.includes(q)) return false;
  }
  const price = getActivePrice(p);
  if (filters.min != null && price < filters.min) return false;
  if (filters.max != null && price > filters.max) return false;
  return true;
}

function applySort(list) {
  const s = filters.sort;
  if (s === "price_asc") return list.sort((a,b) => getActivePrice(a) - getActivePrice(b));
  if (s === "price_desc") return list.sort((a,b) => getActivePrice(b) - getActivePrice(a));
  if (s === "rating_desc") return list.sort((a,b) => (b.rating.avg||0) - (a.rating.avg||0));
  // relevance (simple: text includes, then rating)
  if (s === "relevance") {
    // prefer matches on title then brand then rating
    return list.sort((a,b) => {
      const q = filters.q ? filters.q.toLowerCase() : "";
      const score = (item) => {
        let s = 0;
        if (!q) s += item.rating.avg || 0;
        else {
          const title = item.title.toLowerCase();
          if (title.includes(q)) s += 20;
          if ((item.brand.name || "").toLowerCase().includes(q)) s += 6;
          if ((item.tags || []).join(" ").toLowerCase().includes(q)) s += 3;
          s += item.rating.avg || 0;
        }
        return s;
      };
      return score(b) - score(a);
    });
  }
  return list;
}

function applySearchAndFilters() {
  // collect filters
  filters.brand = brandFilter.value;
  filters.tag = tagFilter.value;
  filters.min = priceMin.value ? Number(priceMin.value) : null;
  filters.max = priceMax.value ? Number(priceMax.value) : null;
  filters.q = searchInput.value.trim();
  filters.sort = sortSelect.value;

  let list = db.products.filter(p => p.published !== false).filter(matchesFilters);
  list = applySort(list);
  renderProducts(list);
  renderFacets(list);
}

// ---------- Facets from current results ----------
function renderFacets(resultList) {
  // compute brand counts and tag counts
  const brandCounts = {};
  const tagCounts = {};
  resultList.forEach(p => {
    brandCounts[p.brand.name] = (brandCounts[p.brand.name] || 0) + 1;
    (p.tags || []).forEach(t => tagCounts[t] = (tagCounts[t] || 0) + 1);
  });

  facetBrandsEl.innerHTML = "<h4>Brands</h4>" + Object.entries(brandCounts).map(([b,c]) => `<div class="facet-item">${b} (${c})</div>`).join("") || "<div class='small'>—</div>";
  facetTagsEl.innerHTML = "<h4>Tags</h4>" + Object.entries(tagCounts).map(([t,c]) => `<div class="facet-item">${t} (${c})</div>`).join("") || "<div class='small'>—</div>";
}

// ---------- Product Modal (detail + variants + reviews) ----------
function openProductModal(id) {
  const product = db.products.find(p => p._id === id);
  if (!product) return;
  let activeVariant = product.variants && product.variants[0];

  function renderModal() {
    const images = (activeVariant.images || []).map(url => `<img src="${url}" alt="${product.title}" style="height:180px;object-fit:cover;margin-right:8px;border-radius:8px">`).join("");
    const inventoryText = (activeVariant.inventory || []).map(i => `${i.warehouseId}: ${i.qty}`).join(" • ") || "Not tracked";
    const reviewsHtml = (product.reviews || []).slice().reverse().map(r => `
      <div class="review">
        <div><strong>${r.title || "Anonymous"}</strong> <span class="small">• ${new Date(r.createdAt).toLocaleDateString()}</span></div>
        <div class="small">Rating: ${r.rating}★</div>
        <div>${r.text || ""}</div>
      </div>
    `).join("") || `<div class="small">No reviews yet</div>`;

    modalBody.innerHTML = `
      <h2>${product.title}</h2>
      <div class="meta small">${product.brand.name} • ${product.categoryPath.map(c=>c.name).join(" > ")}</div>
      <div style="display:flex;gap:12px;margin-top:12px">
        <div style="min-width:260px">${images}</div>
        <div style="flex:1">
          <div class="price" style="font-size:20px">₹ ${activeVariant.price} <span class="small">(${product.rating.avg || 0}★)</span></div>
          <div class="small" style="margin-top:8px">SKU: ${activeVariant.sku}</div>
          <div class="small" style="margin-top:6px">Inventory: ${inventoryText}</div>
          <div style="margin-top:12px">
            <div class="product-variants">
              ${(product.variants||[]).map(v => `<button class="variant-chip ${v.variantId===activeVariant.variantId ? 'active' : ''}" data-vid="${v.variantId}">${v.attributes.color || ''} ${v.attributes.size ? '• '+v.attributes.size : ''}</button>`).join("")}
            </div>
          </div>

          <div style="margin-top:16px">
            <button class="btn primary" id="addToCart">Add to Cart</button>
            <button class="btn ghost" id="buyNow">Buy Now</button>
          </div>
        </div>
      </div>

      <div style="margin-top:18px">
        <h4>Details</h4>
        <div class="small">Attributes: ${Object.entries(product.attributes||{}).map(([k,v]) => `${k}: ${v}`).join(", ")}</div>
      </div>

      <div style="margin-top:16px">
        <h4>Reviews</h4>
        <div id="reviewsWrap">${reviewsHtml}</div>
        <div style="margin-top:12px">
          <h5>Add Review</h5>
          <input id="revTitle" placeholder="Title" style="width:100%;padding:8px;border-radius:6px;border:1px solid #ddd;margin-bottom:8px" />
          <textarea id="revText" placeholder="Your review" style="width:100%;padding:8px;border-radius:6px;border:1px solid #ddd"></textarea>
          <div style="margin-top:8px">
            Rating:
            <select id="revRating"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select>
            <button class="btn primary" id="submitReview">Submit</button>
          </div>
        </div>
      </div>
    `;

    // wire variant buttons
    $$(".variant-chip", modalBody).forEach(btn => {
      btn.addEventListener("click", () => {
        const vid = btn.dataset.vid;
        activeVariant = product.variants.find(v => v.variantId === vid);
        renderModal();
      });
    });

    // add review
    $("#submitReview", modalBody).addEventListener("click", () => {
      const title = $("#revTitle", modalBody).value.trim();
      const text = $("#revText", modalBody).value.trim();
      const rating = Number($("#revRating", modalBody).value || 5);

      const newReview = { userId: "guest", rating, title, text, createdAt: Date.now() };
      product.reviews = product.reviews || [];
      product.reviews.push(newReview);

      // update product rating average & count (incremental)
      const prevCount = product.rating.count || 0;
      const prevAvg = product.rating.avg || 0;
      const newCount = prevCount + 1;
      const newAvg = ((prevAvg * prevCount) + rating) / newCount;
      product.rating = { avg: Number(newAvg.toFixed(2)), count: newCount };

      saveData(db);
      renderModal();
      applySearchAndFilters(); // refresh listing to reflect rating changes
      alert("Thanks for your review!");
    });

    // placeholder add-to-cart
    $("#addToCart", modalBody).addEventListener("click", () => {
      alert(`Added ${product.title} (${activeVariant.sku}) to cart — demo only.`);
    });
    $("#buyNow", modalBody).addEventListener("click", () => {
      alert(`Buying now: ${product.title} (${activeVariant.sku}) — demo only.`);
    });
  }

  modal.setAttribute("aria-hidden", "false");
  renderModal();
}

// ---------- Event wiring ----------
searchInput.addEventListener("input", () => {
  // apply after small debounce
  debounce(applySearchAndFilters, 250)();
});
applyFiltersBtn.addEventListener("click", applySearchAndFilters);
clearFiltersBtn.addEventListener("click", () => {
  brandFilter.value = ""; tagFilter.value = ""; priceMin.value = ""; priceMax.value = "";
  filters = { ...filters, brand: "", tag: "", min: null, max: null };
  applySearchAndFilters();
});
clearCategoryBtn.addEventListener("click", () => { activeCategory = null; highlightActiveCategory(); applySearchAndFilters(); });
sortSelect.addEventListener("change", () => { filters.sort = sortSelect.value; applySearchAndFilters(); });

closeModal.addEventListener("click", () => { modal.setAttribute("aria-hidden", "true"); });

// simple debounce
function debounce(fn, ms=200){ let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }}

// ---------- Init ----------
function init() {
  renderCategories();
  populateFilters();
  applySearchAndFilters();
}

init();
