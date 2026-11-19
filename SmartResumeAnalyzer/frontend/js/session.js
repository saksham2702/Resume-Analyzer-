"use strict";

(function () {
  const sessionKey = "careerFitDemoSession";
  const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;

  function isStorageError(error) {
    return typeof DOMException !== "undefined"
      && error instanceof DOMException
      && (error.name === "SecurityError" || error.name === "QuotaExceededError");
  }

  function readSession(storage) {
    const storedValue = storage.getItem(sessionKey);
    if (!storedValue) {
      return null;
    }

    let session;
    try {
      session = JSON.parse(storedValue);
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        throw error;
      }
      storage.removeItem(sessionKey);
      return null;
    }

    if (!session || session.mode !== "demo" || !Number.isFinite(session.expiresAt)) {
      storage.removeItem(sessionKey);
      return null;
    }

    if (Date.now() >= session.expiresAt) {
      storage.removeItem(sessionKey);
      return null;
    }

    return session;
  }

  window.CareerFitDemoSession = {
    isStorageError,
    start(options) {
      const remember = options ? options.remember : true;
      const storage = remember ? localStorage : sessionStorage;
      const session = {
        mode: "demo",
        expiresAt: Date.now() + sessionDurationMs
      };

      localStorage.removeItem(sessionKey);
      sessionStorage.removeItem(sessionKey);
      storage.setItem(sessionKey, JSON.stringify(session));
    },
    get() {
      return readSession(sessionStorage) || readSession(localStorage);
    },
    clear() {
      localStorage.removeItem(sessionKey);
      sessionStorage.removeItem(sessionKey);
    }
  };
})();
