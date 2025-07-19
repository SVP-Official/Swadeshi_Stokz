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
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);
    const companyName = $('h1').first().text().trim();
    const stats = {};

    $('.company-ratios li, .ranges li, .about span').each((i, el) => {
      const label = $(el).text();
      if (label.includes('Market Cap')) stats.marketCap = $(el).find('span').last().text().trim();
      if (label.includes('Stock P/E')) stats.pe = $(el).find('span').last().text().trim();
      if (label.includes('ROE')) stats.roe = $(el).find('span').last().text().trim();
    });

    const priceText = $("li:contains('Current Price') span.number").text().trim();

    res.json({
      companyName,
      currentPrice: priceText,
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
