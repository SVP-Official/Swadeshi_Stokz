let stockSymbolData = [];
let stockChartInstance = null;

const isValidStockSymbol = (symbol) => {
  if (!symbol || symbol.length < 1 || symbol.length > 15) return false;
  return /^[A-Za-z0-9]+$/.test(symbol);
};

const formatPercentage = (value) => {
  if (!value || value === 'N/A') return 'N/A';
  let cleanValue = value.toString().replace(/%/g, '').trim();
  return cleanValue === 'N/A' ? 'N/A' : `${cleanValue}%`;
};

const formatValue = (value) => {
  if (!value || value === 'N/A') return 'N/A';
  return value.toString().trim();
};

const safeSetTextContent = (id, text) => {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
};

const safeSetAttribute = (id, attr, value) => {
  const el = document.getElementById(id);
  if (el) el.setAttribute(attr, value);
};

// === Fade-in / fade-out helpers ===
const fadeIn = (element, delay = 0) => {
  if (!element) return;
  element.classList.remove('show');
  element.style.display = 'block';
  setTimeout(() => {
    element.classList.add('show');
  }, delay);
};

const hideWithFade = (element) => {
  if (!element) return;
  element.classList.remove('show');
  setTimeout(() => {
    element.style.display = 'none';
  }, 250);
};

// Fetch list of stock symbols for autocomplete
fetch('/static/symbols.json')
  .then(res => res.json())
  .then(data => {
    stockSymbolData = data;
  });

const showSuggestions = (inputValue) => {
  const list = document.getElementById('suggestionsList');
  list.innerHTML = '';
  if (!inputValue || inputValue.length < 2) {
    list.style.display = 'none';
    return;
  }
  const matches = stockSymbolData.filter(item =>
    item.symbol.toUpperCase().startsWith(inputValue.toUpperCase()) ||
    item.name.toLowerCase().includes(inputValue.toLowerCase())
  ).slice(0, 8);
  if (matches.length === 0) {
    list.style.display = 'none';
    return;
  }
  matches.forEach(({ symbol, name }) => {
    const li = document.createElement('li');
    li.textContent = `${symbol} – ${name}`;
    li.onclick = () => {
      document.getElementById('stockSymbol').value = symbol;
      list.style.display = 'none';
      searchStock();
    };
    list.appendChild(li);
  });
  list.style.display = 'block';
};

function fetchHistoricalPrices(symbol, callback) {
  const url = `/api/chart/${symbol}`;
  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (
        !data.chart || !data.chart.result 
        || !data.chart.result[0]
        || !data.chart.result[0].timestamp
        || !data.chart.result[0].indicators
        || !data.chart.result[0].indicators.quote[0].close
      ) {
        callback(null);
        return;
      }
      const prices = data.chart.result[0].indicators.quote[0].close;
      const dates = data.chart.result[0].timestamp.map(ts => {
        const d = new Date(ts * 1000);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      });
      callback({ prices, dates });
    })
    .catch(() => callback(null));
}

function renderChart(dates, prices) {
  const chartSection = document.getElementById('chartSection');
  const canvas = document.getElementById('stockChart');
  if (stockChartInstance) {
    stockChartInstance.destroy();
  }
  // Hide if no data
  if (!dates || !prices || prices.length === 0 || !prices.some(v => typeof v === 'number' && !isNaN(v))) {
    hideWithFade(chartSection);
    return;
  }
  fadeIn(chartSection, 60);

  stockChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: 'Closing Price (₹)',
        data: prices,
        borderColor: '#0d9488',
        backgroundColor: 'rgba(13,148,136,0.14)',
        fill: true,
        tension: 0.1,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      plugins: { legend: { display: false } },
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { 
          display: true,
          grid: { display: false },
          ticks: {
            autoSkip: true,
            maxTicksLimit: 8,
            color: '#134e4a',
            font: { family: "'Inter', sans-serif" }
          }
        },
        y: { 
          display: true,
          beginAtZero: false,
          title: { display: true, text: '₹', color: '#134e4a', font: { family: "'Inter', sans-serif" }},
          grid: { color: 'rgba(13,148,136,0.12)' },
          ticks: {
            color: '#134e4a',
            font: { family: "'Inter', sans-serif" }
          }
        }
      }
    }
  });
}

const searchStock = () => {
  const symbolInput = document.getElementById('stockSymbol');
  const loader = document.getElementById('loader');
  const resultCard = document.getElementById('resultCard');
  const errorMessage = document.getElementById('errorMessage');
  const chartSection = document.getElementById('chartSection');
  const symbol = symbolInput.value.trim().toUpperCase();

  document.getElementById('suggestionsList').style.display = 'none';
  hideWithFade(resultCard);
  if (errorMessage) errorMessage.textContent = '';
  hideWithFade(chartSection);

  if (!symbol) {
    if (errorMessage) errorMessage.textContent = 'Please enter a stock symbol.';
    return;
  }

  if (!isValidStockSymbol(symbol)) {
    errorMessage.textContent = 'Please enter a valid symbol (letters/numbers only).';
    return;
  }

  fadeIn(loader, 30);

  fetch(`/api/screener/${symbol}`)
    .then(res => res.json())
    .then(data => {
      hideWithFade(loader);
      if (data.error) {
        errorMessage.textContent = data.error;
        return;
      }

      safeSetAttribute('stockLogo', 'src', data.logo || '');
      safeSetAttribute('stockLogo', 'alt', symbol);
      safeSetTextContent('stockName', data.name || 'N/A');
      safeSetTextContent('stockPrice', `Price: ₹${formatValue(data.price)}`);
      safeSetTextContent('marketCap', `Market Cap: ${formatValue(data.market_cap)} Cr.`);
      safeSetTextContent('peRatio', `Stock P/E: ${formatValue(data.pe_ratio)}`);
      safeSetTextContent('bookValue', `Book Value: ₹${formatValue(data.book_value)}`);
      safeSetTextContent('roe', `ROE: ${formatPercentage(data.roe)}`);
      safeSetTextContent('dividendYield', `Dividend Yield: ${formatPercentage(data.dividend_yield)}`);
      safeSetTextContent('promoterHolding', `Promoter Hold.: ${formatPercentage(data.promoter_holding)}`);
      safeSetTextContent('fiiHolding', `FII Hold.: ${formatPercentage(data.fii_holding)}`);
      const link = document.getElementById('screenerLink');
      if (link) link.href = `https://www.screener.in/company/${symbol}`;
      fadeIn(resultCard, 80);

      fetchHistoricalPrices(symbol, (hist) => {
        if (hist && hist.prices && hist.dates && hist.prices.some(v => typeof v === 'number' && !isNaN(v))) {
          renderChart(hist.dates, hist.prices);
        } else {
          hideWithFade(chartSection);
        }
      });
    })
    .catch(() => {
      hideWithFade(loader);
      errorMessage.textContent = 'Something went wrong. Please try again.';
      hideWithFade(chartSection);
    });
};

document.addEventListener('DOMContentLoaded', () => {
  hideWithFade(document.getElementById('chartSection'));
  hideWithFade(document.getElementById('resultCard'));
  hideWithFade(document.getElementById('loader'));

  const input = document.getElementById('stockSymbol');
  input.addEventListener('input', (e) => {
    showSuggestions(e.target.value);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchStock();
  });
  document.addEventListener('click', (e) => {
    if (!document.querySelector('.search-container')?.contains(e.target)) {
      document.getElementById('suggestionsList').style.display = 'none';
    }
  });
});
