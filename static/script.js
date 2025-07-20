const searchStock = () => {
  const symbol = document.getElementById('stockSymbol').value.trim().toUpperCase();
  const loader = document.getElementById('loader');
  const resultCard = document.getElementById('resultCard');
  const errorMessage = document.getElementById('errorMessage');

  // Clear previous results
  resultCard.style.display = 'none';
  errorMessage.textContent = '';
  loader.style.display = 'none';

  // Show warning if input is empty
  if (!symbol) {
    errorMessage.textContent = 'Please enter a stock symbol.';
    return;
  }

  loader.style.display = 'flex';

  fetch(`/api/screener/${symbol}`)
    .then(res => res.json())
    .then(data => {
      loader.style.display = 'none';

      if (data.error) {
        errorMessage.textContent = data.error;
        return;
      }

      document.getElementById('stockLogo').src = data.logo || '';
      document.getElementById('stockLogo').alt = symbol;
      document.getElementById('stockName').textContent = data.name || 'N/A';
      document.getElementById('stockPrice').textContent = `Price: ₹${data.price || 'N/A'}`;
      document.getElementById('marketCap').textContent = `Market Cap: ${data.marketCap || 'N/A'}`;
      document.getElementById('peRatio').textContent = `P/E Ratio: ${data.peRatio || 'N/A'}`;
      document.getElementById('roe').textContent = `ROE: ${data.roe || 'N/A'}`;
      document.getElementById('screenerLink').href = `https://www.screener.in/company/${symbol}`;

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
