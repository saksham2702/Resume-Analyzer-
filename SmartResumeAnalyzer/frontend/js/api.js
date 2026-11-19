"use strict";

window.CareerFitApi = {
  async request(path, options) {
    const baseUrl = window.CAREERFIT_API_BASE_URL;
    if (!baseUrl) {
      throw new Error("CareerFit API URL has not been configured.");
    }

    const url = new URL(path.replace(/^\/+/, ""), `${baseUrl.replace(/\/+$/, "")}/`);
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options && options.headers)
      }
    });

    if (!response.ok) {
      throw new Error(`CareerFit API request failed with status ${response.status}.`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }
};
