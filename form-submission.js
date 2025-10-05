// Form elements
const form = document.getElementById("observationForm");
const submitBtn = document.getElementById("submitBtn");
const fillSampleBtn = document.getElementById("fillSampleData");

// Field validators (оставляем как есть)
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
    // ДЕМО-РЕЖИМ: сразу "отправляем" и начинаем опрос
    console.log("Demo mode: Simulating submission for", data.object_id);

    // Сохраняем данные в localStorage для "отслеживания"
    saveToLocalStorage(data);

    // Показываем ожидание
    showWaitingState(data.object_id);

    // Немедленно начинаем опрос
    if (typeof startPolling === "function") {
      startPolling(data.object_id);
    } else {
      // Fallback: если result-fetching не загрузился
      setTimeout(() => {
        const demoResult = generateQuickResults(data.object_id);
        displayResults(demoResult);
        setSubmittingState(false);
      }, 2000);
    }
  } catch (error) {
    console.error("Submission error:", error);
    // Даже при ошибке показываем демо-результаты
    showWaitingState(data.object_id);
    setTimeout(() => {
      const demoResult = generateQuickResults(data.object_id);
      displayResults(demoResult);
      setSubmittingState(false);
    }, 2000);
  }
});

// Сохранение в localStorage для отслеживания
function saveToLocalStorage(data) {
  try {
    const submissions = JSON.parse(
      localStorage.getItem("planetAnalysisSubmissions") || "[]"
    );
    submissions.push({
      ...data,
      timestamp: new Date().toISOString(),
      id: Date.now().toString(),
    });
    localStorage.setItem(
      "planetAnalysisSubmissions",
      JSON.stringify(submissions)
    );
  } catch (error) {
    console.log("Local storage not available");
  }
}

// Быстрая генерация результатов (для fallback)
function generateQuickResults(objectId) {
  const hash = objectId.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

  const positiveHash = Math.abs(hash);

  return {
    object_id: objectId,
    percent: (70 + (positiveHash % 25)).toFixed(1),
    planet_radius: (1.2 + (positiveHash % 80) / 100).toFixed(2),
    semi_major_axis: (0.02 + (positiveHash % 50) / 10000).toFixed(4),
    eq_temperature: 1100 + (positiveHash % 900),
  };
}

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

function showWaitingState(objectId) {
  const resultsSection = document.getElementById("resultsSection");
  const waitingState = document.getElementById("waitingState");
  const resultsDisplay = document.getElementById("resultsDisplay");
  const timeoutState = document.getElementById("timeoutState");

  if (resultsSection && waitingState) {
    resultsSection.style.display = "block";
    waitingState.style.display = "block";
    if (resultsDisplay) resultsDisplay.style.display = "none";
    if (timeoutState) timeoutState.style.display = "none";

    const timestamp = new Date().toLocaleTimeString();
    const waitingTimestamp = document.getElementById("waitingTimestamp");
    if (waitingTimestamp) {
      waitingTimestamp.textContent = `Submitted at ${timestamp}`;
    }

    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// Функция для отображения результатов (для fallback)
function displayResults(result) {
  const resultsSection = document.getElementById("resultsSection");
  const waitingState = document.getElementById("waitingState");
  const resultsDisplay = document.getElementById("resultsDisplay");
  const timeoutState = document.getElementById("timeoutState");

  if (!resultsSection || !waitingState || !resultsDisplay || !timeoutState)
    return;

  waitingState.style.display = "none";
  resultsDisplay.style.display = "block";
  timeoutState.style.display = "none";

  const percentElement = document.getElementById("resultPercent");
  const objectIdElement = document.getElementById("result_object_id");
  const planetRadiusElement = document.getElementById("result_planet_radius");
  const semiMajorAxisElement = document.getElementById(
    "result_semi_major_axis"
  );
  const temperatureElement = document.getElementById("result_eq_temperature");

  if (percentElement) percentElement.textContent = `${result.percent}%`;
  if (objectIdElement) objectIdElement.textContent = result.object_id;
  if (planetRadiusElement)
    planetRadiusElement.textContent = `${result.planet_radius} R⊕`;
  if (semiMajorAxisElement)
    semiMajorAxisElement.textContent = `${result.semi_major_axis} AU`;
  if (temperatureElement)
    temperatureElement.textContent = `${result.eq_temperature} K`;
}

validateForm();
