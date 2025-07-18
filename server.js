const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");
const app = express();
const PORT = 3000;

app.use(express.static("public"));

async function getScreenerData(symbol) {
  const url = `https://www.screener.in/company/${symbol}/`;

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.google.com/",
      },
    });

    const $ = cheerio.load(html);

    const rawName = $("h1").first().text().trim();
    const name = rawName.split(/\n/)[0].trim();

    return {
      companyName: name,
      marketCap: $("li:contains('Market Cap') span.number").text().trim(),
      currentPrice: $("li:contains('Current Price') span.number").text().trim(),
      roe: $("li:contains('ROE') span.number").text().trim(),
      pe: $("li:contains('Stock P/E') span.number").text().trim(),
    };
  } catch (error) {
    console.error("❌ Screener Fetch Failed:", error.message);
    throw new Error("Screener blocked or symbol invalid.");
  }
}

app.get("/api/screener/:symbol", async (req, res) => {
  try {
    const data = await getScreenerData(req.params.symbol.toUpperCase());
    res.json(data);
  } catch (err) {
    console.error("Screener error:", err.message);
    res.status(500).json({ error: "Screener fetch failed or symbol not found" });
  }
});

app.listen(PORT, () => {
  console.log(`\u2705 Server running at http://localhost:${PORT}`);
});