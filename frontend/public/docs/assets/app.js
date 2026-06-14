const sections = [...document.querySelectorAll(".doc-section")];
const sideLinks = [...document.querySelectorAll(".side-group a")];
const treeParents = [...document.querySelectorAll(".side-parent[data-tree]")];
const tabLinks = [...document.querySelectorAll(".tabs a")];
const searchButton = document.querySelector("#searchButton");
const searchModal = document.querySelector("#searchModal");
const searchInput = document.querySelector("#searchInput");
const searchResults = document.querySelector("#searchResults");
const searchClose = document.querySelector("#searchClose");
const assistantModal = document.querySelector("#assistantModal");
const assistantMessages = document.querySelector("#assistantMessages");
const assistantInput = document.querySelector("#assistantInput");
const assistantForm = document.querySelector("#assistantForm");

function setActive(hash) {
  sideLinks.forEach((link) => link.classList.toggle("selected", link.getAttribute("href") === hash));
  const target = document.querySelector(hash);
  const parentSection = target?.classList.contains("doc-section") ? target : target?.closest(".doc-section");
  const sectionHash = parentSection ? `#${parentSection.id}` : hash;
  tabLinks.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === sectionHash));
  openTreeForChildHash(hash);
}

function setTreeOpen(treeName, isOpen) {
  const parent = document.querySelector(`.side-parent[data-tree="${treeName}"]`);
  const panel = document.querySelector(`.side-children[data-tree-panel="${treeName}"]`);
  if (!parent || !panel) return;
  parent.setAttribute("aria-expanded", String(isOpen));
  panel.hidden = !isOpen;
  parent.querySelector(".side-chevron").textContent = isOpen ? "v" : ">";
}

function openTreeForChildHash(hash) {
  const link = document.querySelector(`.side-group a[href="${hash}"]`);
  const childPanel = link?.closest(".side-children[data-tree-panel]");
  if (childPanel) {
    setTreeOpen(childPanel.dataset.treePanel, true);
  }
}

function resetResultFocus() {
  sections.forEach((section) => section.classList.remove("result-topic-page"));
  document.querySelectorAll(".result-workbook details").forEach((details) => {
    details.hidden = false;
  });
  document.querySelectorAll(".material-card, .material-summary-table").forEach((topic) => {
    topic.hidden = false;
  });
  sections.forEach((section) => section.classList.remove("material-topic-page"));
}

function focusResultTopic(target) {
  const resultTopic = target.closest(".result-category, .result-sheet");
  const materialTopic = target.closest(".material-card, .material-summary-table");
  const section = target.closest(".doc-section");
  if (!section) return;

  if (resultTopic) {
    section.classList.add("result-topic-page");
    section.querySelectorAll(".result-workbook details").forEach((details) => {
      const shouldShow = details === resultTopic || details.contains(resultTopic) || resultTopic.contains(details);
      details.hidden = !shouldShow;
      if (shouldShow) {
        details.open = true;
      }
    });
  }

  if (materialTopic) {
    section.classList.add("material-topic-page");
    section.querySelectorAll(".material-card, .material-summary-table").forEach((topic) => {
      topic.hidden = topic !== materialTopic;
    });
  }
}

