// Function to validate stock symbol format
const isValidStockSymbol = (symbol) => {
  // Stock symbols should be 1-10 characters, letters only
  if (!symbol || symbol.length < 1 || symbol.length > 10) {
    return false;
  }
  // Check if symbol contains only alphabetic characters
  return /^[A-Za-z]+$/.test(symbol);
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

      // Populate stock data in the result card
      document.getElementById('stockLogo').src = data.logo || '';
      document.getElementById('stockLogo').alt = symbol;
      document.getElementById('stockName').textContent = data.name || 'N/A';
      document.getElementById('stockPrice').textContent = `Price: ₹${data.price || 'N/A'}`;
      document.getElementById('marketCap').textContent = `Market Cap: ${data.market_cap || 'N/A'} Cr.`;
      document.getElementById('peRatio').textContent = `P/E Ratio: ${data.pe_ratio || 'N/A'}`;
      document.getElementById('roe').textContent = `ROE: ${data.roe || 'N/A'} %`;
      document.getElementById('screenerLink').href = `https://www.screener.in/company/${symbol}`;

      // Show the result card
      resultCard.style.display = 'block';
    })
    .catch(err => {
      loader.style.display = 'none';
      errorMessage.textContent = 'Something went wrong. Please try again.';
      console.error(err);
    });
};

// Allow Enter key to trigger search
document.getElementById('stockSymbol').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    searchStock();
  }
});
