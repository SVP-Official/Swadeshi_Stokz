// Function to validate stock symbol format
const isValidStockSymbol = (symbol) => {
  // Stock symbols should be 1-10 characters, letters only
  if (!symbol || symbol.length < 1 || symbol.length > 10) {
    return false;
  }
  // Check if symbol contains only alphabetic characters
  return /^[A-Za-z]+$/.test(symbol);
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

// Function to show/hide individual fields and sections based on data availability
const updateFieldVisibility = (data) => {
  // List of conditional fields that should be hidden if N/A
  const conditionalFields = [
    { id: 'industryPe', value: data.industry_pe },
    { id: 'currentRatio', value: data.current_ratio },
    { id: 'debtToEquity', value: data.debt_to_equity },
    { id: 'promoterChange', value: data.promoter_change }
  ];

  // Show/hide individual fields
  conditionalFields.forEach(field => {
    const element = document.getElementById(field.id);
    if (element) {
      if (field.value && field.value !== 'N/A') {
        element.style.display = 'block';
      } else {
        element.style.display = 'none';
      }
    }
  });

  // Handle Financial Health section - hide if both metrics are N/A
  const financialHealthSection = document.querySelector('.metrics-section:nth-of-type(3)');
  const hasCurrentRatio = data.current_ratio && data.current_ratio !== 'N/A';
  const hasDebtToEquity = data.debt_to_equity && data.debt_to_equity !== 'N/A';

  if (financialHealthSection) {
    if (hasCurrentRatio || hasDebtToEquity) {
      financialHealthSection.style.display = 'block';
    } else {
      financialHealthSection.style.display = 'none';
    }
  }
};

const searchStock = () => {
  const symbol = document.getElementById('stockSymbol').value.trim().toUpperCase();
  const loader = document.getElementById('loader');
  const resultCard = document.getElementById('resultCard');
  const errorMessage = document.getElementById('errorMessage');

  // Clear previous results
  resultCard.style.display = 'none';
  errorMessage.textContent = '';
  loader.style.display = 'none';

  // Check if input is empty
  if (!symbol) {
    errorMessage.textContent = 'Please enter a stock symbol.';
    return;
  }

  // Validate stock symbol format
  if (!isValidStockSymbol(symbol)) {
    errorMessage.textContent = 'Please enter a valid stock symbol (letters only, no numbers or special characters).';
    return;
  }

  // Show loader while fetching data
  loader.style.display = 'flex';

  // Fetch stock data from API
  fetch(`/api/screener/${symbol}`)
    .then(res => res.json())
    .then(data => {
      loader.style.display = 'none';

      // Handle API errors
      if (data.error) {
        errorMessage.textContent = data.error;
        return;
      }

      // Populate existing stock data (keeping original functionality)
      document.getElementById('stockLogo').src = data.logo || '';
      document.getElementById('stockLogo').alt = symbol;
      document.getElementById('stockName').textContent = data.name || 'N/A';
      document.getElementById('stockPrice').textContent = `Price: ₹${formatValue(data.price)}`;
      document.getElementById('marketCap').textContent = `Market Cap: ${formatValue(data.market_cap)} Cr.`;

      // Populate valuation metrics section with proper formatting
      document.getElementById('peRatio').textContent = `Stock P/E: ${formatValue(data.pe_ratio)}`;
      document.getElementById('industryPe').textContent = `Industry P/E: ${formatValue(data.industry_pe)}`;
      document.getElementById('bookValue').textContent = `Book Value: ₹${formatValue(data.book_value)}`;

      // Populate profitability & returns section with proper percentage formatting
      document.getElementById('roe').textContent = `ROE: ${formatPercentage(data.roe)}`;
      document.getElementById('dividendYield').textContent = `Dividend Yield: ${formatPercentage(data.dividend_yield)}`;

      // Populate financial health section with proper formatting
      document.getElementById('currentRatio').textContent = `Current Ratio: ${formatValue(data.current_ratio)}`;
      document.getElementById('debtToEquity').textContent = `Debt to Equity: ${formatValue(data.debt_to_equity)}`;

      // Populate shareholding pattern section with proper percentage formatting
      document.getElementById('promoterHolding').textContent = `Promoter Hold.: ${formatPercentage(data.promoter_holding)}`;
      document.getElementById('promoterChange').textContent = `Change in Prom. Hold.: ${formatValue(data.promoter_change)}`;
      document.getElementById('fiiHolding').textContent = `FII Hold.: ${formatPercentage(data.fii_holding)}`;

      // Set external link (keeping original functionality)
      document.getElementById('screenerLink').href = `https://www.screener.in/company/${symbol}`;

      // Hide sections that have all N/A values
      updateFieldVisibility(data);

      // Show the result card
      resultCard.style.display = 'block';
    })
    .catch(err => {
      loader.style.display = 'none';
      errorMessage.textContent = 'Something went wrong. Please try again.';
      console.error(err);
    });
};

// Allow Enter key to trigger search (keeping original functionality)
document.getElementById('stockSymbol').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    searchStock();
  }
});
