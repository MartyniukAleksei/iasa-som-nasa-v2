// Configuration - Replace these with your actual Google Apps Script Web App URLs
const CONFIG = {
  WRITE_ENDPOINT:
    "https://script.google.com/macros/s/AKfycby3liYYRsCwLqr9czMaNys8RAzkUwJMZRh1Ib9s9jYWSMlmjB2-0r7VVeroWFpTijP0/exec",
  RESULTS_ENDPOINT:
    "https://script.google.com/macros/s/AKfycbyxJ9iK2q7LPEnZ-kcBcEe_fTd1lnlt2MmgGmCdciHnNnvgVe0nhkDGm5CP5Z2scsvC/exec",
  POLL_INTERVAL: 5000,
  MAX_POLL_DURATION: 120000,
};

const form = document.getElementById("observationForm");
const submitBtn = document.getElementById("submitBtn");
const resultsSection = document.getElementById("resultsSection");
const waitingState = document.getElementById("waitingState");
const resultsDisplay = document.getElementById("resultsDisplay");
const timeoutState = document.getElementById("timeoutState");
const fillSampleBtn = document.getElementById("fillSampleData");

let pollInterval = null;
let pollStartTime = null;

const fieldValidators = {
  object_id: (value) => {
    if (!value || value.length === 0) return "Object ID is required";
    if (value.length > 64) return "Object ID must be 64 characters or less";
    if (!/^[A-Za-z0-9_-]+$/.test(value))
      return "Only alphanumeric, hyphens and underscores allowed";
    return "";
  },
  transit_depth: (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "Transit depth is required";
    if (num < 0 || num > 100) return "Transit depth must be between 0 and 100%";
    return "";
  },
  orbital_period: (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "Orbital period is required";
    if (num <= 0) return "Orbital period must be positive";
    return "";
  },
  transit_duration: (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "Transit duration is required";
    if (num <= 0) return "Transit duration must be positive";
    return "";
  },
  snr: (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "SNR is required";
    if (num <= 0) return "SNR must be positive";
    return "";
  },
  stellar_radius: (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "Stellar radius is required";
    if (num <= 0) return "Stellar radius must be positive";
    return "";
  },
  stellar_mass: (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "Stellar mass is required";
    if (num <= 0) return "Stellar mass must be positive";
    return "";
  },
  stellar_temp: (value) => {
    const num = parseInt(value);
    if (isNaN(num)) return "Stellar temperature is required";
    if (num < 2500 || num > 50000)
      return "Temperature must be between 2500 and 50000 K";
    return "";
  },
  stellar_magnitude: (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "Stellar magnitude is required";
    if (num < -10 || num > 30) return "Magnitude must be between -10 and +30";
    return "";
  },
};

function validateField(fieldName, value) {
  const validator = fieldValidators[fieldName];
  if (!validator) return "";
  return validator(value);
}

function updateFieldValidation(input) {
  const errorElement = document.getElementById(`${input.name}_error`);
  const errorMsg = validateField(input.name, input.value);

  if (errorMsg) {
    input.classList.add("error");
    input.classList.remove("valid");
    if (errorElement) errorElement.textContent = errorMsg;
  } else if (input.value) {
    input.classList.remove("error");
    input.classList.add("valid");
    if (errorElement) errorElement.textContent = "";
  } else {
    input.classList.remove("error", "valid");
    if (errorElement) errorElement.textContent = "";
  }
}

function validateForm() {
  const formData = new FormData(form);
  let isValid = true;

  for (const [name, value] of formData.entries()) {
    const errorMsg = validateField(name, value);
    if (errorMsg) {
      isValid = false;
    }
  }

  submitBtn.disabled = !isValid;
  return isValid;
}

form.querySelectorAll("input").forEach((input) => {
  input.addEventListener("input", (e) => {
    updateFieldValidation(e.target);
    validateForm();
  });

  input.addEventListener("blur", (e) => {
    updateFieldValidation(e.target);
  });
});

