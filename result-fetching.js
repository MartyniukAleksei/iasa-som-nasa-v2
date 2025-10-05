// Results elements
const resultsSection = document.getElementById("resultsSection");
const waitingState = document.getElementById("waitingState");
const resultsDisplay = document.getElementById("resultsDisplay");
const timeoutState = document.getElementById("timeoutState");

// Основная функция опроса
function startPolling(objectId) {
  console.log(`🚀 Starting analysis for: ${objectId}`);
  pollStartTime = Date.now();
  let attemptCount = 0;

  pollInterval = setInterval(async () => {
    const elapsed = Date.now() - pollStartTime;
    attemptCount++;

    if (elapsed > CONFIG.MAX_POLL_DURATION) {
      console.log(`⏰ Timeout for: ${objectId}`);
      stopPolling();
      showTimeoutState();
      return;
    }

    try {
      console.log(`🔍 Analysis attempt ${attemptCount} for: ${objectId}`);

      // Всегда используем демо-результаты
      const result = generateRealisticResults(objectId, attemptCount);

      if (result && result.object_id) {
        console.log("✅ Analysis complete!", result);
        stopPolling();
        displayResults(result);
        if (typeof setSubmittingState === "function") {
          setSubmittingState(false);
        }
      }
    } catch (error) {
      console.error(`❌ Analysis error:`, error);
    }
  }, CONFIG.POLL_INTERVAL);
}

// Реалистичная генерация результатов
function generateRealisticResults(objectId, attemptCount) {
  const hash = objectId.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

  const positiveHash = Math.abs(hash);
  const progress = Math.min(attemptCount / 4, 1); // Прогресс за 4 попытки

  // Эмуляция "анализа" - результаты улучшаются со временем
  const analysisStages = [
    { percent: 60, radius: 1.8, axis: 0.025, temp: 1300 }, // Быстрый анализ
    { percent: 75, radius: 1.5, axis: 0.02, temp: 1200 }, // Уточнение
    { percent: 85, radius: 1.3, axis: 0.018, temp: 1150 }, // Глубокий анализ
    { percent: 92, radius: 1.2, axis: 0.015, temp: 1100 }, // Финальные результаты
  ];

  const stageIndex = Math.min(Math.floor(attemptCount - 1), 3);
  const stage = analysisStages[stageIndex];

  // Добавляем небольшую случайность для реалистичности
  const randomVariation = ((positiveHash % 20) - 10) / 100; // ±10%

  return {
    object_id: objectId,
    percent: (stage.percent + (positiveHash % 10) - 5).toFixed(1), // ±5%
    planet_radius: (stage.radius + ((positiveHash % 30) - 15) / 100).toFixed(2), // ±0.15
    semi_major_axis: (stage.axis + ((positiveHash % 10) - 5) / 1000).toFixed(4), // ±0.005
    eq_temperature: stage.temp + ((positiveHash % 200) - 100), // ±100K
  };
}

// Вспомогательные функции
function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

function displayResults(result) {
  if (!resultsSection || !waitingState || !resultsDisplay || !timeoutState) {
    console.error("Results elements not found");
    return;
  }

  waitingState.style.display = "none";
  resultsDisplay.style.display = "block";
  timeoutState.style.display = "none";

  updateElement(
    "resultPercent",
    result.percent !== undefined ? `${result.percent}%` : "--"
  );
  updateElement("result_object_id", result.object_id || "--");
  updateElement(
    "result_planet_radius",
    result.planet_radius !== undefined ? `${result.planet_radius} R⊕` : "--"
  );
  updateElement(
    "result_semi_major_axis",
    result.semi_major_axis !== undefined ? `${result.semi_major_axis} AU` : "--"
  );
  updateElement(
    "result_eq_temperature",
    result.eq_temperature !== undefined ? `${result.eq_temperature} K` : "--"
  );

  console.log("📊 Results displayed successfully");
}

function updateElement(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = value;
  }
}

function showTimeoutState() {
  if (!waitingState || !resultsDisplay || !timeoutState) {
    console.error("Timeout state elements not found");
    return;
  }

  waitingState.style.display = "none";
  resultsDisplay.style.display = "none";
  timeoutState.style.display = "block";

  console.log("⏰ Timeout state shown");

  if (typeof setSubmittingState === "function") {
    setSubmittingState(false);
  }
}

// Инициализация
document.addEventListener("DOMContentLoaded", function () {
  console.log("🎯 Planet Analysis System Ready");
  console.log("💡 Demo Mode: All data is simulated");
});
