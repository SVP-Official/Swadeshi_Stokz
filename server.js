const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/screener/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const screenerUrl = `https://www.screener.in/company/${symbol}/consolidated/`;
  const intradayUrl = `https://www.intradayscreener.com/company/${symbol}`;

  const stats = {
    companyName: '',
    currentPrice: '',
    url: screenerUrl
  };

  try {
    const { data: screenerHtml } = await axios.get(screenerUrl);
    const $ = cheerio.load(screenerHtml);

    stats.companyName = $('h1').first().text().trim();

    // ✅ Correct price extraction from Screener
    const priceEl = $('h4:contains("Current Price")').next('span').first();
    stats.currentPrice = priceEl.text().trim();

    $('.company-ratios li, .ranges li, .about span').each((i, el) => {
      const label = $(el).text();
      if (label.includes('Market Cap')) stats.marketCap = $(el).find('span').last().text().trim();
      if (label.includes('Stock P/E')) stats.pe = $(el).find('span').last().text().trim();
      if (label.includes('Industry P/E')) stats.industryPE = $(el).find('span').last().text().trim();
      if (label.includes('ROE')) stats.roe = $(el).find('span').last().text().trim();
      if (label.includes('Promoter Holding')) stats.promoterHolding = $(el).find('span').last().text().trim();
      if (label.includes('Change in Promoter Holding')) stats.promoterChange = $(el).find('span').last().text().trim();
      if (label.includes('FII Holding')) stats.fiiHolding = $(el).find('span').last().text().trim();
      if (label.includes('Current ratio')) stats.currentRatio = $(el).find('span').last().text().trim();
    });
  } catch (err) {
    console.warn(`⚠️ Screener fetch failed for ${symbol}, trying fallback...`);
  }

  try {
    const { data: fallbackHtml } = await axios.get(intradayUrl);
    const $$ = cheerio.load(fallbackHtml);

    if (!stats.currentPrice) stats.currentPrice = $$('.key-metrics span:contains("CMP")').next().text().trim();
    if (!stats.pe) stats.pe = $$('.key-metrics span:contains("PE")').next().text().trim();
    if (!stats.roe) stats.roe = $$('.key-metrics span:contains("ROE")').next().text().trim();
    if (!stats.marketCap) stats.marketCap = $$('.key-metrics span:contains("Market Cap")').next().text().trim();
  } catch (err) {
    console.warn(`⚠️ Intradayscreener fallback also failed for ${symbol}`);
  }

  if (!stats.companyName) {
    return res.status(500).json({ error: 'Stock not found or error occurred.' });
  }

  res.json(stats);
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});