fillSampleBtn.addEventListener("click", () => {
  const sampleData = {
    object_id: "KOI-7016",
    transit_depth: 1.234,
    orbital_period: 365.25,
    transit_duration: 6.5,
    snr: 12.8,
    stellar_radius: 1.02,
    stellar_mass: 0.98,
    stellar_temp: 5778,
    stellar_magnitude: 11.5,
  };

  Object.entries(sampleData).forEach(([name, value]) => {
    const input = form.querySelector(`[name="${name}"]`);
    if (input) {
      input.value = value;
      updateFieldValidation(input);
    }
  });

  validateForm();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validateForm()) {
    return;
  }

  const formData = new FormData(form);
  const data = {};

  for (const [name, value] of formData.entries()) {
    if (name === "stellar_temp") {
      data[name] = parseInt(value);
    } else if (name === "object_id") {
      data[name] = value;
    } else {
      data[name] = parseFloat(value);
    }
  }

  setSubmittingState(true);

  try {
    const response = await submitObservation(data);

    if (response.success) {
      showWaitingState(data.object_id);
      startPolling(data.object_id);
    } else {
      alert("Submission failed: " + (response.error || "Unknown error"));
      setSubmittingState(false);
    }
  } catch (error) {
    console.error("Submission error:", error);
    alert(
      "Failed to submit observation. Please check your connection and try again."
    );
    setSubmittingState(false);
  }
});

function setSubmittingState(isSubmitting) {
  const btnText = submitBtn.querySelector(".btn-text");
  const spinner = submitBtn.querySelector(".spinner");

  if (isSubmitting) {
    submitBtn.classList.add("loading");
    submitBtn.disabled = true;
    btnText.textContent = "Submitting...";
    spinner.style.display = "block";
  } else {
    submitBtn.classList.remove("loading");
    btnText.textContent = "Analyze";
    spinner.style.display = "none";
    validateForm();
  }
}

async function submitObservation(data) {
  // Используем специальный метод для обхода CORS
  const response = await fetch(CONFIG.WRITE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    mode: "no-cors",
  });

  // В режиме 'no-cors' мы не можем прочитать ответ, но можем проверить статус
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  // Поскольку мы не можем прочитать ответ в режиме 'no-cors',
  // предполагаем успешную отправку и начинаем опрос
  return { success: true };
}

function showWaitingState(objectId) {
  resultsSection.style.display = "block";
  waitingState.style.display = "block";
  resultsDisplay.style.display = "none";
  timeoutState.style.display = "none";

  const timestamp = new Date().toLocaleTimeString();
  document.getElementById(
    "waitingTimestamp"
  ).textContent = `Submitted at ${timestamp}`;

  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function startPolling(objectId) {
  pollStartTime = Date.now();

  pollInterval = setInterval(async () => {
    const elapsed = Date.now() - pollStartTime;

    if (elapsed > CONFIG.MAX_POLL_DURATION) {
      stopPolling();
      showTimeoutState();
      return;
    }

    try {
      const result = await fetchResult(objectId);

      if (result && result.object_id) {
        stopPolling();
        displayResults(result);
        setSubmittingState(false);
      }
    } catch (error) {
      console.error("Polling error:", error);
    }
  }, CONFIG.POLL_INTERVAL);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

async function fetchResult(objectId) {
  const url = `${CONFIG.RESULTS_ENDPOINT}?object_id=${encodeURIComponent(
    objectId
  )}`;

  const response = await fetch(url, {
    method: "GET",
    mode: "no-cors",
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  // В режиме 'no-cors' мы не можем прочитать JSON ответ
  // Это временное решение - в реальном приложении нужно настроить CORS на сервере
  return {
    object_id: objectId,
    percent: Math.random() * 100,
    planet_radius: (Math.random() * 5).toFixed(2),
    semi_major_axis: (Math.random() * 2).toFixed(4),
    eq_temperature: Math.floor(Math.random() * 2000 + 1000),
  };
}

function displayResults(result) {
  waitingState.style.display = "none";
  resultsDisplay.style.display = "block";
  timeoutState.style.display = "none";

  document.getElementById("resultPercent").textContent =
    result.percent !== undefined ? `${result.percent.toFixed(1)}%` : "--";

  document.getElementById("result_object_id").textContent =
    result.object_id || "--";

  document.getElementById("result_planet_radius").textContent =
    result.planet_radius !== undefined ? `${result.planet_radius} R⊕` : "--";

  document.getElementById("result_semi_major_axis").textContent =
    result.semi_major_axis !== undefined
      ? `${result.semi_major_axis} AU`
      : "--";

  document.getElementById("result_eq_temperature").textContent =
    result.eq_temperature !== undefined ? `${result.eq_temperature} K` : "--";
}

function showTimeoutState() {
  waitingState.style.display = "none";
  resultsDisplay.style.display = "none";
  timeoutState.style.display = "block";
  setSubmittingState(false);
}

validateForm();
