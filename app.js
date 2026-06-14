const STORAGE_KEY = 'cute-weight-waist-records';
const dateInput = document.getElementById('dateInput');
const weightInput = document.getElementById('weightInput');
const waistInput = document.getElementById('waistInput');
const noteInput = document.getElementById('noteInput');
const recordForm = document.getElementById('recordForm');
const formError = document.getElementById('formError');
const recordList = document.getElementById('recordList');
const avgWeight7 = document.getElementById('avgWeight7');
const avgWeight14 = document.getElementById('avgWeight14');
const avgWaist7 = document.getElementById('avgWaist7');
const avgWaist14 = document.getElementById('avgWaist14');
const dynamicTrend = document.getElementById('dynamicTrend');
const weeklyFocus = document.getElementById('weeklyFocus');
const cancelEditButton = document.getElementById('cancelEditButton');
const toast = document.getElementById('toast');
const chartCanvas = document.getElementById('trendChart');
const saveButton = document.querySelector('.button-primary');
const exportCsvButton = document.getElementById('exportCsvButton');
const importCsvButton = document.getElementById('importCsvButton');
const importCsvInput = document.getElementById('importCsvInput');
const confirmModal = document.getElementById('confirmModal');
const modalPrevious = document.getElementById('modalPrevious');
const modalCurrent = document.getElementById('modalCurrent');
const confirmSaveButton = document.getElementById('confirmSaveButton');
const cancelSaveButton = document.getElementById('cancelSaveButton');
let records = [];
let editingId = null;
let trendChart = null;
let pendingOutlier = null;
let lastTrendMessage = '';

function getTodayDate() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

function loadRecords() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      records = JSON.parse(raw).map(item => ({
        ...item,
        date: item.date,
        isOutlier: item.isOutlier === true,
      }));
    } catch (error) {
      records = [];
    }
  }
  records.sort((a, b) => b.date.localeCompare(a.date));
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function getActiveRecords() {
  return records.filter(item => !item.isOutlier);
}

function getRangeRecords(days, includeOutliers = false) {
  const source = includeOutliers ? records : getActiveRecords();
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (days - 1));
  return source.filter(item => {
    const itemDate = new Date(item.date + 'T00:00:00');
    return itemDate >= startDate && itemDate <= today;
  });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible', 'pulse');
  window.setTimeout(() => toast.classList.remove('pulse'), 500);
  window.setTimeout(() => toast.classList.remove('visible'), 2500);
}

function animateSaveButton() {
  if (!saveButton) return;
  saveButton.classList.add('saving');
  window.setTimeout(() => saveButton.classList.remove('saving'), 400);
}

function showFormError(message, invalidFields = []) {
  if (!formError) return;
  formError.textContent = message;
  formError.classList.remove('hidden');
  [dateInput, weightInput, waistInput].forEach(input => {
    input.classList.toggle('input-error', invalidFields.includes(input));
  });
}

function clearFormError() {
  if (!formError) return;
  formError.textContent = '';
  formError.classList.add('hidden');
  [dateInput, weightInput, waistInput].forEach(input => {
    input.classList.remove('input-error');
  });
}

function resetForm() {
  editingId = null;
  recordForm.reset();
  dateInput.value = getTodayDate();
  cancelEditButton.classList.add('hidden');
  clearFormError();
}

function formatLocaleDate(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  const [year, month, day] = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')];
  return `${year}/${month}/${day}`;
}

function calculateAverage(entries) {
  if (!entries.length) return null;
  const total = entries.reduce((sum, item) => sum + (typeof item === 'number' ? item : item.value), 0);
  return total / entries.length;
}

function getPreviousRecord(currentDate) {
  const activeRecords = [...records]
    .filter(record => record.date < currentDate)
    .sort((a, b) => b.date.localeCompare(a.date));
  return activeRecords[0] || null;
}

