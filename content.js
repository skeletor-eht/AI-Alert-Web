// =======================
// AI Data Guard - content.js
// =======================

// -------- Config --------
const SHOW_BANNER = true;
const BANNER_TEXT = "⚠️ Firm Policy: Do NOT paste or upload client data into ChatGPT (and other AI sites).";
const DISMISS_MINUTES = 60;

const BLOCK_PASTE = true;          // UI/DOM-level (DNR rules still needed to fully enforce)
const BLOCK_FILE_UPLOADS = true;   // UI/DOM-level; sandboxed iframes are handled by rules.json
const BLOCK_DRAG_DROP = true;      // UI/DOM-level

// -------- Banner (top-level overlay) --------
(function showBannerOncePerSession() {
  if (!SHOW_BANNER) return;

  const KEY = "aiwarn_dismiss_until";
  const now = Date.now();
  const until = Number(sessionStorage.getItem(KEY) || "0");
  if (until && now < until) return;

  const bar = document.createElement("div");
  bar.id = "ai-data-warning-banner";
  bar.textContent = BANNER_TEXT;

  const btn = document.createElement("button");
  btn.textContent = "OK";
  Object.assign(btn.style, {
    marginLeft: "12px",
    padding: "4px 10px",
    border: "1px solid #e0c66d",
    background: "#ffe08a",
    color: "#663c00",
    borderRadius: "6px",
    cursor: "pointer"
  });
  btn.onclick = () => {
    sessionStorage.setItem(KEY, String(now + DISMISS_MINUTES * 60 * 1000));
    bar.remove();
    document.documentElement.style.paddingTop = originalRootPadding;
  };

  Object.assign(bar.style, {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    zIndex: "2147483647",
    padding: "10px 16px",
    background: "#fff3cd",
    color: "#663c00",
    font: "14px/1.4 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    borderBottom: "1px solid #ffe08a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 6px rgba(0,0,0,.08)"
  });
  bar.appendChild(btn);

  const mount = () => {
    if (!document.body) return setTimeout(mount, 25);
    // avoid covering top content
    document.body.appendChild(bar);
    document.documentElement.style.paddingTop = "44px";
  };

  const originalRootPadding = getComputedStyle(document.documentElement).paddingTop;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();

// -------- Paste guard (UI-level) --------
(function installPasteGuard(){
  if (!BLOCK_PASTE) return;
  window.addEventListener("paste", (e) => {
    // Block any paste (text or file/image clipboard)
    e.stopImmediatePropagation();
    e.preventDefault();
    alert("Paste is disabled on this site for firm data protection.");
  }, true);
})();

// -------- Drag & Drop guard (UI-level) --------
(function installDragDropGuard(){
  if (!BLOCK_DRAG_DROP) return;
  const kill = (e, msg) => {
    e.stopImmediatePropagation();
    e.preventDefault();
    if (msg) alert(msg);
  };
  window.addEventListener("dragover", (e) => {
    const types = e.dataTransfer?.types || [];
    if ([...types].includes("Files")) kill(e);
  }, true);
  window.addEventListener("drop", (e) => {
    const types = e.dataTransfer?.types || [];
    if ([...types].includes("Files")) kill(e, "File uploads are disabled on this site for firm data protection.");
  }, true);
})();

// -------- <input type="file"> guard (UI-level) --------
(function installInputDelegationGuard(){
  if (!BLOCK_FILE_UPLOADS) return;

  const neuter = (el) => {
    if (!el || el.tagName !== "INPUT" || el.type !== "file") return;
    el.addEventListener("click", (e) => { e.stopImmediatePropagation(); e.preventDefault(); alert("File uploads are disabled on this site for firm data protection."); }, true);
    el.addEventListener("change", (e) => { e.stopImmediatePropagation(); e.preventDefault(); try { el.value = ""; } catch {} }, true);
  };

  // Capture clicks/changes even if inputs are nested
  window.addEventListener("click", (e) => {
    const path = e.composedPath ? e.composedPath() : (e.path || []);
    if (path.some(n => n && n.tagName === "INPUT" && n.type === "file")) {
      e.stopImmediatePropagation();
      e.preventDefault();
      alert("File uploads are disabled on this site for firm data protection.");
      return false;
    }
  }, true);

  window.addEventListener("change", (e) => {
    const el = e.target;
    if (el && el.tagName === "INPUT" && el.type === "file") {
      e.stopImmediatePropagation();
      e.preventDefault();
      try { el.value = ""; } catch {}
      alert("File uploads are disabled on this site for firm data protection.");
      return false;
    }
  }, true);

  // Existing inputs
  document.querySelectorAll('input[type="file"]').forEach(neuter);

  // Future inputs (SPA behavior)
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      m.addedNodes.forEach((n) => {
        if (n.nodeType !== 1) return;
        if (n.tagName === "INPUT" && n.type === "file") neuter(n);
        n.querySelectorAll && n.querySelectorAll('input[type="file"]').forEach(neuter);
      });
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();

// -------- File Picker API overrides (UI-level) --------
(function installFilePickerOverride(){
  if (!BLOCK_FILE_UPLOADS) return;
  try {
    const deny = (name) => () => {
      alert("File picker is disabled on this site for firm data protection.");
      const err = new DOMException("Operation blocked by policy", "NotAllowedError");
      throw err;
    };
    if ("showOpenFilePicker" in window) window.showOpenFilePicker = deny("showOpenFilePicker");
    if ("showSaveFilePicker" in window) window.showSaveFilePicker = deny("showSaveFilePicker");
    if ("showDirectoryPicker" in window) window.showDirectoryPicker = deny("showDirectoryPicker");

    if (HTMLInputElement && HTMLInputElement.prototype && "showPicker" in HTMLInputElement.prototype) {
      const orig = HTMLInputElement.prototype.showPicker;
      HTMLInputElement.prototype.showPicker = function() {
        if (this.type === "file" && BLOCK_FILE_UPLOADS) {
          alert("File uploads are disabled on this site for firm data protection.");
          return;
        }
        return orig.apply(this, arguments);
      };
    }
  } catch { /* older browsers: ignore */ }
})();
