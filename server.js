const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/screener/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const url = `https://www.screener.in/company/${symbol}/consolidated/`;

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        Referer: "https://www.google.com/",
        Connection: "keep-alive",
      },
    });

    const $ = cheerio.load(html);
    const companyName = $("h1").first().text().trim();
    const priceText = $("li:contains('Current Price') span.number")
      .text()
      .trim();
    const marketCap = $("li:contains('Market Cap') span.number").text().trim();
    const pe = $("li:contains('Stock P/E') span.number").text().trim();
    const roe = $("li:contains('ROE') span.number").text().trim();

    let logo = ""; // placeholder before logo fetch

    // ✅ Try to fetch Google Image logo
    try {
      const googleURL = `https://www.google.com/search?q=${symbol}+logo&udm=2`;
      const { data: googleHtml } = await axios.get(googleURL, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0",
        },
      });

      const $$ = cheerio.load(googleHtml);
      const firstImage = $$("img").eq(1).attr("src"); // eq(0) is often Google's own icon

      if (firstImage && firstImage.startsWith("http")) {
        logo = firstImage;
      }
    } catch (err) {
      console.warn("⚠️ Google logo fetch failed:", err.message);
    }

    // ✅ Final fallback if Google logo fetch failed
    if (!logo) {
      logo = `https://ui-avatars.com/api/?name=${symbol}&background=39CC89&color=fff&size=64`;
    }

    res.json({
      companyName,
      currentPrice: priceText,
      marketCap,
      pe,
      roe,
      logo,
      url,
    });
  } catch (error) {
    console.error("❌ Screener fetch error:", error.message);
    res.status(500).json({ error: "Stock not found or failed to fetch data." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
