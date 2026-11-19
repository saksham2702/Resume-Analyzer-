"use strict";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setFieldError(form, fieldId, message) {
  const field = form.querySelector(`#${fieldId}`);
  const error = form.querySelector(`#${fieldId}-error`);

  if (!field || !error) {
    return;
  }

  field.setAttribute("aria-invalid", message ? "true" : "false");
  error.textContent = message;
}

function validateEmail(value) {
  if (!value.trim()) {
    return "Enter your email address.";
  }

  if (!emailPattern.test(value.trim())) {
    return "Enter a valid email address.";
  }

  return "";
}

function getPasswordStrength(value) {
  if (!value) {
    return { level: 0, label: "Not entered" };
  }

  const checks = [
    value.length >= 8,
    value.length >= 12,
    /[a-z]/.test(value) && /[A-Z]/.test(value),
    /\d/.test(value),
    /[^a-zA-Z0-9]/.test(value)
  ];
  const score = checks.filter(Boolean).length;

  if (score <= 2) {
    return { level: 1, label: "Weak" };
  }
  if (score === 3) {
    return { level: 2, label: "Fair" };
  }
  if (score === 4) {
    return { level: 3, label: "Good" };
  }

  return { level: 4, label: "Strong" };
}

function updatePasswordStrength(form) {
  const password = form.querySelector("#register-password");
  const meter = form.querySelector("[data-strength-meter]");
  const message = form.querySelector("[data-password-strength]");

  if (!password || !meter || !message) {
    return;
  }

  const strength = getPasswordStrength(password.value);
  meter.dataset.level = String(strength.level);
  meter.setAttribute("role", "progressbar");
  meter.setAttribute("aria-label", "Password strength");
  meter.setAttribute("aria-valuemin", "0");
  meter.setAttribute("aria-valuemax", "4");
  meter.setAttribute("aria-valuenow", String(strength.level));
  meter.setAttribute("aria-valuetext", `Password strength: ${strength.label}`);
  message.textContent = `Password strength: ${strength.label}`;
}

function validateLogin(form) {
  const email = form.querySelector("#login-email");
  const password = form.querySelector("#login-password");
  const emailError = validateEmail(email.value);
  const passwordError = password.value.trim() ? "" : "Enter your password.";

  setFieldError(form, "login-email", emailError);
  setFieldError(form, "login-password", passwordError);

  return !emailError && !passwordError;
}

function validateRegistration(form) {
  const name = form.querySelector("#register-name");
  const email = form.querySelector("#register-email");
  const password = form.querySelector("#register-password");
  const confirmPassword = form.querySelector("#register-confirm-password");
  const terms = form.querySelector("#terms");

  const nameError = name.value.trim() ? "" : "Enter your full name.";
  const emailError = validateEmail(email.value);
  let passwordError = "";
  let confirmError = "";

  if (!password.value) {
    passwordError = "Enter a password.";
  } else if (password.value.length < 8) {
    passwordError = "Use at least 8 characters.";
  }

  if (!confirmPassword.value) {
    confirmError = "Confirm your password.";
  } else if (password.value !== confirmPassword.value) {
    confirmError = "Passwords do not match.";
  }

  setFieldError(form, "register-name", nameError);
  setFieldError(form, "register-email", emailError);
  setFieldError(form, "register-password", passwordError);
  setFieldError(form, "register-confirm-password", confirmError);

  const termsError = terms.checked ? "" : "Please agree to the Terms and Conditions.";
  const termsErrorElement = form.querySelector("#terms-error");
  terms.setAttribute("aria-invalid", termsError ? "true" : "false");
  termsErrorElement.textContent = termsError;

  return !nameError && !emailError && !passwordError && !confirmError && !termsError;
}

try {
  if (window.CareerFitDemoSession.get()) {
    window.location.replace("dashboard.html");
  }
} catch (error) {
  if (!window.CareerFitDemoSession.isStorageError(error)) {
    throw error;
  }

  document.querySelector("[data-form-status]").textContent =
    "Browser storage is unavailable, so the demo session cannot be checked.";
}

document.querySelectorAll(".auth-form").forEach((form) => {
  const formType = form.dataset.authForm;
  const status = form.querySelector("[data-form-status]");

  form.querySelectorAll(".password-toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const input = form.querySelector(`#${toggle.getAttribute("aria-controls")}`);
      const showPassword = input.type === "password";
      input.type = showPassword ? "text" : "password";
      toggle.textContent = showPassword ? "Hide" : "Show";
      toggle.setAttribute("aria-pressed", String(showPassword));
    });
  });

  if (formType === "register") {
    const password = form.querySelector("#register-password");
    password.addEventListener("input", () => updatePasswordStrength(form));
    updatePasswordStrength(form);
  }

  form.addEventListener("input", () => {
    status.textContent = "";
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    status.textContent = "";

    const valid = formType === "login"
      ? validateLogin(form)
      : validateRegistration(form);

    if (valid) {
      try {
        const remember = formType === "register"
          || form.querySelector("#remember-me").checked;
        window.CareerFitDemoSession.start({ remember });
        window.location.assign("dashboard.html");
      } catch (error) {
        if (!window.CareerFitDemoSession.isStorageError(error)) {
          throw error;
        }

        status.textContent = "Browser storage is unavailable, so a demo session could not be started.";
      }
    }
  });
});

document.querySelectorAll(".forgot-link").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const status = link.closest(".auth-card").querySelector("[data-form-status]");
    status.textContent = "Password recovery is not available yet.";
  });
});
