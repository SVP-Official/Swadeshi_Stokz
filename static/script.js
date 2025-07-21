// Function to validate stock symbol format - UPDATED to allow numbers
const isValidStockSymbol = (symbol) => {
  // Stock symbols should be 1-15 characters, alphanumeric only
  if (!symbol || symbol.length < 1 || symbol.length > 15) {
    return false;
  }
  // Check if symbol contains only alphanumeric characters (letters AND numbers)
  return /^[A-Za-z0-9]+$/.test(symbol);
};

// Function to format percentage values properly
const formatPercentage = (value) => {
  if (!value || value === 'N/A') return 'N/A';
  // Remove any existing % symbols and clean the value
  let cleanValue = value.toString().replace(/%/g, '').trim();
  // Add % symbol only once
  return cleanValue === 'N/A' ? 'N/A' : `${cleanValue}%`;
};

// Function to format regular values (non-percentage)
const formatValue = (value) => {
  if (!value || value === 'N/A') return 'N/A';
  return value.toString().trim();
};

// FIXED: Safe element access to prevent null errors
const safeSetTextContent = (elementId, text) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = text;
  } else {
    console.warn(`Element with ID '${elementId}' not found`);
  }
};

const safeSetAttribute = (elementId, attribute, value) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.setAttribute(attribute, value);
  } else {
    console.warn(`Element with ID '${elementId}' not found`);
  }
};

const searchStock = () => {
  const symbolInput = document.getElementById('stockSymbol');
  const loader = document.getElementById('loader');
  const resultCard = document.getElementById('resultCard');
  const errorMessage = document.getElementById('errorMessage');

  // Check if essential elements exist
  if (!symbolInput) {
    console.error('stockSymbol input element not found');
    return;
  }

  const symbol = symbolInput.value.trim().toUpperCase();

  // Clear previous results
  if (resultCard) resultCard.style.display = 'none';
  if (errorMessage) errorMessage.textContent = '';
  if (loader) loader.style.display = 'none';

  // Check if input is empty
  if (!symbol) {
    if (errorMessage) errorMessage.textContent = 'Please enter a stock symbol.';
    return;
  }

  // Validate stock symbol format
  if (!isValidStockSymbol(symbol)) {
    if (errorMessage) errorMessage.textContent = 'Please enter a valid stock symbol (letters and numbers only, no spaces or special characters).';
    return;
  }

  // Show loader while fetching data
  if (loader) loader.style.display = 'flex';

  // Fetch stock data from API
  fetch(`/api/screener/${symbol}`)
    .then(res => res.json())
    .then(data => {
      if (loader) loader.style.display = 'none';

      // Handle API errors
      if (data.error) {
        if (errorMessage) errorMessage.textContent = data.error;
        return;
      }

      // FIXED: Safe population of stock data elements
      safeSetAttribute('stockLogo', 'src', data.logo || '');
      safeSetAttribute('stockLogo', 'alt', symbol);
      safeSetTextContent('stockName', data.name || 'N/A');
      safeSetTextContent('stockPrice', `Price: ₹${formatValue(data.price)}`);
      safeSetTextContent('marketCap', `Market Cap: ${formatValue(data.market_cap)} Cr.`);

      // Populate valuation metrics section
      safeSetTextContent('peRatio', `Stock P/E: ${formatValue(data.pe_ratio)}`);
      safeSetTextContent('bookValue', `Book Value: ₹${formatValue(data.book_value)}`);

      // Populate profitability & returns section
      safeSetTextContent('roe', `ROE: ${formatPercentage(data.roe)}`);
      safeSetTextContent('dividendYield', `Dividend Yield: ${formatPercentage(data.dividend_yield)}`);

      // Populate shareholding pattern section
      safeSetTextContent('promoterHolding', `Promoter Hold.: ${formatPercentage(data.promoter_holding)}`);
      safeSetTextContent('fiiHolding', `FII Hold.: ${formatPercentage(data.fii_holding)}`);

      // Set external link
      const screenerLink = document.getElementById('screenerLink');
      if (screenerLink) {
        screenerLink.href = `https://www.screener.in/company/${symbol}`;
      }

      // Show the result card
      if (resultCard) resultCard.style.display = 'block';
    })
    .catch(err => {
      if (loader) loader.style.display = 'none';
      if (errorMessage) errorMessage.textContent = 'Something went wrong. Please try again.';
      console.error('Fetch error:', err);
    });
};

// Allow Enter key to trigger search
document.addEventListener('DOMContentLoaded', function() {
  const symbolInput = document.getElementById('stockSymbol');
  if (symbolInput) {
    symbolInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        searchStock();
      }
    });
  }
});
