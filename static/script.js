let stockSymbolData = [];

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

// 🆕 Fetch list of stock symbols
fetch('/static/symbols.json')
  .then(res => res.json())
  .then(data => {
    stockSymbolData = data;
  });

const showSuggestions = (inputValue) => {
  const list = document.getElementById('suggestionsList');
  list.innerHTML = ''; // Clear old
  if (!inputValue || inputValue.length < 2) {
    list.style.display = 'none';
    return;
  }

  const matches = stockSymbolData.filter(item =>
    item.symbol.toUpperCase().startsWith(inputValue.toUpperCase()) ||
    item.name.toLowerCase().includes(inputValue.toLowerCase())
  ).slice(0, 8); // limit to top 8

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

const searchStock = () => {
  const symbolInput = document.getElementById('stockSymbol');
  const loader = document.getElementById('loader');
  const resultCard = document.getElementById('resultCard');
  const errorMessage = document.getElementById('errorMessage');
  const symbol = symbolInput.value.trim().toUpperCase();

  document.getElementById('suggestionsList').style.display = 'none';
  if (resultCard) resultCard.style.display = 'none';
  if (errorMessage) errorMessage.textContent = '';
  if (!symbol) {
    if (errorMessage) errorMessage.textContent = 'Please enter a stock symbol.';
    return;
  }

  if (!isValidStockSymbol(symbol)) {
    errorMessage.textContent = 'Please enter a valid symbol (letters/numbers only).';
    return;
  }

  if (loader) loader.style.display = 'flex';

  fetch(`/api/screener/${symbol}`)
    .then(res => res.json())
    .then(data => {
      loader.style.display = 'none';
      if (data.error) return errorMessage.textContent = data.error;

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

      if (resultCard) resultCard.style.display = 'block';
    })
    .catch(err => {
      loader.style.display = 'none';
      errorMessage.textContent = 'Something went wrong. Please try again.';
    });
};

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('stockSymbol');
  input.addEventListener('input', (e) => {
    showSuggestions(e.target.value);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchStock();
  });

  // Hide suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!document.getElementById('search-container')?.contains(e.target)) {
      document.getElementById('suggestionsList').style.display = 'none';
    }
  });
});