function showPage(hash, updateHistory = true, scrollTargetHash = hash) {
  const target = document.querySelector(hash);
  if (!target || !target.classList.contains("doc-section")) return;

  resetResultFocus();

  sections.forEach((section) => {
    const isCurrent = section === target;
    section.hidden = !isCurrent;
    section.classList.toggle("current-section", isCurrent);
  });

  closeSearch();
  closeAssistant();
  setActive(scrollTargetHash);

  const scrollTarget = document.querySelector(scrollTargetHash);
  if (scrollTarget && scrollTarget !== target) {
    focusResultTopic(scrollTarget);
    scrollTarget.closest("details")?.setAttribute("open", "");
    scrollTarget.querySelectorAll("details").forEach((details) => {
      details.open = true;
    });
    setTimeout(() => scrollTarget.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (updateHistory) {
    history.replaceState(null, "", scrollTargetHash);
  }
}

function navigateToHash(hash, updateHistory = true) {
  const target = document.querySelector(hash);
  if (!target) return;

  if (target.classList.contains("doc-section")) {
    showPage(hash, updateHistory);
    return;
  }

  const parentSection = target.closest(".doc-section");
  if (!parentSection) return;
  showPage(`#${parentSection.id}`, updateHistory, hash);
}

document.querySelectorAll("[data-copy-section]").forEach((button) => {
  button.addEventListener("click", async () => {
    const id = button.dataset.copySection;
    const section = document.getElementById(id);
    await navigator.clipboard.writeText(section?.innerText.trim() || document.body.innerText);
    const original = button.textContent;
    button.textContent = "Copied";
    setTimeout(() => {
      button.textContent = original;
    }, 1200);
  });
});

const linkedSectionIds = new Set(sideLinks.map((link) => link.getAttribute("href")?.replace("#", "")).filter(Boolean));

const searchable = sections.filter((section) => linkedSectionIds.has(section.id)).map((section) => ({
  id: section.id,
  title: section.querySelector("h1, h2")?.textContent || section.id,
  text: section.innerText.replace(/\s+/g, " ").trim(),
}));

const quickLinks = [
  "Hello World",
  "Installation",
  "Using Python and QClang",
  "Onboarding Tutorial",
  "Language Blocks",
  "Compiler Pipeline",
  "Compilation Targets",
  "Superconducting Materials",
  "HFSS Electromagnetic Simulation",
  "Q3D Extractor Analysis",
  "EPR Analysis in Superconducting Quantum Circuits",
  "Simulation Dashboard Parameters",
  "Results, Verification, and Reports",
  "HFSS Result Parameter Analysis",
  "Q3D Result Parameter Analysis",
  "EPR / scQubits Result Parameter Analysis",
  "API Reference",
  "Integration",
  "Support",
  "Synthesis Tutorial",
];

function openSearch() {
  if (!searchModal || !searchInput || !searchResults) return;
  searchModal.hidden = false;
  searchInput.value = "";
  renderResults("");
  setTimeout(() => searchInput.focus(), 0);
}

function closeSearch() {
  if (!searchModal) return;
  searchModal.hidden = true;
}

function openAssistant() {
  if (!assistantModal || !assistantInput) return;
  assistantModal.hidden = false;
  setTimeout(() => assistantInput.focus(), 0);
}

function closeAssistant() {
  if (!assistantModal) return;
  assistantModal.hidden = true;
}

function renderResults(query) {
  const clean = query.trim().toLowerCase();
  const results = clean
    ? searchable.filter((item) => item.text.toLowerCase().includes(clean) || item.title.toLowerCase().includes(clean))
    : searchable.filter((item) => quickLinks.includes(item.title));

  if (!results.length) {
    searchResults.innerHTML = `
      <div class="search-empty">
        <strong>No matching topic found</strong>
        <span>Try searching for compiler, qubit, QAOA, syntax, DRC, target, or integration.</span>
      </div>
    `;
    return;
  }

  searchResults.innerHTML = `
    <div class="search-hint">${clean ? `${results.length} matching topic${results.length === 1 ? "" : "s"}` : "Popular topics"}</div>
    ${results
      .map((item) => {
        const snippet = item.text
          .replace(item.title, "")
          .trim()
          .slice(0, 210);
        return `
          <a class="search-result" href="#${item.id}">
            <strong>${item.title}</strong>
            <span>${snippet}...</span>
          </a>
        `;
      })
      .join("")}
  `;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function addAssistantMessage(role, html) {
  if (!assistantMessages) return;
  const message = document.createElement("article");
  message.className = `assistant-message assistant-message-${role}`;
  message.innerHTML = html;
  assistantMessages.appendChild(message);
  assistantMessages.scrollTop = assistantMessages.scrollHeight;
}

function findAssistantMatches(question) {
  const words = question
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((word) => word.length > 2);

  return searchable
    .map((item) => {
      const haystack = `${item.title} ${item.text}`.toLowerCase();
      const score = words.reduce((total, word) => total + (haystack.includes(word) ? 1 : 0), 0);
      return { ...item, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function buildAssistantAnswer(question) {
  const clean = question.trim();
  const lower = clean.toLowerCase();
  let matches = findAssistantMatches(clean);

  if (lower.includes("install") || lower.includes("setup") || lower.includes("start")) {
    matches = searchable.filter((item) => ["installation", "using-python", "getting-started"].includes(item.id)).slice(0, 3);
  } else if (lower.includes("compile") || lower.includes("compiler") || lower.includes("workflow")) {
    matches = searchable.filter((item) => ["compiler-reference", "using-python", "synthesis-tutorial"].includes(item.id)).slice(0, 3);
  } else if (lower.includes("api") || lower.includes("endpoint") || lower.includes("parse")) {
    matches = searchable.filter((item) => ["api-reference", "execution-part-1", "execution-part-2"].includes(item.id)).slice(0, 3);
  } else if (lower.includes("material") || lower.includes("aluminum") || lower.includes("niobium") || lower.includes("sapphire") || lower.includes("alox") || lower.includes("tin")) {
    matches = searchable.filter((item) => ["superconducting-materials", "chip-synthesis", "hfss-tutorial"].includes(item.id)).slice(0, 3);
  } else if (lower.includes("hfss") || lower.includes("electromagnetic") || lower.includes("eigenmode")) {
    matches = searchable.filter((item) => ["hfss-results-analysis", "hfss-tutorial", "simulation-dashboard"].includes(item.id)).slice(0, 3);
  } else if (lower.includes("q3d") || lower.includes("capacitance") || lower.includes("matrix")) {
    matches = searchable.filter((item) => ["q3d-results-analysis", "q3d-tutorial", "design-rules"].includes(item.id)).slice(0, 3);
  } else if (lower.includes("epr") || lower.includes("scqubits") || lower.includes("energy") || lower.includes("hamiltonian")) {
    matches = searchable.filter((item) => ["epr-results-analysis", "epr-tutorial", "results-reports"].includes(item.id)).slice(0, 3);
  } else if (lower.includes("integrat") || lower.includes("frontend") || lower.includes("backend")) {
    matches = searchable.filter((item) => ["integration", "api-reference", "user-guide"].includes(item.id)).slice(0, 3);
  }

  if (!matches.length) {
    matches = searchable.slice(0, 3);
  }

  const first = matches[0];
  const snippet = first.text.replace(first.title, "").trim().slice(0, 320);
  const sources = matches
    .map((item) => `<button class="assistant-source" type="button" data-target="#${item.id}">${escapeHtml(item.title)}</button>`)
    .join("");

  return `
    <strong>${escapeHtml(first.title)}</strong>
    <p>${escapeHtml(snippet)}...</p>
    <p>For your QClang documentation, the best next step is to open the matched topic and follow the command or explanation shown there.</p>
    <div class="assistant-sources">${sources}</div>
  `;
}

function askAssistant(question) {
  const clean = question.trim();
  if (!clean) return;
  addAssistantMessage("user", `<strong>${escapeHtml(clean)}</strong>`);
  assistantInput.value = "";
  setTimeout(() => addAssistantMessage("bot", buildAssistantAnswer(clean)), 220);
}

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const treeParent = target.closest(".side-parent[data-tree]");
  if (treeParent) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const treeName = treeParent.dataset.tree;
    const isOpen = treeParent.getAttribute("aria-expanded") === "true";
    if (isOpen) {
      setTreeOpen(treeName, false);
      treeParent.classList.remove("selected");
      return;
    }

    setTreeOpen(treeName, true);
    navigateToHash(treeParent.getAttribute("href"));
    return;
  }

  const pageLink = target.closest('a[href^="#"]');
  if (pageLink && !pageLink.classList.contains("search-result")) {
    const hash = pageLink.getAttribute("href");
    if (hash && document.querySelector(hash)) {
      event.preventDefault();
      navigateToHash(hash);
      return;
    }
  }

  if (target.closest("#searchButton")) {
    event.preventDefault();
    openSearch();
    return;
  }

  if (target.closest("#assistantButton")) {
    event.preventDefault();
    closeSearch();
    openAssistant();
    return;
  }

  if (target.closest("#assistantClose")) {
    event.preventDefault();
    closeAssistant();
    return;
  }

  if (target === assistantModal) {
    closeAssistant();
    return;
  }

  const suggestion = target.closest(".assistant-suggestion");
  if (suggestion) {
    event.preventDefault();
    askAssistant(suggestion.textContent || "");
    return;
  }

  const assistantSource = target.closest(".assistant-source[data-target]");
  if (assistantSource) {
    event.preventDefault();
    const hash = assistantSource.dataset.target;
    if (hash) navigateToHash(hash);
    return;
  }

  if (target.closest("#searchClose")) {
    event.preventDefault();
    closeSearch();
    return;
  }

  if (target === searchModal) {
    closeSearch();
    return;
  }

  const resultLink = target.closest(".search-result");
  if (resultLink) {
    event.preventDefault();
    const hash = resultLink.getAttribute("href");
    if (hash) navigateToHash(hash);
    return;
  }
});

searchInput?.addEventListener("input", () => renderResults(searchInput.value));

assistantForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  askAssistant(assistantInput?.value || "");
});

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openSearch();
  }
  if (event.key === "Escape") {
    closeSearch();
    closeAssistant();
  }
});

document.querySelector("#themeButton").addEventListener("click", () => {
  document.body.classList.toggle("soft-theme");
});

window.addEventListener("popstate", () => {
  navigateToHash(location.hash || "#home", false);
});

navigateToHash(location.hash || "#home", false);

