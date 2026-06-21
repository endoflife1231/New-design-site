import { artworks, categories } from "./data/artworks.js";
import { diaryEntries } from "./data/diary.js";
import { filterArtworks } from "./lib/search.js";
import { formatPrice, sizeLabel, statusLabel } from "./lib/format.js";
import { buildMessage, telegramLink } from "./lib/telegram.js";

const state = {
  query: "",
  category: "all",
  sort: "new",
  view: matchMedia("(max-width: 720px)").matches ? "list" : "grid",
  overlayIndex: -1,
  previousFocus: null,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function setup() {
  renderStats();
  renderDirections();
  renderCategories();
  renderCatalog();
  renderDiary();
  renderInventory();
  setupCatalogControls();
  setupMenu();
  setupContact();
  setupBackTop();
  setupHeaderSpy();
  setupAutoplayVideo();
}

function renderStats() {
  const available = artworks.filter((art) => art.status === "available").length;
  $("[data-stats]").innerHTML = `
    <div><dt>${artworks.length}</dt><dd>работ</dd></div>
    <div><dt>${available}</dt><dd>в наличии</dd></div>
  `;
}

function renderDirections() {
  const items = [
    ["01", "город", "Петербург — мой постоянный собеседник. Я ловлю его ритм: дворы, крыши, серое небо, случайный свет в окне.", "./public/assets/images/art/rodina.webp", "стены помнят больше, чем мы думаем"],
    ["02", "поп-культура", "Кино, музыка, мемы, комиксы — всё это часть моего языка. Это про диалог, а не фанатизм.", "./public/assets/images/art/centre.webp", "не копировать, а разговаривать"],
    ["03", "ирония", "Ирония — способ выживать и замечать абсурд. Я не высмеиваю, а подсвечиваю то, что спрятано между строк.", "./public/assets/images/art/medieval.webp", "смех — тоже форма честности"],
    ["04", "нежность", "Нежность — не слабость. Это внимание к хрупкому: к людям, моментам, деталям.", "./public/assets/images/art/with-you.webp", "бережность — мой ориентир"],
  ];
  $(".directions").innerHTML = items
    .map(
      ([num, title, text, image, note]) => `
        <article class="direction">
          <div><b>${num}</b><h3>${title}</h3></div>
          <img src="${image}" alt="" loading="lazy" />
          <p>${text}</p>
          <p class="hand">${note} ↗</p>
        </article>
      `
    )
    .join("");
}

function renderCategories() {
  $("[data-categories]").innerHTML = categories
    .map(([id, label]) => `<button type="button" class="${id === state.category ? "is-active" : ""}" data-category="${id}">${label}</button>`)
    .join("");
}

function artworkCard(artwork) {
  const price = artwork.status === "available" ? formatPrice(artwork.priceRub) : "—";
  return `
    <article class="artwork-card ${artwork.status}" tabindex="0" data-artwork="${artwork.id}">
      <div class="card-image">
        <img src="${artwork.coverImage}" alt="${artwork.title}: ${artwork.shortDescription}" loading="lazy" />
        ${artwork.featured ? '<span class="tape-label">new</span>' : ""}
      </div>
      <div class="card-content">
        <h3>${artwork.title}</h3>
        <p>${artwork.year}<br />${artwork.technique}<br />${sizeLabel(artwork)}</p>
        <div class="card-footer">
          <span class="status ${artwork.status}">● ${statusLabel(artwork.status)}</span>
          <b>${price}</b>
        </div>
      </div>
    </article>
  `;
}

function renderCatalog() {
  const list = filterArtworks(artworks, state);
  const holder = $("[data-artworks]");
  holder.className = state.view === "grid" ? "artworks-grid" : "artworks-list";
  holder.innerHTML = list.map(artworkCard).join("");
  $("[data-result-count]").textContent = `Показано ${list.length} из ${artworks.length} работ`;
  $("[data-empty]").hidden = list.length > 0;
  $$(".view-toggle button").forEach((button) => button.classList.toggle("is-active", button.dataset.view === state.view));
  renderCategories();

  $$("[data-artwork]", holder).forEach((card) => {
    card.addEventListener("click", () => openOverlay(card.dataset.artwork));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openOverlay(card.dataset.artwork);
      }
    });
  });
}

function setupCatalogControls() {
  const form = $("[data-catalog-form]");
  form.addEventListener("input", (event) => {
    if (event.target.name === "search") state.query = event.target.value;
    if (event.target.name === "sort") state.sort = event.target.value;
    renderCatalog();
  });
  $("[data-categories]").addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.category = button.dataset.category;
    renderCatalog();
  });
  $$(".view-toggle button").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      renderCatalog();
    });
  });
  $("[data-reset-filters]").addEventListener("click", () => {
    state.query = "";
    state.category = "all";
    form.search.value = "";
    renderCatalog();
  });
}

