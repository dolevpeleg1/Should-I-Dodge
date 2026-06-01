"use strict";

(function () {
  const dataEl = document.getElementById("champion-names-data");
  if (!dataEl) return;

  const names = JSON.parse(dataEl.textContent);
  const byLower = new Map(names.map((n) => [n.toLowerCase(), n]));

  function filter(query) {
    const q = query.trim().toLowerCase();
    if (!q) return names;
    return names.filter((n) => n.toLowerCase().includes(q));
  }

  function resolve(value) {
    return byLower.get(value.trim().toLowerCase()) || null;
  }

  function initWidget(root) {
    const input = root.querySelector(".champion-autocomplete__input");
    const list = root.querySelector(".champion-autocomplete__list");
    let activeIndex = -1;

    function closeList() {
      list.hidden = true;
      input.setAttribute("aria-expanded", "false");
      activeIndex = -1;
      list.querySelectorAll(".champion-autocomplete__option").forEach((el) => {
        el.classList.remove("is-active");
      });
    }

    function renderList(items) {
      list.innerHTML = "";
      if (!items.length) {
        closeList();
        return;
      }

      items.forEach((name) => {
        const li = document.createElement("li");
        li.className = "champion-autocomplete__option";
        li.setAttribute("role", "option");
        li.textContent = name;
        li.addEventListener("mousedown", (e) => {
          e.preventDefault();
          selectName(name);
        });
        list.appendChild(li);
      });

      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }

    function selectName(name) {
      input.value = name;
      input.setCustomValidity("");
      closeList();
    }

    function updateActive(options) {
      options.forEach((el, i) => {
        el.classList.toggle("is-active", i === activeIndex);
      });
      options[activeIndex]?.scrollIntoView({ block: "nearest" });
    }

    input.addEventListener("input", () => {
      input.setCustomValidity("");
      renderList(filter(input.value));
    });

    input.addEventListener("focus", () => {
      renderList(filter(input.value));
    });

    input.addEventListener("blur", () => {
      setTimeout(() => {
        closeList();
        const resolved = resolve(input.value);
        if (resolved) {
          input.value = resolved;
          input.setCustomValidity("");
        } else if (input.value.trim()) {
          input.setCustomValidity("Choose a champion from the list.");
        }
      }, 150);
    });

    input.addEventListener("keydown", (e) => {
      const options = [
        ...list.querySelectorAll(".champion-autocomplete__option"),
      ];

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (list.hidden) renderList(filter(input.value));
        const opts = [
          ...list.querySelectorAll(".champion-autocomplete__option"),
        ];
        activeIndex = Math.min(activeIndex + 1, opts.length - 1);
        updateActive(opts);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        updateActive(options);
      } else if (e.key === "Enter" && activeIndex >= 0 && options[activeIndex]) {
        e.preventDefault();
        selectName(options[activeIndex].textContent);
      } else if (e.key === "Escape") {
        closeList();
      }
    });
  }

  document.querySelectorAll(".champion-autocomplete").forEach(initWidget);

  document.querySelectorAll("form").forEach((form) => {
    if (!form.querySelector(".champion-autocomplete__input")) return;

    form.addEventListener("submit", (e) => {
      let firstInvalid = null;

      form.querySelectorAll(".champion-autocomplete__input").forEach((input) => {
        const resolved = resolve(input.value);
        if (!resolved) {
          input.setCustomValidity("Choose a champion from the list.");
          if (!firstInvalid) firstInvalid = input;
        } else {
          input.value = resolved;
          input.setCustomValidity("");
        }
      });

      if (firstInvalid) {
        e.preventDefault();
        firstInvalid.reportValidity();
        firstInvalid.focus();
      }
    });
  });
})();
