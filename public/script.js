// script.js

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('stockForm');
  const input = document.getElementById('symbolInput');
  const stockBox = document.getElementById('stockBox');
  const loader = document.getElementById('loader');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const symbol = input.value.trim().toUpperCase();
    if (!symbol) return;

    stockBox.classList.add('hidden');
    loader.classList.remove('hidden');
    loader.textContent = "Loading...";

    try {
      const res = await fetch(`/api/screener/${symbol}`);
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();

      const logoImg = data.logo ? `<img src="${data.logo}" alt="${data.companyName} Logo">` : '';

      stockBox.innerHTML = `
        <h2>${logoImg}${data.companyName}</h2>
        <p><strong>Current Price:</strong> ₹${data.currentPrice}</p>
        <p><strong>Market Cap:</strong> ₹${data.marketCap}</p>
        <p><strong>Stock P/E:</strong> ${data.pe}</p>
        <p><strong>ROE:</strong> ${data.roe}</p>
        <p>🔗 <a href="${data.url}" target="_blank">View more on Screener.in</a></p>
      `;

      stockBox.classList.remove('hidden');
    } catch (err) {
      stockBox.innerHTML = `<p style="color:red;">Error: Stock not found or failed to fetch data.</p>`;
      stockBox.classList.remove('hidden');
    } finally {
      loader.classList.add('hidden');
    }
  });
});
