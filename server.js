// server.js

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/screener/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const url = `https://www.screener.in/company/${symbol}/consolidated/`;

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    const $ = cheerio.load(html);
    const companyName = $('h1').first().text().trim();
    const logoUrl = $('.company-info .logo img').attr('src');
    const logo = logoUrl ? `https://www.screener.in${logoUrl}` : null;

    const stats = {};
    const priceText = $("li:contains('Current Price') span.number").text().trim();
    const marketCap = $("li:contains('Market Cap') span.number").text().trim();
    const pe = $("li:contains('Stock P/E') span.number").text().trim();
    const roe = $("li:contains('ROE') span.number").text().trim();

    stats.currentPrice = priceText;
    stats.marketCap = marketCap;
    stats.pe = pe;
    stats.roe = roe;

    res.json({
      companyName,
      logo,
      url,
      ...stats
    });

  } catch (error) {
    console.error('❌ Screener fetch error:', error.message);
    res.status(500).json({ error: 'Stock not found or error occurred.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