function openOverlay(id) {
  state.overlayIndex = artworks.findIndex((art) => art.id === id);
  state.previousFocus = document.activeElement;
  renderOverlay();
  document.body.classList.add("modal-open");
  const overlay = $("[data-overlay]");
  overlay.hidden = false;
  setTimeout(() => $(".overlay-close", overlay)?.focus(), 0);
}

function renderOverlay() {
  const artwork = artworks[state.overlayIndex];
  const overlay = $("[data-overlay]");
  const price = artwork.status === "available" ? formatPrice(artwork.priceRub) : "—";
  overlay.innerHTML = `
    <div class="overlay-shell">
      <div class="overlay-nav">
        <button type="button" data-prev>← предыдущая работа</button>
        <span>${String(state.overlayIndex + 1).padStart(2, "0")} / ${artworks.length}</span>
        <button type="button" data-next>следующая работа →</button>
        <button class="overlay-close" type="button" data-close aria-label="Закрыть">×</button>
      </div>
      <figure class="overlay-image tape-top">
        <img src="${artwork.coverImage}" alt="${artwork.title}: ${artwork.shortDescription}" />
        <button type="button" data-zoom="${artwork.coverImage}">Нажмите для увеличения ⌕</button>
      </figure>
      <div class="overlay-content">
        <p class="status ${artwork.status}">● ${statusLabel(artwork.status)}</p>
        <h2 id="overlay-title">${artwork.title}</h2>
        <p class="overlay-year">${artwork.year}</p>
        <dl class="meta-row">
          <div><dt>Техника</dt><dd>${artwork.technique}</dd></div>
          <div><dt>Размер</dt><dd>${sizeLabel(artwork)}</dd></div>
          <div><dt>Цена</dt><dd>${price}</dd></div>
        </dl>
        <p>${artwork.shortDescription}</p>
        ${artwork.quote ? `<blockquote class="hand">“ ${artwork.quote} ”</blockquote>` : ""}
        <details open><summary>История</summary>${artwork.story.map((p) => `<p>${p}</p>`).join("")}</details>
        ${
          artwork.video
            ? `<details open><summary>Процесс</summary><video controls src="${artwork.video.src}" poster="${artwork.video.poster}" preload="metadata"></video></details>`
            : ""
        }
        <details open><summary>Теги</summary><div class="tag-row">${artwork.tags.map((tag) => `<span>${tag}</span>`).join("")}</div></details>
        <div class="overlay-actions">
          <button class="button primary" type="button" data-buy="${artwork.id}">Уточнить покупку <span>→</span></button>
          <button class="button secondary" type="button">Сохранить в архив</button>
        </div>
      </div>
    </div>
  `;
  overlay.onclick = overlayClick;
  overlay.onkeydown = overlayKeys;
}

function overlayClick(event) {
  if (event.target.matches("[data-close]")) closeOverlay();
  if (event.target.matches("[data-prev]")) moveOverlay(-1);
  if (event.target.matches("[data-next]")) moveOverlay(1);
  if (event.target.matches("[data-zoom]")) openViewer(event.target.dataset.zoom);
  const buy = event.target.closest("[data-buy]");
  if (buy) {
    prefillPurchase(artworks.find((art) => art.id === buy.dataset.buy));
    closeOverlay();
  }
}

function overlayKeys(event) {
  if (event.key === "Escape") closeOverlay();
  if (event.key === "ArrowLeft") moveOverlay(-1);
  if (event.key === "ArrowRight") moveOverlay(1);
  if (event.key === "Tab") trapFocus(event, $("[data-overlay]"));
}

function moveOverlay(direction) {
  state.overlayIndex = (state.overlayIndex + direction + artworks.length) % artworks.length;
  renderOverlay();
  $(".overlay-close", $("[data-overlay]")).focus();
}

function closeOverlay() {
  $("[data-overlay]").hidden = true;
  document.body.classList.remove("modal-open");
  state.previousFocus?.focus?.();
}

