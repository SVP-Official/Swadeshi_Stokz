const input = document.getElementById("symbol");
input.addEventListener("keypress", function(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    fetchData();
  }
});

async function fetchData() {
  const symbol = input.value.trim().toUpperCase();
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = "Loading...";

  try {
    const res = await fetch(`/api/screener/${symbol}`);
    const data = await res.json();

    if (!res.ok || data.error) {
      resultDiv.innerHTML = `⚠️ Error: ${data.error || 'Failed to fetch data'}`;
      return;
    }

    resultDiv.innerHTML = `
      <h2>${data.companyName}</h2>
      <p><strong>Current Price:</strong> ₹${data.currentPrice}</p>
      <p><strong>Market Cap:</strong> ₹${data.marketCap}</p>
      <p><strong>Stock P/E:</strong> ${data.pe}</p>
      <p><strong>Industry P/E:</strong> ${data.industryPE}</p>
      <p><strong>ROE:</strong> ${data.roe}</p>
      <p><strong>Promoter Holding:</strong> ${data.promoterHolding}</p>
      <p><strong>Promoter Change %:</strong> ${data.promoterChange}</p>
      <p><strong>FII Holding %:</strong> ${data.fiiHolding}</p>
      <p><strong>Current Ratio:</strong> ${data.currentRatio}</p>
      <a href="${data.url}" target="_blank">🔗 View more on Screener.in</a>
    `;
  } catch (err) {
    resultDiv.innerHTML = `⚠️ Error: ${err.message}`;
  }
}
