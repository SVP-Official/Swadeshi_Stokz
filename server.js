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

    $('ul.card').each((i, el) => {
      $(el)
        .find('li')
        .each((j, li) => {
          const label = $(li).find('span').first().text().trim();
          const value = $(li).find('span').last().text().trim();
          if (label.includes('Market Cap')) stats.marketCap = value;
          if (label.includes('Stock P/E')) stats.pe = value;
          if (label.includes('Industry P/E')) stats.industryPE = value;
          if (label.includes('ROE')) stats.roe = value;
          if (label.includes('Promoter Holding')) stats.promoterHolding = value;
          if (label.includes('Change in Promoter Holding')) stats.promoterChange = value;
          if (label.includes('FII Holding')) stats.fiiHolding = value;
          if (label.includes('Current ratio')) stats.currentRatio = value;
        });
    });

    const priceText = $('.company-info .number').first().text().trim();

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
