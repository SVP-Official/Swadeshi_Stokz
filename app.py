# app.py
import flask
from flask import render_template, jsonify
import requests
from bs4 import BeautifulSoup
import os
import re
import logging
import sys

# Configure clean logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(message)s',
    datefmt='%H:%M:%S',
    stream=sys.stdout
)

# Create logger instance
logger = logging.getLogger(__name__)

# Disable werkzeug's verbose logging (keeps auto-reload messages)
logging.getLogger('werkzeug').setLevel(logging.WARNING)

# Initialize Flask app
app = flask.Flask(__name__, static_url_path='/static')

# Stock symbol validation function
def is_valid_stock_symbol(symbol):
    """
    Validate if the input is a proper stock symbol
    Stock symbols should be 1-10 characters, letters only, no spaces or special chars
    """
    if not symbol or len(symbol) < 1 or len(symbol) > 10:
        return False
    # Only allow alphabetic characters (no numbers, spaces, special chars)
    return symbol.isalpha()

# Function to fetch stock data from Screener.in
def fetch_stock_data(symbol):
    try:
        # Build Screener.in URL for the stock
        url = f"https://www.screener.in/company/{symbol}/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        response = requests.get(url, headers=headers)

        # Check if the stock page exists (Screener.in returns 404 for invalid symbols)
        if response.status_code == 404:
            return {"error": "Stock symbol not found"}

        # Parse HTML content
        soup = BeautifulSoup(response.text, "html.parser")

        # Extract company name from h1 tag
        name_tag = soup.find("h1")
        name = name_tag.text.strip() if name_tag else "N/A"

        # Additional validation: Check if we're actually on a stock page
        # Valid stock pages should have company name and basic stock data
        if name == "N/A" or "Page not found" in response.text or "404" in response.text:
            return {"error": "Stock symbol not found"}

        # Extract current stock price
        price = "N/A"
        for li in soup.find_all("li"):
            if "Current Price" in li.get_text():
                number_span = li.find("span", class_="number")
                if number_span:
                    price = number_span.text.strip()
                    break

        # Additional validation: A valid stock should have at least a price
        # If no price is found, it's likely not a valid stock symbol
        if price == "N/A":
            return {"error": "Stock symbol not found"}

        # Extract Market Cap from li elements
        market_cap = "N/A"
        for li in soup.find_all("li"):
            li_text = li.get_text()
            if "Market Cap" in li_text:
                number_span = li.find("span", class_="number")
                if number_span:
                    market_cap = number_span.text.strip()
                    break

        # Extract P/E Ratio from li elements
        pe_ratio = "N/A"
        pe_variations = ["Stock P/E", "P/E", "PE Ratio", "PE"]
        for variation in pe_variations:
            for li in soup.find_all("li"):
                li_text = li.get_text()
                if variation in li_text:
                    number_span = li.find("span", class_="number")
                    if number_span:
                        pe_ratio = number_span.text.strip()
                        break
            if pe_ratio != "N/A":
                break

        # Extract ROE (Return on Equity)
        roe = "N/A"
        for li in soup.find_all("li", class_="flex"):
            label = li.find("span", class_="name")
            value = li.find("span", class_="number")
            if label and value and "ROE" in label.text:
                roe = value.text.strip()
                break

        # Generate company logo URL with fallback
        primary_logo = f"https://logo.clearbit.com/{symbol.lower()}.com"

        # Check if primary logo is accessible
        try:
            logo_response = requests.head(primary_logo, timeout=3)
            if logo_response.status_code == 200:
                logo_url = primary_logo
            else:
                # Use fallback avatar generator if primary logo fails
                logo_url = f"https://ui-avatars.com/api/?name={symbol}&background=39CC89&color=fff&size=64"
        except:
            # Use fallback avatar generator if request fails
            logo_url = f"https://ui-avatars.com/api/?name={symbol}&background=39CC89&color=fff&size=64"

        # Return structured stock data
        return {
            "name": name,
            "price": price,
            "pe_ratio": pe_ratio,
            "roe": roe,
            "market_cap": market_cap,
            "logo": logo_url,
            "link": url
        }

    except requests.exceptions.RequestException as e:
        logger.error(f"Network error in fetch_stock_data(): {str(e)}")
        return {"error": "Network connection failed"}
    except Exception as e:
        logger.error(f"Error in fetch_stock_data(): {str(e)}")
        return {"error": str(e)}

# Route for serving the main HTML page
@app.route('/')
def index():
    return render_template('index.html')

# API endpoint for fetching stock data
@app.route('/api/screener/<symbol>')
def screener(symbol):
    try:
        # Validate stock symbol format
        if not is_valid_stock_symbol(symbol):
            return jsonify({"error": "Please enter a valid stock symbol (letters only, 1-10 characters)"}), 400

        # Fetch stock data
        data = fetch_stock_data(symbol.upper())

        # Return error if data fetching failed or stock not found
        if "error" in data:
            if "not found" in data["error"]:
                return jsonify({"error": f"'{symbol.upper()}' is not a valid stock symbol. Please check and try again."}), 404
            else:
                return jsonify({"error": "Unable to fetch stock data. Please try again."}), 500

        return jsonify(data)

    except Exception as e:
        logger.error(f"Error in screener() route: {str(e)}")
        return jsonify({"error": "Server error occurred"}), 500

# Custom error handlers
@app.errorhandler(404)
def not_found_error(error):
    logger.error(f"404 Error: Page not found - {flask.request.url}")
    return jsonify({"error": "Page not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"500 Error: Internal server error - {str(error)}")
    return jsonify({"error": "Internal server error"}), 500

# Start Flask application (compatible with Replit and Render)
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    # Only show startup message once (Flask debug mode spawns process twice)
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        logger.info("🚀 Stox Pulse started successfully")
    app.run(debug=True, host="0.0.0.0", port=port)
