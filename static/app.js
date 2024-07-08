function isReady() {
  return !!window.elasticlunr;
}

function skipEventLoopTick() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

async function loadIndex() {
  return fetch("/search_index.en.json")
    .then((res) => res.json())
    .then((resjson) => elasticlunr.Index.load(resjson));
}

function showSearchUI(el_divSearchResult, el_divSearchClose) {
  return () => {
    for (const classList of [
      el_divSearchResult.classList,
      el_divSearchClose.classList,
    ]) {
      if (classList.contains("hidden")) {
        classList.remove("hidden");
      }
    }
  };
}

function hideSearchUI(el_divSearchResult, el_divSearchClose) {
  return () => {
    for (const classList of [
      el_divSearchResult.classList,
      el_divSearchClose.classList,
    ]) {
      if (!classList.contains("hidden")) {
        classList.add("hidden");
      }
    }
  };
}

function searchAndDisplayResults(index, el_inputSearch, el_divSearchResult) {
  return debounce(() => {
    const value = el_inputSearch.value;
    let htmlSearchResult = createHtmlFromSearchResultList("", []);
    if (value) {
      htmlSearchResult = createHtmlFromSearchResultList(
        value,
        index.search(value, {
          fields: {
            title: { boost: 3 },
            description: { boost: 2 },
            body: { boost: 1 },
          },
        }),
      );
    }
    el_divSearchResult.innerHTML = htmlSearchResult;
  }, 400);
}

function debounce(f, ms) {
  let timeoutId = null;
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(f, ms);
  };
}

function createHtmlFromSearchResultItem({
  doc: { title, description, body },
  ref,
}) {
  const MAX_BODY_PREVIEW = 128;
  return `
    <section class="relative z-10 w-full bg-zinc-300 dark:bg-zinc-900 relative mb-4 lg:mb-6 last-of-type:mb-6 rounded-lg p-4 active:scale-95 lg:p-6">
      <h3 class="!my-0 pb-1 font-bold !leading-none">${title}</h3>
      <div class="not-prose my-1 truncate">
        <p>${description}</p>
      </div>
      <div class="text-sm antialiased opacity-60">
        <span>${(body || "").slice(0, MAX_BODY_PREVIEW) + ((body || "").length > MAX_BODY_PREVIEW ? "..." : "")}</span>
      </div>
      <a class="absolute inset-0 text-[0]" href="${ref}">${title}</a>
    </section>
  `
    .trim()
    .replace(/\n\s*</g, "<");
}

function createHtmlFromSearchResultList(keyword, resultItems) {
  if (Array.isArray(resultItems) && resultItems.length > 0) {
    return resultItems
      .map((result) => createHtmlFromSearchResultItem(result))
      .join("");
  } else if (keyword) {
    return `<p>No results found, please try another keyword.</p>`;
  } else {
    return `<p>Start searching by typing in keywords that match post title, description or content.</p>`;
  }
}

async function runapp() {
  const index = await loadIndex();
  const el_inputSearch = document.getElementById("input_search");
  const el_divSearchResult = document.getElementById("div_search_result");
  const el_divSearchClose = document.getElementById("div_search_close");

  el_inputSearch.onfocus = showSearchUI(el_divSearchResult, el_divSearchClose);
  el_divSearchClose.onclick = hideSearchUI(
    el_divSearchResult,
    el_divSearchClose,
  );
  el_inputSearch.onkeyup = searchAndDisplayResults(
    index,
    el_inputSearch,
    el_divSearchResult,
  );

  el_divSearchResult.innerHTML = createHtmlFromSearchResultList("", []);
}

window.onload = function () {
  (async () => {
    while (!isReady()) {
      await skipEventLoopTick();
    }
  })().then(runapp);
};
