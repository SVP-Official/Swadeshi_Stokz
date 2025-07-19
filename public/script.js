document.addEventListener("DOMContentLoaded", () => {
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
      const res = await fetch(`/api/screener/${symbol}`);
      const data = await res.json();

      loader.classList.add("hidden");

      if (data.error) {
        stockBox.innerHTML = `<p>Error: ${data.error}</p>`;
      } else {
        stockBox.innerHTML = `
          <h2><img src="https://logo.clearbit.com/${symbol}.com" onerror="this.style.display='none'" style="height:1em;vertical-align:middle;margin-right:0.5rem;">${data.companyName}</h2>
          <p><strong>Current Price:</strong> ₹${data.currentPrice}</p>
          <p><strong>Market Cap:</strong> ₹${data.marketCap || "N/A"} Cr.</p>
          <p><strong>Stock P/E:</strong> ${data.pe || "N/A"}</p>
          <p><strong>ROE:</strong> ${data.roe || "N/A"}%</p>
          <p>🔗 <a href="${data.url}" target="_blank">View more on Screener.in</a></p>
        `;
      }

      stockBox.classList.remove("hidden");
    } catch (err) {
      console.error("Error fetching stock data", err);
      loader.classList.add("hidden");
      stockBox.innerHTML = `<p>Error loading stock data.</p>`;
      stockBox.classList.remove("hidden");
    }
  });

  symbolInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      form.dispatchEvent(new Event("submit"));
    }
  });
});
