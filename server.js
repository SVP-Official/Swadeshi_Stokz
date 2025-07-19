const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/screener/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const url = `https://www.screener.in/company/${symbol}/consolidated/`;

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.google.com/',
        'Connection': 'keep-alive'
      }
    });

    const $ = cheerio.load(html);
    const companyName = $('h1').first().text().trim();
    const priceText = $("li:contains('Current Price') span.number").text().trim();
    const marketCap = $("li:contains('Market Cap') span.number").text().trim();
    const pe = $("li:contains('Stock P/E') span.number").text().trim();
    const roe = $("li:contains('ROE') span.number").text().trim();

    const logo = $('.company-logo img').attr('src') || '';

    res.json({
      companyName,
      currentPrice: priceText,
      marketCap,
      pe,
      roe,
      logo: logo.startsWith('/') ? `https://www.screener.in${logo}` : logo,
      url
    });
  } catch (error) {
    console.error('❌ Screener fetch error:', error.message);
    res.status(500).json({ error: 'Stock not found or failed to fetch data.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
