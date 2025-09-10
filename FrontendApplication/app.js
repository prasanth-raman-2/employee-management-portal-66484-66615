//
// Employee Management Portal - Core Client-Side Script (Plain JavaScript)
// - Wires up demo interactivity for login/MFA, navigation, forms, widgets, tabs/collapsibles,
//   roles/audit interactions, messaging, and dashboard actions.
// - Organized as a small modular structure without frameworks.
// - All future backend/API hookups are clearly marked with "BACKEND_HOOK" comments.
//
// Accessibility & UX:
// - Keeps keyboard focus and ARIA attributes in mind where applicable.
// - Basic form validation with inline messages.
// - Simple state persisted to sessionStorage/localStorage for demo.
//
// PUBLIC_INTERFACE: initEMPApp
(function () {
  "use strict";

  // Utilities
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // PUBLIC_INTERFACE
  function showToast(message, type = "info", timeout = 2500) {
    /** Show a small toast notification on the bottom-right. */
    let host = $("#emp-toast-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "emp-toast-host";
      host.style.position = "fixed";
      host.style.right = "12px";
      host.style.bottom = "12px";
      host.style.display = "grid";
      host.style.gap = "8px";
      host.style.zIndex = "9999";
      document.body.appendChild(host);
    }
    const toast = document.createElement("div");
    toast.setAttribute("role", "status");
    toast.style.padding = "10px 12px";
    toast.style.borderRadius = "8px";
    toast.style.color = "#111827";
    toast.style.border = "1px solid #D1D5DB";
    toast.style.background = type === "error" ? "#FEE2E2" : type === "success" ? "#DCFCE7" : "#F3F4F6";
    toast.textContent = message;
    host.appendChild(toast);
    setTimeout(() => toast.remove(), timeout);
  }

  // Session/auth demo state
  const SESSION = {
    // stored in sessionStorage for page navigation demo
    get() {
      try {
        return JSON.parse(sessionStorage.getItem("emp_session") || "{}");
      } catch {
        return {};
      }
    },
    set(obj) {
      sessionStorage.setItem("emp_session", JSON.stringify(obj || {}));
    },
    clear() {
      sessionStorage.removeItem("emp_session");
    },
  };

  // Demo MFA modal (no markup exists yet, build lightweight modal on demand)
  function buildMFAModal() {
    let modal = $("#emp-mfa-modal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "emp-mfa-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "emp-mfa-title");
    Object.assign(modal.style, {
      position: "fixed", inset: "0", background: "rgba(0,0,0,.5)",
      display: "none", alignItems: "center", justifyContent: "center", zIndex: "9998",
    });

    const panel = document.createElement("div");
    Object.assign(panel.style, {
      width: "min(520px, 92vw)", background: "#fff", border: "1px solid #E5E7EB",
      borderRadius: "12px", padding: "16px",
    });

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
        <h2 id="emp-mfa-title" style="margin:0;">Multi‑Factor Authentication</h2>
        <button type="button" class="btn btn-ghost" id="emp-mfa-close">Close</button>
      </div>
      <div class="tablist" role="tablist" aria-label="MFA Methods" style="display:flex;gap:8px;margin-bottom:8px;">
        <button role="tab" aria-selected="true" id="tab-app" class="btn btn-secondary">Authenticator App</button>
        <button role="tab" aria-selected="false" id="tab-sms" class="btn btn-ghost">SMS/Email</button>
        <button role="tab" aria-selected="false" id="tab-backup" class="btn btn-ghost">Backup Code</button>
      </div>
      <div id="panel-app" role="tabpanel" aria-labelledby="tab-app">
        <p class="muted small">Enter your 6-digit code from your authenticator app.</p>
        <div class="form-field">
          <label for="emp-mfa-code">Code</label>
          <input id="emp-mfa-code" maxlength="6" inputmode="numeric" placeholder="123456" />
        </div>
        <div class="form-row between" style="margin-top:8px;">
          <div class="form-check">
            <input type="checkbox" id="emp-remember-device" />
            <label for="emp-remember-device">Remember this device</label>
          </div>
          <button type="button" class="btn btn-ghost" id="emp-mfa-resend">Resend</button>
        </div>
        <div class="btn-row" style="margin-top:10px;">
          <button type="button" class="btn btn-primary" id="emp-mfa-verify">Verify</button>
        </div>
      </div>
      <div id="panel-sms" role="tabpanel" aria-labelledby="tab-sms" hidden>
        <p class="muted small">We sent a 6-digit code to your email/phone.</p>
        <div class="form-field">
          <label for="emp-mfa-code-sms">Code</label>
          <input id="emp-mfa-code-sms" maxlength="6" inputmode="numeric" placeholder="654321" />
        </div>
        <div class="btn-row" style="margin-top:10px;">
          <button type="button" class="btn btn-primary" id="emp-mfa-verify-sms">Verify</button>
        </div>
      </div>
      <div id="panel-backup" role="tabpanel" aria-labelledby="tab-backup" hidden>
        <p class="muted small">Use one of your backup codes.</p>
        <div class="form-field">
          <label for="emp-mfa-backup">Backup Code</label>
          <input id="emp-mfa-backup" placeholder="ABCD-EFGH-IJKL" />
        </div>
        <div class="btn-row" style="margin-top:10px;">
          <button type="button" class="btn btn-primary" id="emp-mfa-verify-backup">Verify</button>
        </div>
      </div>
    `;

    modal.appendChild(panel);
    document.body.appendChild(modal);

    // Wire tabs
    const tabs = [$("#tab-app", panel), $("#tab-sms", panel), $("#tab-backup", panel)];
    const panels = [$("#panel-app", panel), $("#panel-sms", panel), $("#panel-backup", panel)];
    tabs.forEach((tab, idx) => {
      tab?.addEventListener("click", () => {
        tabs.forEach((t, i) => {
          t.setAttribute("aria-selected", String(i === idx));
          t.classList.toggle("btn-secondary", i === idx);
          t.classList.toggle("btn-ghost", i !== idx);
          panels[i].hidden = i !== idx;
        });
      });
    });

    // Close
    $("#emp-mfa-close", panel)?.addEventListener("click", () => hideMFAModal());
    modal.addEventListener("click", (e) => {
      if (e.target === modal) hideMFAModal();
    });

    // Demo verify
    $("#emp-mfa-verify", panel)?.addEventListener("click", () => {
      // BACKEND_HOOK: POST /auth/mfa/verify with code + rememberDevice
      showToast("MFA verified (demo). Redirecting…", "success");
      const s = SESSION.get();
      s.isAuthenticated = true;
      s.mfaPassed = true;
      SESSION.set(s);
      setTimeout(() => (window.location.href = "dashboard.html"), 800);
    });
    $("#emp-mfa-verify-sms", panel)?.addEventListener("click", () => {
      // BACKEND_HOOK: POST /auth/mfa/verify-sms
      showToast("SMS/Email code verified (demo).", "success");
      const s = SESSION.get();
      s.isAuthenticated = true;
      s.mfaPassed = true;
      SESSION.set(s);
      setTimeout(() => (window.location.href = "dashboard.html"), 800);
    });
    $("#emp-mfa-verify-backup", panel)?.addEventListener("click", () => {
      // BACKEND_HOOK: POST /auth/mfa/verify-backup
      showToast("Backup code accepted (demo).", "success");
      const s = SESSION.get();
      s.isAuthenticated = true;
      s.mfaPassed = true;
      SESSION.set(s);
      setTimeout(() => (window.location.href = "dashboard.html"), 800);
    });
    $("#emp-mfa-resend", panel)?.addEventListener("click", () => {
      // BACKEND_HOOK: POST /auth/mfa/resend
      showToast("Verification code resent (demo).", "info");
    });

    return modal;
  }

  function showMFAModal() {
    const modal = buildMFAModal();
    modal.style.display = "flex";
    $("#emp-mfa-code")?.focus();
  }
  function hideMFAModal() {
    const modal = $("#emp-mfa-modal");
    if (modal) modal.style.display = "none";
  }

  // General form validation helpers
  function validateForm(form) {
    let valid = true;
    const errors = [];
    const requiredFields = $$("[required]", form);

    requiredFields.forEach((el) => {
      const wrap = el.closest(".form-field") || el.parentElement;
      let errEl = $(".field-error", wrap);
      const clear = () => {
        wrap?.classList.remove("has-error");
        errEl?.remove();
      };
      const show = (msg) => {
        wrap?.classList.add("has-error");
        errEl = document.createElement("div");
        errEl.className = "field-error";
        errEl.style.color = "#B91C1C";
        errEl.style.fontSize = "0.85rem";
        errEl.textContent = msg;
        wrap?.appendChild(errEl);
      };
      clear();

      if (!el.value || (el.type === "email" && !/.+@.+\..+/.test(el.value))) {
        valid = false;
        const label = (wrap && $("label", wrap)?.textContent) || el.name || "Field";
        const msg = el.type === "email" ? `${label}: enter a valid email.` : `${label} is required.`;
        errors.push(msg);
        show(msg);
      }
    });

    // simple min/max number checks
    $$('input[type="number"]', form).forEach((el) => {
      const v = el.value ? Number(el.value) : null;
      if (v != null) {
        const min = el.min !== "" ? Number(el.min) : null;
        const max = el.max !== "" ? Number(el.max) : null;
        if ((min != null && v < min) || (max != null && v > max)) {
          valid = false;
          const wrap = el.closest(".form-field") || el.parentElement;
          const label = (wrap && $("label", wrap)?.textContent) || el.name || "Number";
          const msg = `${label} must be between ${min ?? "-∞"} and ${max ?? "+∞"}.`;
          const err = document.createElement("div");
          err.className = "field-error";
          err.style.color = "#B91C1C";
          err.style.fontSize = "0.85rem";
          err.textContent = msg;
          wrap?.appendChild(err);
          errors.push(msg);
        }
      }
    });

    return { valid, errors };
  }

  // Attach validation on all forms
  function wireGlobalFormValidation() {
    $$("form").forEach((form) => {
      if (form.dataset.empBound === "1") return;
      form.dataset.empBound = "1";

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        // Clear previous field errors
        $$(".field-error", form).forEach((n) => n.remove());
        const { valid, errors } = validateForm(form);
        if (!valid) {
          showToast(`Please fix ${errors.length} issue(s).`, "error");
          return;
        }
        // Demo submit handling based on context
        const page = document.title;
        if (/Authentication/i.test(page) && $("#email", form) && $("#password", form)) {
          // BACKEND_HOOK: POST /auth/login with credentials
          showToast("Login submitted (demo). Showing MFA…", "info");
          const current = SESSION.get();
          current.pendingMFA = true;
          SESSION.set(current);
          showMFAModal();
          return;
        }

        // Employees, leave, payroll, documents, roles, audit generic submit
        showToast("Form submitted (demo).", "success");

        // BACKEND_HOOK: Replace with actual fetch to backend API and handle responses
      });

      form.addEventListener("reset", () => {
        $$(".field-error", form).forEach((n) => n.remove());
        showToast("Form reset.", "info");
      });
    });
  }

  // Wire login page specifics
  function wireLoginPage() {
    if (!/Authentication/i.test(document.title)) return;

    // SSO buttons
    $$(".sso-grid .btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        // BACKEND_HOOK: Redirect to provider OAuth
        showToast(`Starting ${btn.getAttribute("aria-label") || btn.textContent} (demo).`, "info");
        const s = SESSION.get();
        s.pendingMFA = true; // Demo: assume SSO still requires MFA
        SESSION.set(s);
        showMFAModal();
      });
    });
  }

  // Wire dashboard page actions
  function wireDashboardPage() {
    if (!/Analytics Dashboard|Analytics & Reporting/i.test(document.title)) return;

    // Report builder export/save buttons
    const rb = $(".report-builder");
    if (rb) {
      const [csvBtn, xlBtn, pdfBtn, saveBtn] = $$(".rb-actions .btn", rb);
      csvBtn?.addEventListener("click", () => {
        // BACKEND_HOOK: GET /reports/export?format=csv
        showToast("Exporting CSV (demo).", "info");
      });
      xlBtn?.addEventListener("click", () => {
        // BACKEND_HOOK: GET /reports/export?format=xlsx
        showToast("Exporting Excel (demo).", "info");
      });
      pdfBtn?.addEventListener("click", () => {
        // BACKEND_HOOK: GET /reports/export?format=pdf
        showToast("Exporting PDF (demo).", "info");
      });
      saveBtn?.addEventListener("click", () => {
        // BACKEND_HOOK: POST /reports/save
        showToast("Report saved (demo).", "success");
      });

      // Demo drag/drop placeholder: click to select widget
      $$(".rb-widget", rb).forEach((w) => {
        w.style.cursor = "pointer";
        w.addEventListener("click", () => {
          w.classList.toggle("selected");
          w.style.outline = w.classList.contains("selected") ? "3px solid #93C5FD" : "none";
        });
      });
    }
  }

  // Employees page widgets and collapsibles
  function wireEmployeesPage() {
    if (!/Employee Management/i.test(document.title)) return;

    // Quick view buttons to anchor sections
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href")?.slice(1);
        if (!id) return;
        const target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        showToast(`Jumped to ${id}.`, "info");
      });
    });

    // Skills add
    const skillForm = $("#skill")?.closest("form");
    skillForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $("#skill");
      const text = input?.value?.trim();
      if (!text) {
        showToast("Enter a skill.", "error");
        return;
      }
      const list = $(".tag-list");
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = text;
      list?.appendChild(span);
      input.value = "";
      showToast("Skill added (demo).", "success");
      // BACKEND_HOOK: POST /employees/{id}/skills
    });

    // Certifications add
    const certForm = $("#cert-name")?.closest("form");
    certForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("#cert-name")?.value?.trim();
      const exp = $("#cert-exp")?.value?.trim();
      if (!name) {
        showToast("Certification name required.", "error");
        return;
      }
      const ul = $$(".card h2").find((h) => h.textContent.includes("Certifications"))?.closest(".card")?.querySelector("ul.list");
      const li = document.createElement("li");
      li.textContent = `${name} ${exp ? `(Valid until: ${exp})` : ""}`;
      ul?.appendChild(li);
      $("#cert-name").value = "";
      $("#cert-exp").value = "";
      showToast("Certification added (demo).", "success");
      // BACKEND_HOOK: POST /employees/{id}/certifications
    });

    // Documents upload demo
    const docForm = $("#docs-heading")?.closest(".card")?.querySelector('form[action="#"]');
    docForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      showToast("Document uploaded (demo).", "success");
      // BACKEND_HOOK: POST /employees/{id}/documents with file
    });
  }

  // Leave & Attendance page interactivity
  function wireLeaveAttendancePage() {
    if (!/Leave & Attendance/i.test(document.title)) return;

    // Maintain a demo leave balance in localStorage
    const balancesKey = "emp_balances";
    const defaultBalances = { annual: 12, sick: 5, casual: 7 };
    const getBalances = () => {
      try {
        return JSON.parse(localStorage.getItem(balancesKey) || "null") || defaultBalances;
      } catch {
        return defaultBalances;
      }
    };
    const setBalances = (b) => localStorage.setItem(balancesKey, JSON.stringify(b));

    function updateBalanceUI() {
      const list = $$("h2 + ul.list").find((ul) => ul.previousElementSibling?.textContent?.includes("Leave Balances"));
      if (!list) return;
      const b = getBalances();
      list.innerHTML = `
        <li>Annual Leave: <strong>${b.annual}</strong> days remaining</li>
        <li>Sick Leave: <strong>${b.sick}</strong> days remaining</li>
        <li>Casual Leave: <strong>${b.casual}</strong> days remaining</li>
      `;
    }
    updateBalanceUI();

    // Handle Leave Request submission
    const leaveForm = $$("form").find((f) => $("label", f)?.textContent?.includes("Leave Type"));
    leaveForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const { valid } = validateForm(leaveForm);
      if (!valid) {
        showToast("Please complete required fields.", "error");
        return;
      }
      const type = $("#leave-type")?.value || "Annual Leave";
      const days = Number($("#leave-days")?.value || "1");
      const b = getBalances();
      const key =
        /annual/i.test(type) ? "annual" :
        /sick/i.test(type) ? "sick" :
        "casual";
      b[key] = Math.max(0, (b[key] || 0) - days);
      setBalances(b);
      updateBalanceUI();
      showToast(`Leave request submitted for ${days} day(s) of ${type} (demo).`, "success");
      // BACKEND_HOOK: POST /leave/requests
    });

    // Calendar prev/next demo
    const calHeader = $(".calendar-header");
    const prevBtn = calHeader?.querySelector("button[aria-label='Previous month']");
    const nextBtn = calHeader?.querySelector("button[aria-label='Next month']");
    let monthIdx = 9; // October (0-based index)
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    function updateMonth(delta) {
      monthIdx = (monthIdx + delta + 12) % 12;
      calHeader.firstElementChild.textContent = `${months[monthIdx]} 2025`;
      showToast(`Moved to ${months[monthIdx]} 2025 (demo).`, "info");
      // BACKEND_HOOK: Fetch and display team leave badges per month
    }
    prevBtn?.addEventListener("click", () => updateMonth(-1));
    nextBtn?.addEventListener("click", () => updateMonth(1));
  }

  // Payroll & Performance page
  function wirePayrollPerformancePage() {
    if (!/Payroll & Performance/i.test(document.title)) return;

    // Buttons
    const genBtn = $$("button").find((b) => b.textContent.includes("Generate Payslip"));
    const dlBtn = $$("button").find((b) => b.textContent.includes("Download Last Payslip"));
    genBtn?.addEventListener("click", () => {
      // BACKEND_HOOK: POST /payroll/generate
      showToast("Payslip generated (demo).", "success");
    });
    dlBtn?.addEventListener("click", () => {
      // BACKEND_HOOK: GET /payroll/payslip/latest
      showToast("Downloading last payslip (demo).", "info");
    });

    // KPIs & Goals add
    const goalsForm = $("#goal-text")?.closest("form");
    goalsForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = $("#goal-text")?.value?.trim();
      const due = $("#goal-date")?.value;
      const ul = $$(".card h2").find((h) => h.textContent.includes("KPIs & Goals"))?.closest(".card")?.querySelector("ul.list");
      if (!text || !ul) {
        showToast("Enter a goal description.", "error");
        return;
      }
      const li = document.createElement("li");
      li.textContent = `${text}${due ? ` — Due ${due}` : ""} — On Track`;
      ul.appendChild(li);
      $("#goal-text").value = "";
      if ($("#goal-date")) $("#goal-date").value = "";
      if ($("#goal-owner")) $("#goal-owner").value = "";
      showToast("Goal added (demo).", "success");
      // BACKEND_HOOK: POST /performance/goals
    });

    // Review cycle buttons
    const uploadBtn = $$("button").find((b) => b.textContent.includes("Upload Evidence"));
    const submitBtn = $$("button").find((b) => b.textContent.includes("Submit Self-Assessment"));
    const approveBtn = $$("button").find((b) => b.textContent.includes("Approve Review"));
    uploadBtn?.addEventListener("click", () => showToast("Evidence uploaded (demo).", "success")); // BACKEND_HOOK
    submitBtn?.addEventListener("click", () => showToast("Self-assessment submitted (demo).", "success")); // BACKEND_HOOK
    approveBtn?.addEventListener("click", () => showToast("Review approved (demo).", "success")); // BACKEND_HOOK
  }

  // Documents & Messaging
  function wireDocumentsMessagingPage() {
    if (!/Documents & Messaging/i.test(document.title)) return;

    // Upload document
    const uploadForm = $$("form").find((f) => $("label", f)?.textContent?.includes("Choose File"));
    uploadForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      showToast("Document uploaded (demo).", "success");
      // BACKEND_HOOK: POST /documents/upload
    });

    // Library actions
    $$(".table .btn-ghost").forEach((btn) => {
      if (/Preview/i.test(btn.textContent)) {
        btn.addEventListener("click", () => {
          showToast("Previewing document (demo).", "info");
          // BACKEND_HOOK: GET /documents/:id/preview
        });
      } else if (/Download/i.test(btn.textContent)) {
        btn.addEventListener("click", () => {
          showToast("Downloading (demo).", "info");
          // BACKEND_HOOK: GET /documents/:id/download
        });
      }
    });

    // Messaging send
    const msgForm = $(".msg-input");
    const thread = $(".msg-thread");
    msgForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $("#message");
      const text = input?.value?.trim();
      if (!text) {
        showToast("Type a message.", "error");
        return;
      }
      // Append to thread
      const bubble = document.createElement("div");
      bubble.className = "msg-item me";
      bubble.innerHTML = `
        <div class="msg-meta">
          <span class="avatar small">You</span>
          <strong>You</strong>
          <span class="muted small">Just now</span>
        </div>
        <p></p>
      `;
      bubble.querySelector("p").textContent = text;
      thread?.appendChild(bubble);
      thread?.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
      input.value = "";
      showToast("Message sent (demo).", "success");
      // BACKEND_HOOK: POST /messages + WebSocket echo to update other clients
    });
  }

  // Roles & Audit
  function wireRolesAuditPage() {
    if (!/Roles & Audit/i.test(document.title)) return;

    // Roles table action buttons
    $$(".table .btn-ghost").forEach((btn) => {
      if (/Edit/i.test(btn.textContent)) {
        btn.addEventListener("click", () => {
          showToast("Open role editor (demo).", "info");
          // BACKEND_HOOK: Open modal pre-filled; PATCH /roles/:id
        });
      } else if (/Delete/i.test(btn.textContent)) {
        btn.addEventListener("click", () => {
          // BACKEND_HOOK: DELETE /roles/:id
          showToast("Role deleted (demo).", "success");
        });
      } else if (/Remove/i.test(btn.textContent)) {
        btn.addEventListener("click", () => {
          // BACKEND_HOOK: DELETE /roles/users/:id
          showToast("User removed from role (demo).", "success");
        });
      } else if (/Export CSV/i.test(btn.textContent)) {
        btn.addEventListener("click", () => {
          // This matches Audit section export button inside a form
          showToast("Exporting logs CSV (demo).", "info");
          // BACKEND_HOOK: GET /audit/export?format=csv
        });
      }
    });

    // Create role form
    const createRoleForm = $("#role-name")?.closest("form");
    createRoleForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("#role-name")?.value?.trim();
      if (!name) {
        showToast("Role name is required.", "error");
        return;
      }
      showToast(`Role "${name}" created (demo).`, "success");
      // BACKEND_HOOK: POST /roles
    });

    // Assign role form
    const assignForm = $("#user-email")?.closest("form");
    assignForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = $("#user-email")?.value?.trim();
      const role = $("#role-select")?.value;
      if (!email) {
        showToast("User email is required.", "error");
        return;
      }
      showToast(`Assigned "${role}" to ${email} (demo).`, "success");
      // BACKEND_HOOK: POST /roles/assign
    });

    // Audit filter form
    const auditForm = $$("form").find((f) => $("label", f)?.textContent?.includes("Event"));
    auditForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      showToast("Filters applied (demo).", "info");
      // BACKEND_HOOK: GET /audit?event=&from=&to=
    });
  }

  // Common elements
  function wireCommonElements() {
    // Footer year update
    const y = $("#year");
    if (y) {
      try {
        y.textContent = String(new Date().getFullYear());
      } catch {
        y.textContent = "2025";
      }
    }

    // Logout demo: if any button/link text includes "Logout", attach handler
    $$("a, button").forEach((el) => {
      const label = (el.getAttribute("aria-label") || el.textContent || "").trim();
      if (/logout/i.test(label)) {
        el.addEventListener("click", (e) => {
          e.preventDefault();
          SESSION.clear();
          showToast("You have been logged out (demo).", "info");
          setTimeout(() => (window.location.href = "login.html"), 400);
          // BACKEND_HOOK: POST /auth/logout, revoke token
        });
      }
    });

    // Demo: indicate auth in header if needed
    const s = SESSION.get();
    if (s.isAuthenticated) {
      // We could add a "Logout" button dynamically to the primary-nav for demo
      const nav = $(".primary-nav ul");
      if (nav && !$("#emp-logout")) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.id = "emp-logout";
        a.href = "#";
        a.textContent = "Logout";
        a.setAttribute("aria-label", "Logout");
        li.appendChild(a);
        nav.appendChild(li);
        a.addEventListener("click", (e) => {
          e.preventDefault();
          SESSION.clear();
          showToast("You have been logged out (demo).", "info");
          setTimeout(() => (window.location.href = "login.html"), 400);
          // BACKEND_HOOK: POST /auth/logout
        });
      }
    }
  }

  // PUBLIC_INTERFACE
  function initEMPApp() {
    /** Initialize per-page behaviors and global bindings. */
    wireCommonElements();
    wireGlobalFormValidation();
    wireLoginPage();
    wireDashboardPage();
    wireEmployeesPage();
    wireLeaveAttendancePage();
    wirePayrollPerformancePage();
    wireDocumentsMessagingPage();
    wireRolesAuditPage();
  }

  // Initialize on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initEMPApp);
  } else {
    initEMPApp();
  }

  // Expose for debugging
  window.EMP = {
    // PUBLIC_INTERFACE
    init: initEMPApp,
    // PUBLIC_INTERFACE
    showToast,
    // PUBLIC_INTERFACE
    showMFAModal,
  };
})();