function trapFocus(event, root) {
  const focusable = $$('a, button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])', root).filter((el) => !el.disabled);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function renderDiary() {
  $("[data-diary]").innerHTML = diaryEntries
    .map(
      (entry) => `
        <article class="timeline-row">
          <time>${entry.date}</time>
          <div>
            <h3>${entry.title}</h3>
            <p>${entry.text}</p>
            <button type="button" data-zoom="${entry.image}" class="hand">открыть изображение ↗</button>
          </div>
          <figure class="photo-card tape-top">
            <img src="${entry.image}" alt="${entry.alt}" loading="lazy" />
          </figure>
          <p class="hand">${entry.note}</p>
        </article>
      `
    )
    .join("");
  $$("[data-diary] [data-zoom]").forEach((button) => button.addEventListener("click", () => openViewer(button.dataset.zoom)));
}

function openViewer(src) {
  const viewer = $("[data-viewer]");
  viewer.innerHTML = `<button type="button" data-viewer-close aria-label="Закрыть просмотр">×</button><img src="${src}" alt="" />`;
  viewer.hidden = false;
  document.body.classList.add("modal-open");
  $("[data-viewer-close]", viewer).focus();
  viewer.onclick = (event) => {
    if (event.target === viewer || event.target.matches("[data-viewer-close]")) closeViewer();
  };
  viewer.onkeydown = (event) => {
    if (event.key === "Escape") closeViewer();
  };
}

function closeViewer() {
  $("[data-viewer]").hidden = true;
  if ($("[data-overlay]").hidden) document.body.classList.remove("modal-open");
}

function renderInventory() {
  const available = artworks.filter((art) => art.status === "available");
  $("[data-inventory]").innerHTML = `
    <div class="inventory-head"><span>Работа</span><span>Размер</span><span>Техника</span><span>Статус</span><span>Цена</span><span>Действия</span></div>
    ${available
      .map(
        (art) => `
          <article class="inventory-row">
            <div class="inventory-title">
              <img src="${art.coverImage}" alt="" loading="lazy" />
              <div><h3>${art.title}</h3><p>${art.year}</p></div>
            </div>
            <span>${sizeLabel(art)}</span>
            <span>${art.technique}</span>
            <span class="status available">● ${statusLabel(art.status)}</span>
            <b>${formatPrice(art.priceRub)}</b>
            <div class="inventory-actions">
              <button type="button" data-story="${art.id}">История →</button>
              <button type="button" data-buy="${art.id}">Уточнить покупку →</button>
            </div>
          </article>
        `
      )
      .join("")}
  `;
  $$("[data-inventory] [data-story]").forEach((button) => button.addEventListener("click", () => openOverlay(button.dataset.story)));
  $$("[data-inventory] [data-buy]").forEach((button) =>
    button.addEventListener("click", () => prefillPurchase(artworks.find((art) => art.id === button.dataset.buy)))
  );
}

function setupMenu() {
  const menu = $("#mobile-menu");
  const open = $("[data-menu-open]");
  const close = $("[data-menu-close]");
  open.addEventListener("click", () => {
    menu.hidden = false;
    open.setAttribute("aria-expanded", "true");
    document.body.classList.add("modal-open");
    close.focus();
  });
  close.addEventListener("click", closeMenu);
  $$("#mobile-menu a").forEach((link) => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (event) => {
    if (!menu.hidden && event.key === "Escape") closeMenu();
  });
  function closeMenu() {
    menu.hidden = true;
    open.setAttribute("aria-expanded", "false");
    document.body.classList.remove("modal-open");
    open.focus();
  }
}

function setupContact() {
  const form = $("[data-contact-form]");
  const panel = $("[data-generated]");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    $$(".field-error", form).forEach((node) => node.remove());
    $$("input, textarea", form).forEach((field) => field.removeAttribute("aria-invalid"));
    const data = Object.fromEntries(new FormData(form));
    const required = ["name", "contact", "message"];
    let valid = true;
    required.forEach((name) => {
      const field = form.elements[name];
      if (!String(data[name] || "").trim()) {
        valid = false;
        field.setAttribute("aria-invalid", "true");
        field.insertAdjacentHTML("afterend", `<span class="field-error">Это поле обязательно</span>`);
      }
    });
    if (!valid) return;
    const text = buildMessage(data);
    $("[data-generated-text]").value = text;
    $("[data-telegram-open]").href = telegramLink(text);
    panel.hidden = false;
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  $("[data-copy]").addEventListener("click", async () => {
    const text = $("[data-generated-text]").value;
    try {
      await navigator.clipboard.writeText(text);
      showToast("Текст скопирован");
    } catch {
      showToast("Не удалось скопировать автоматически");
    }
  });
}

function prefillPurchase(artwork) {
  const form = $("[data-contact-form]");
  form.message.value = `Хочу обсудить возможную покупку работы «${artwork.title}».`;
  location.hash = "#contact";
  setTimeout(() => form.message.focus(), 120);
}

function showToast(text) {
  const toast = $("[data-toast]");
  toast.textContent = text;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => (toast.hidden = true), 2200);
}

function setupBackTop() {
  $("[data-back-top]").addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
}

function setupHeaderSpy() {
  const links = $$(".desktop-nav a");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`));
      });
    },
    { rootMargin: "-35% 0px -55% 0px" }
  );
  $$("main > section[id]").forEach((section) => observer.observe(section));
}

function setupAutoplayVideo() {
  $$(".hero video").forEach((video) => video.play().catch(() => {}));
}

setup();
