"use strict";

window.CareerFitApi = {
  async request(path, options) {
    const baseUrl = window.CAREERFIT_API_BASE_URL ||
      (window.location.protocol === "http:" || window.location.protocol === "https:"
        ? window.location.origin
        : "http://127.0.0.1:8080");

    const url = new URL(path.replace(/^\/+/, ""), `${baseUrl.replace(/\/+$/, "")}/`);
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options && options.headers)
      }
    });

    if (!response.ok) {
      let message = `CareerFit API request failed with status ${response.status}.`;
      try {
        const errorResponse = await response.json();
        if (errorResponse && typeof errorResponse.error === "string" && errorResponse.error.trim()) {
          message = errorResponse.error;
        }
      } catch (error) {
        if (!(error instanceof SyntaxError)) {
          throw error;
        }
      }
      throw new Error(message);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }
};
