async function fetchData() {
  const symbol = document.getElementById("symbol").value.trim().toUpperCase();
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = "Loading...";

  try {
    const res = await fetch(`/api/screener/${symbol}`);
    const data = await res.json();

    if (!res.ok || data.error) {
      resultDiv.innerHTML = `⚠️ Error: ${data.error || "Failed to fetch data"}`;
      return;
    }

    resultDiv.innerHTML = `
      <h2>${data.companyName}</h2>
      <p><strong>Current Price:</strong> ₹${data.currentPrice}</p>
      <p><strong>Market Cap:</strong> ₹${data.marketCap}</p>
      <p><strong>Stock P/E:</strong> ${data.pe}</p>
      <p><strong>ROE:</strong> ${data.roe}</p>
    `;
  } catch (err) {
    resultDiv.innerHTML = `⚠️ Error: ${err.message}`;
  }
}
