const form = document.getElementById("stockForm");
const symbolInput = document.getElementById("symbolInput");
const stockBox = document.getElementById("stockBox");
const loader = document.getElementById("loader");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const symbol = symbolInput.value.trim().toUpperCase();
  if (!symbol) return;

  stockBox.classList.add("hidden");
  loader.classList.remove("hidden");

  try {
    const response = await fetch(`/api/screener/${symbol}`);
    const data = await response.json();

    if (data.error) {
      stockBox.innerHTML = `<p class="error">Error: ${data.error}</p>`;
    } else {
      stockBox.innerHTML = `
        <h2>${data.logo ? `<img src="${data.logo}" class="logo">` : ''}${data.companyName}</h2>
        <p><strong>Current Price:</strong> ₹${data.currentPrice || 'N/A'}</p>
        <p><strong>Market Cap:</strong> ₹${data.marketCap || 'N/A'} Cr</p>
        <p><strong>Stock P/E:</strong> ${data.pe || 'N/A'}</p>
        <p><strong>ROE:</strong> ${data.roe || 'N/A'}%</p>
        <p>🔗 <a href="${data.url}" target="_blank">View more on Screener.in</a></p>
      `;
    }

    loader.classList.add("hidden");
    stockBox.classList.remove("hidden");
  } catch (err) {
    loader.classList.add("hidden");
    stockBox.classList.remove("hidden");
    stockBox.innerHTML = `<p class="error">Error fetching stock data.</p>`;
  }
});

// Optional: press Enter support without button
symbolInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    form.dispatchEvent(new Event("submit"));
  }
});