function normalizeDateValue(value) {
  const normalized = String(value).trim().replace(/\//g, '-');
  const parts = normalized.split('-').map(part => part.trim());
  if (parts.length === 3) {
    const year = parts[0].padStart(4, '0');
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return null;
}

function validateRecord(weight, waist) {
  if (weight < 20 || weight > 300 || waist < 30 || waist > 250) {
    showToast('請確認數值是否輸入正確');
    return false;
  }
  return true;
}

function updateStats() {
  const weight7 = getRangeRecords(7).map(item => item.weight);
  const weight14 = getRangeRecords(14).map(item => item.weight);
  const waist7 = getRangeRecords(7).map(item => item.waist);
  const waist14 = getRangeRecords(14).map(item => item.waist);

  const avg7w = calculateAverage(weight7);
  const avg14w = calculateAverage(weight14);
  const avg7c = calculateAverage(waist7);
  const avg14c = calculateAverage(waist14);

  avgWeight7.textContent = avg7w ? `${avg7w.toFixed(1)} 公斤` : '尚無足夠資料';
  avgWeight14.textContent = avg14w ? `${avg14w.toFixed(1)} 公斤` : '尚無足夠資料';
  avgWaist7.textContent = avg7c ? `${avg7c.toFixed(1)} 公分` : '尚無足夠資料';
  avgWaist14.textContent = avg14c ? `${avg14c.toFixed(1)} 公分` : '尚無足夠資料';
  if (dynamicTrend) {
    dynamicTrend.textContent = buildTrendMessage();
  }
  // if (weeklyFocus) {
//   weeklyFocus.textContent = buildWeeklyFocus();
// }
}

function buildTrendMessage() {
  const weight7 = getRangeRecords(7).map(item => item.weight);
  const weight14 = getRangeRecords(14).map(item => item.weight);
  const waist7 = getRangeRecords(7).map(item => item.waist);
  const waist14 = getRangeRecords(14).map(item => item.waist);

  if (waist14.length < 2 || weight14.length < 2) {
    return '請新增更多紀錄，系統會自動顯示平均趨勢。';
  }
function buildWeeklyFocus() {
  return '腰圍變化與體重變化都值得溫柔注意，系統會優先分析腰圍趨勢。';
}

  const avgWeight7 = calculateAverage(weight7);
  const avgWeight14 = calculateAverage(weight14);
  const avgWaist7 = calculateAverage(waist7);
  const avgWaist14 = calculateAverage(waist14);
  const waistDiff = avgWaist7 - avgWaist14;
  const weightDiff = avgWeight7 - avgWeight14;

  const trendType = waistDiff < -0.15 || weightDiff < -0.15 ? '改善中' : Math.abs(waistDiff) < 0.15 && Math.abs(weightDiff) < 0.15 ? '持平' : '需要留意';
  const quotes = [
    '🌷 最近的平均值正在慢慢下降，請繼續溫柔觀察。',
    '☁️ 身體正在適應新的生活節奏，請維持輕鬆的步調。',
    '📌 最近的平均值呈現上升趨勢，可以回顧近期飲食、活動量與睡眠狀況。',
    '💕 變化細微也很重要，週期內的柔性觀察最有幫助。',
    '✨ 只要持續記錄，就能把心情與身體一起照顧好。',
  ];
  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  if (trendType === '改善中') {
    return `趨勢：改善中\n${quote}`;
  }
  if (trendType === '持平') {
    return `趨勢：持平\n${quote}`;
  }
  return `趨勢：需要留意\n${quote}`;
}

function renderChart() {
  // 取得非異常紀錄，並篩選最近 14 日
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 13); // 含今天共 14 日
  const activeRecords = getActiveRecords().filter(item => {
    const itemDate = new Date(item.date + 'T00:00:00');
    return itemDate >= startDate && itemDate <= today;
  });

  // 依日期升冪排序（最舊 -> 最新）供圖表使用
  const sorted = [...activeRecords].sort((a, b) => a.date.localeCompare(b.date));

  const labels = sorted.map(item => formatLocaleDate(item.date));
  const weightData = sorted.map(item => Number(item.weight));
  const waistData = sorted.map(item => Number(item.waist));

  const chartData = {
    labels,
    datasets: [
      {
        label: '體重（公斤）',
        data: weightData,
        borderColor: '#ff8fb4',
        backgroundColor: 'rgba(255, 143, 180, 0.22)',
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: '#ff8fb4',
        yAxisID: 'y',
      },
      {
        label: '腰圍（公分）',
        data: waistData,
        borderColor: '#9f88ff',
        backgroundColor: 'rgba(159, 136, 255, 0.16)',
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: '#9f88ff',
        yAxisID: 'y1',
      },
    ],
  };
  
  if (!activeRecords.length) {
    if (trendChart) {
      trendChart.destroy();
      trendChart = null;
    }
    return;
  }

  const config = {
    type: 'line',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', axis: 'x', intersect: false },
      scales: {
        x: { grid: { color: 'rgba(156, 132, 123, 0.12)' } },
        y: {
          type: 'linear',
          position: 'left',
          grid: { color: 'rgba(156, 132, 123, 0.12)' },
          ticks: { color: '#5c4e4a' },
        },
        y1: {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: '#7f6f85' },
        },
      },
      plugins: {
        legend: { labels: { color: '#5c4e4a' } },
        tooltip: {
          backgroundColor: '#fff',
          titleColor: '#3c3a44',
          bodyColor: '#4e403c',
          borderColor: '#e8d7d2',
          borderWidth: 1,
          callbacks: {
            label(context) {
              const value = context.parsed.y;
              const unit = context.dataset.label.includes('體重') ? '公斤' : '公分';
              return `${context.dataset.label}: ${value !== null ? value.toFixed(1) : '-'} ${unit}`;
            },
          },
        },
      },
    },
  };

  if (trendChart) {
    trendChart.data = chartData;
    trendChart.update();
  } else {
    trendChart = new Chart(chartCanvas, config);
  }
}

