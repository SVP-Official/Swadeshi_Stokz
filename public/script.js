const form = document.getElementById("stockForm");
const symbolInput = document.getElementById("symbolInput");
const stockBox = document.getElementById("stockBox");
const loader = document.getElementById("loader");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const symbol = symbolInput.value.trim().toUpperCase();
  if (!symbol) return;

  stockBox.classList.add("hidden");
  stockBox.classList.remove("visible");
  loader.classList.add("visible");

  try {
    const response = await fetch(`/api/screener/${symbol}`);
    const data = await response.json();

    stockBox.innerHTML = ""; // Clear previous content

    if (data.error) {
      stockBox.innerHTML = `<p class="error">Error: ${data.error}</p>`;
    } else {
      const logoUrl = data.logo || "https://via.placeholder.com/25?text=Logo"; // Fallback logo
      stockBox.innerHTML = `
        <h2><img src="${logoUrl}" class="logo" alt="logo">${data.companyName}</h2>
        <p><strong>Current Price:</strong> ₹${data.currentPrice || "N/A"}</p>
        <p><strong>Market Cap:</strong> ₹${data.marketCap || "N/A"} Cr</p>
        <p><strong>Stock P/E:</strong> ${data.pe || "N/A"}</p>
        <p><strong>ROE:</strong> ${data.roe || "N/A"}%</p>
        <p><strong>More Info:</strong> <a href="${data.url}" target="_blank">View on Screener.in</a></p>
      `;
    }
  } catch (err) {
    stockBox.innerHTML = `<p class="error">Error fetching stock data: ${err.message}</p>`;
  } finally {
    loader.classList.remove("visible");
    stockBox.classList.remove("hidden");
    stockBox.classList.add("visible");
  }
});

// Optional: press Enter support without button
symbolInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    form.dispatchEvent(new Event("submit"));
  }
});
