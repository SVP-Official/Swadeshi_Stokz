# app.py

import flask
from flask import render_template, jsonify
import requests
from bs4 import BeautifulSoup
import os

# Initialize Flask app
app = flask.Flask(__name__, static_url_path='/static')

# Function to fetch stock data from Screener.in
def fetch_stock_data(symbol):
    try:
        # Screener.in stock page URL
        url = f"https://www.screener.in/company/{symbol}/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }

        # Send GET request and parse HTML
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.text, "html.parser")

        # ✅ Extract company name
        name_tag = soup.find("h1")
        name = name_tag.text.strip() if name_tag else "N/A"

        # ✅ Keep original price logic (DO NOT CHANGE)
        price_tag = soup.select_one("li:contains('Current Price') span.number")
        price = price_tag.text.strip() if price_tag else "N/A"

        # ✅ Extract Market Cap and P/E Ratio only
        market_cap = pe_ratio = roe = "N/A"
        for li in soup.select("li.flex.flex-space-between"):
            label = li.find("span", class_="name")
            value = li.find("span", class_="number")
            if label and value:
                text = label.text.strip()
                if "Market Cap" in text and market_cap == "N/A":
                    market_cap = value.text.strip()
                elif "Stock P/E" in text and pe_ratio == "N/A":
                    pe_ratio = value.text.strip()
                elif "ROE" in text and roe == "N/A":
                    roe = value.text.strip()

        # ✅ Use Clearbit logo
        logo_url = f"https://logo.clearbit.com/{symbol.lower()}.com"

        # ✅ Return extracted data
        return {
            "name": name,
            "price": price,
            "pe_ratio": pe_ratio,
            "roe": roe,
            "market_cap": market_cap,
            "logo": logo_url,
            "link": url
        }

    except Exception as e:
        # Handle any scraping or network error
        return {"error": str(e)}

# ✅ Serve index.html
@app.route('/')
def index():
    return render_template('index.html')

# ✅ API route to serve data from /api/screener/SYMBOL
@app.route('/api/screener/<symbol>')
def screener(symbol):
    data = fetch_stock_data(symbol.upper())
    if "error" in data:
        return jsonify({"error": "Failed to fetch stock data"}), 500
    return jsonify(data)

# ✅ Run app on Replit/Render
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)