function renderRecords() {
  recordList.innerHTML = '';
  if (!records.length) {
    recordList.innerHTML = '<p class="empty-note">目前尚無紀錄，請新增第一筆資料。</p>';
    return;
  }

  records.forEach(item => {
    const card = document.createElement('article');
    card.className = 'record-item';
    card.innerHTML = `
      <div class="record-top">
        <div>
          <div class="record-date">${formatLocaleDate(item.date)}${item.isOutlier ? ' • 異常紀錄' : ''}</div>
          <div class="record-meta">體重 ${item.weight.toFixed(1)} 公斤 · 腰圍 ${item.waist.toFixed(1)} 公分</div>
        </div>
        <div class="record-actions">
          <button class="action-button edit" data-id="${item.id}">修改</button>
          <button class="action-button delete" data-id="${item.id}">刪除</button>
        </div>
      </div>
      ${item.note ? `<p class="record-note">${item.note}</p>` : ''}
    `;

    recordList.appendChild(card);
  });

  recordList.querySelectorAll('.action-button.edit').forEach(button => {
    button.addEventListener('click', () => startEdit(button.dataset.id));
  });

  recordList.querySelectorAll('.action-button.delete').forEach(button => {
    button.addEventListener('click', () => deleteRecord(button.dataset.id));
  });
}

function startEdit(id) {
  const item = records.find(record => record.id === id);
  if (!item) return;
  editingId = id;
  dateInput.value = item.date;
  weightInput.value = item.weight;
  waistInput.value = item.waist;
  noteInput.value = item.note || '';
  cancelEditButton.classList.remove('hidden');
  showToast('已載入紀錄，可進行修改或取消。');
}

function deleteRecord(id) {
  records = records.filter(record => record.id !== id);
  saveRecords();
  renderRecords();
  updateStats();
  renderChart();
  showToast('紀錄已刪除。');
}

function openConfirmModal(prev, current) {
  if (!confirmModal) return;
  modalPrevious.innerHTML = `體重 ${prev.weight.toFixed(1)} 公斤<br>腰圍 ${prev.waist.toFixed(1)} 公分`;
  modalCurrent.innerHTML = `體重 ${current.weight.toFixed(1)} 公斤<br>腰圍 ${current.waist.toFixed(1)} 公分`;
  confirmModal.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function closeConfirmModal() {
  if (!confirmModal) return;
  confirmModal.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

function commitRecord(date, weight, waist, note, isOutlier = false) {
  if (editingId) {
    records = records.map(record => record.id === editingId ? { ...record, date, weight, waist, note, isOutlier: isOutlier || !!record.isOutlier } : record);
    showToast('紀錄已更新。');
  } else {
    records.push({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, date, weight, waist, note, isOutlier: !!isOutlier });
    showToast('已儲存紀錄。');
  }
  records.sort((a, b) => b.date.localeCompare(a.date));
  saveRecords();
  resetForm();
  renderRecords();
  updateStats();
  renderChart();
  animateSaveButton();
}

function generateCsvContent() {
  const header = ['日期', '體重（公斤）', '腰圍（公分）', '備註'];
  const rows = records.map(record => {
    const safeNote = record.note ? record.note.replace(/"/g, '""') : '';
    return [formatLocaleDate(record.date), record.weight.toFixed(1), record.waist.toFixed(1), `"${safeNote}"`].join(',');
  });
  return [header.join(','), ...rows].join('\r\n');
}

function exportCsv() {
  if (!records.length) {
    showToast('目前無紀錄可匯出。');
    return;
  }
  const csvContent = generateCsvContent();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = '身體觀察日記.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('已匯出 CSV。');
}

function parseCsvText(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(item => item.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line => {
    const values = line.match(/(?:"([^"]*(?:""[^"]*)*)"|([^,]+))/g) || [];
    return values.map(value => value.replace(/^"|"$/g, '').replace(/""/g, ''));
  });
  return rows.map(values => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ? values[index].trim() : '';
    });
    return record;
  });
}

function importCsv() {
  importCsvInput.click();
}

function extractBoolean(value) {
  return String(value).trim().toLowerCase() === 'true';
}

function handleImportCsv(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const text = reader.result;
    const rows = parseCsvText(text);
    let imported = 0;
    rows.forEach(row => {
      const date = normalizeDateValue(row['日期'] || row['date'] || row['Date'] || '');
      const weight = parseFloat(row['體重（公斤）'] || row['體重'] || row['weight'] || '');
      const waist = parseFloat(row['腰圍（公分）'] || row['腰圍'] || row['waist'] || '');
      const note = row['備註'] || row['note'] || '';
      if (!date || Number.isNaN(weight) || Number.isNaN(waist)) return;
      const existingIndex = records.findIndex(item => item.date === date);
      const record = { id: existingIndex >= 0 ? records[existingIndex].id : `${Date.now()}-${Math.random().toString(16).slice(2)}`, date, weight, waist, note };
      if (existingIndex >= 0) {
        records[existingIndex] = record;
      } else {
        records.push(record);
      }
      imported += 1;
    });
    if (imported) {
      records.sort((a, b) => b.date.localeCompare(a.date));
      saveRecords();
      renderRecords();
      updateStats();
      renderChart();
      showToast(`已匯入 ${imported} 筆資料。`);
    } else {
      showToast('未找到可匯入的 CSV 資料。');
    }
    importCsvInput.value = '';
  };
  reader.readAsText(file, 'utf-8');
}

