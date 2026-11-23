"use strict";

const validateForm = globalThis.aventraValidateInquiry;

const header = document.querySelector(".header");
if (header) {
  const update = () => header.classList.toggle("is-scrolled", window.scrollY > 30);
  update();
  window.addEventListener("scroll", update, { passive: true });

  const menu = header.querySelector(".mobile-menu");
  const trigger = header.querySelector(".menu-trigger");
  trigger.setAttribute("aria-expanded", "false");
  trigger.addEventListener("click", () => {
    menu.showModal();
    trigger.setAttribute("aria-expanded", "true");
  });
  menu.addEventListener("close", () => trigger.setAttribute("aria-expanded", "false"));

  const desktop = window.matchMedia("(width > 1120px)");
  desktop.addEventListener("change", (event) => {
    if (event.matches && menu.open) {
      menu.close();
      header.querySelector(".wordmark").focus();
    }
  });
  menu.querySelectorAll("button, a").forEach((element) => element.addEventListener("click", () => menu.close()));

  const dropdown = header.querySelector(".dropdown");
  const summary = dropdown.querySelector("summary");
  desktop.addEventListener("change", (event) => {
    if (!event.matches && dropdown.open) dropdown.open = false;
  });
  dropdown.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && dropdown.open) {
      dropdown.open = false;
      summary.focus();
    }
  });
  dropdown.addEventListener("focusout", (event) => {
    if (!dropdown.contains(event.relatedTarget)) dropdown.open = false;
  });
  document.addEventListener("click", (event) => {
    if (!dropdown.contains(event.target)) dropdown.open = false;
  });
}

function enableScrollReveals() {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (motion.matches || !("IntersectionObserver" in window)) return;

  const targets = document.querySelectorAll([
    "main .section-heading",
    "main .split > h2",
    "main .split > div:first-child > h2",
    "main .editorial h2",
    "main .statement h2",
    "main .vertical",
    "main .capability-grid > a",
    "main .editorial .photo",
    "main .service-index article",
    "main .service-scope .photo",
    "main .timeline > li",
  ].join(", "));

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      if (!motion.matches && !entry.target.matches(":focus-within")) {
        entry.target.classList.add("scroll-enter");
      }
    }
  }, { rootMargin: "0px 0px -32px 0px" });

  for (const target of targets) {
    if (target.getBoundingClientRect().top >= window.innerHeight) observer.observe(target);
  }
}

enableScrollReveals();

const form = document.querySelector("form.inquiry");
if (form) {
  const button = form.querySelector("button[type=submit]");
  const status = form.querySelector("[role=status]");
  if (location.protocol === "file:") button.textContent = "Download Inquiry Draft";
  const submitLabel = button.textContent;
  const fields = [...form.querySelectorAll("input, select, textarea")].filter((field) => field.tabIndex >= 0);
  const optionsFor = (name) => Array.from(form.elements[name]?.options ?? [], (option) => option.value).filter(Boolean);
  const choices = { services: optionsFor("service"), properties: optionsFor("property"), methods: optionsFor("method") };
  const initialService = new URLSearchParams(location.search).get("service");

  if (form.dataset.kind === "general" && choices.services.includes(initialService)) {
    const select = form.elements.service;
    [...select.options].find((option) => option.value === initialService).defaultSelected = true;
  }

  function showStatus(phase, message) {
    status.className = phase;
    status.textContent = message;
  }

  function showErrors(errors = {}) {
    let first;
    for (const field of fields) {
      const id = field.id + "-error";
      document.getElementById(id)?.remove();
      const message = errors[field.name];
      if (!message) {
        field.removeAttribute("aria-describedby");
        field.setAttribute("aria-invalid", "false");
        continue;
      }
      const error = document.createElement("span");
      error.className = "field-error";
      error.id = id;
      error.textContent = message;
      field.closest(".field, .consent").append(error);
      field.setAttribute("aria-invalid", "true");
      field.setAttribute("aria-describedby", id);
      first ??= field;
    }
    first?.focus();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (button.disabled) return;
    const fields = new FormData(form);
    const payload = { ...Object.fromEntries(fields), kind: form.dataset.kind, consent: fields.has("consent") };
    const result = validateForm(payload, choices);
    showErrors();
    if (result.invalid) {
      showStatus("error", "Check the highlighted fields and try again.");
      showErrors(result.errors);
      return;
    }

    if (location.protocol === "file:") {
      const details = fields.entries();
      const lines = ["AVENTRA GROUP Inquiry draft", ""];
      for (const [name, value] of details) {
        if (name !== "website" && name !== "consent" && value) {
          const field = form.elements[name];
          const label = field.labels[0].textContent.trim();
          lines.push(label + ": " + (field.selectedOptions?.[0]?.textContent ?? value));
        }
      }
      const link = document.createElement("a");
      const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }));
      link.href = url;
      link.download = "aventra-inquiry-draft.txt";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showStatus("success", "Your inquiry draft is ready to download. It has not been sent.");
      status.focus();
      return;
    }

    button.disabled = true;
    button.textContent = "Sending...";
    form.setAttribute("aria-busy", "true");
    showStatus("pending", "");
    try {
      const response = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const reply = await response.json();
      if (!response.ok) {
        showStatus("error", reply.message);
        showErrors(reply.errors);
        return;
      }
      form.reset();
      showStatus("success", "Thank you. Your inquiry has been submitted.");
      status.focus();
    } catch {
      showStatus("error", "We could not submit your inquiry. Please try again.");
    } finally {
      button.disabled = false;
      button.textContent = submitLabel;
      form.setAttribute("aria-busy", "false");
    }
  });
}
