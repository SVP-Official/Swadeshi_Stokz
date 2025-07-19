// server.js (rollback to original working code for accurate current price) 

const express = require('express'); const axios = require('axios'); const cheerio = require('cheerio'); const path = require('path'); const app = express(); const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/screener/:symbol', async (req, res) => { const symbol = req.params.symbol.toUpperCase(); const url = `https://www.screener.in/company/${symbol}/consolidated/`;

try { const { data: html } = await axios.get(url); const $ = cheerio.load(html);

const companyName = $('h1').first().text().trim();
const stats = {};

// Scrape key stats
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

// Price scrape fallback
const priceText = $('.company-info .number').first().text().trim() || $('h4:contains("Current Price")').next().text().trim();

res.json({
  companyName,
  currentPrice: priceText,
  url,
  ...stats
});

} catch (error) { console.error('❌ Screener fetch error:', error.message); res.status(500).json({ error: 'Stock not found or error occurred.' }); } });

app.listen(PORT, () => { console.log(✅ Server running at http://localhost:${PORT}); });