function handleSubmit(event) {
  event.preventDefault();
  const date = dateInput.value;
  const weight = Number(weightInput.value);
  const waist = Number(waistInput.value);
  const note = noteInput.value.trim();

  // 基本欄位檢查（存在且為數字）
  clearFormError();
  clearFormError();
  const invalidFields = [];
  if (!date) invalidFields.push(dateInput);
  if (Number.isNaN(weight)) invalidFields.push(weightInput);
  if (Number.isNaN(waist)) invalidFields.push(waistInput);
  if (invalidFields.length) {
    showFormError('請填寫日期、體重與腰圍。', invalidFields);
    invalidFields[0].focus();
    return;
  }

  // 範圍驗證：體重 20~300 公斤、腰圍 30~250 公分
  const rangeErrors = [];
  if (weight < 20 || weight > 300) rangeErrors.push(weightInput);
  if (waist < 30 || waist > 250) rangeErrors.push(waistInput);
  if (rangeErrors.length) {
    showFormError('請確認數值是否輸入正確。', rangeErrors);
    rangeErrors[0].focus();
    return;
  }

  // 與上一筆紀錄比較是否為異常差異（排除正在編輯的紀錄）
  const previous = records.filter(r => r.id !== editingId).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (previous) {
    const weightDiff = Math.abs(weight - previous.weight);
    const waistDiff = Math.abs(waist - previous.waist);
    const weightThreshold = 5; // 公斤
    const waistThreshold = 10; // 公分
    if (weightDiff > weightThreshold || waistDiff > waistThreshold) {
      // 暫存等待使用者確認，並顯示確認視窗
      pendingOutlier = { date, weight, waist, note };
      openConfirmModal(previous, pendingOutlier);
      return;
    }
  }

  // 未超出差異，直接儲存（預設非異常）
  commitRecord(date, weight, waist, note, false);
}

function init() {
  dateInput.value = getTodayDate();
  loadRecords();
  console.log("records=", records);
  renderRecords();
  updateStats();
  renderChart();
  recordForm.addEventListener('submit', handleSubmit);
  cancelEditButton.addEventListener('click', resetForm);
  if (exportCsvButton) exportCsvButton.addEventListener('click', exportCsv);
  if (importCsvButton) importCsvButton.addEventListener('click', importCsv);
  if (importCsvInput) importCsvInput.addEventListener('change', handleImportCsv);
  if (confirmSaveButton) {
    confirmSaveButton.addEventListener('click', () => {
      if (!pendingOutlier) return;
      commitRecord(pendingOutlier.date, pendingOutlier.weight, pendingOutlier.waist, pendingOutlier.note, true);
      pendingOutlier = null;
      closeConfirmModal();
    });
  }
  [dateInput, weightInput, waistInput].forEach(input => {
    input.addEventListener('input', clearFormError);
  });
  if (cancelSaveButton) {
    cancelSaveButton.addEventListener('click', () => {
      pendingOutlier = null;
      closeConfirmModal();
      showToast('已取消，請確認數值後再儲存。');
    });
  }
  if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(() => console.log('Service Worker 已啟動'))
      .catch(error => console.error(error));
  });
  }
}

init();
