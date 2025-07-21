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
    Stock symbols should be 1-15 characters, alphanumeric only, no spaces or special chars
    Examples: TCS, RELIANCE, HDFCBANK, 3MINDIA, MARICO
    """
    if not symbol or len(symbol) < 1 or len(symbol) > 15:
        return False
    # Allow both alphabetic characters AND numbers (no spaces, special chars)
    return symbol.isalnum()

# Function to clean percentage values (remove double %)
def clean_percentage_value(value):
    """
    Clean percentage values to avoid double % symbols
    """
    if isinstance(value, str) and value != "N/A":
        # Remove extra % symbols and clean the value
        cleaned = value.replace('%%', '%').strip()
        # If it already has %, don't add another one
        if cleaned.endswith('%'):
            return cleaned.rstrip('%')  # Remove % so we can add it consistently in frontend
        return cleaned
    return value

# METHOD 1: Extract from li.flex + span.number (for Book Value, Dividend Yield)
def extract_method_1(soup, patterns):
    """
    Extract from li elements with class="flex" and span.number
    """
    for pattern in patterns:
        for li in soup.find_all("li", class_="flex"):
            li_text = li.get_text()
            if any(keyword.lower() in li_text.lower() for keyword in pattern):
                number_span = li.find("span", class_="number")
                if number_span:
                    return clean_percentage_value(number_span.text.strip())
    return "N/A"

# METHOD 2: Extract from table td (for Promoter Holding, FII Holding)
def extract_method_2(soup, patterns):
    """
    Extract from table td elements
    """
    for pattern in patterns:
        for table in soup.find_all("table"):
            for tr in table.find_all("tr"):
                tr_text = tr.get_text()
                if any(keyword.lower() in tr_text.lower() for keyword in pattern):
                    td_elements = tr.find_all("td")
                    if len(td_elements) >= 2:
                        # Try last cell first, then second cell
                        for td in reversed(td_elements):
                            text = td.get_text().strip()
                            if text and not text.isalpha() and text != "" and text != "-":
                                return clean_percentage_value(text)
    return "N/A"

# Clean and streamlined data extraction function
def fetch_stock_data(symbol):
    try:
        # Build Screener.in URL for the stock
        url = f"https://www.screener.in/company/{symbol}/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }

        response = requests.get(url, headers=headers, timeout=15)

        # Check for HTTP errors first
        if response.status_code == 404:
            return {"error": "Stock symbol not found"}

        if response.status_code != 200:
            return {"error": "Network error occurred"}

        # Parse HTML content
        soup = BeautifulSoup(response.text, "html.parser")

        # Check page title for error indicators
        title_tag = soup.find("title")
        title_text = title_tag.text.strip() if title_tag else "No title"

        # Specific error detection
        if ("404" in title_text.lower() or 
            "not found" in title_text.lower() or
            "error" in title_text.lower()):
            return {"error": "Stock symbol not found"}

        # Extract company name
        name = "N/A"
        name_tag = soup.find("h1")
        if name_tag:
            name = name_tag.text.strip()

        # Alternative methods to find company name if h1 fails
        if not name or name == "N/A" or len(name.strip()) == 0:
            for tag in soup.find_all(["h1", "h2"]):
                if tag and tag.text.strip() and len(tag.text.strip()) > 2:
                    name = tag.text.strip()
                    break

        # If still no name found, this might not be a valid stock page
        if not name or name == "N/A" or len(name.strip()) < 2:
            return {"error": "Stock symbol not found"}

        # Extract current stock price
        price = "N/A"
        price_patterns = ["Current Price", "Stock Price", "Share Price", "Price"]

        for pattern in price_patterns:
            for li in soup.find_all("li"):
                li_text = li.get_text()
                if pattern in li_text:
                    number_span = li.find("span", class_="number")
                    if number_span and number_span.text.strip():
                        price = number_span.text.strip()
                        break
            if price != "N/A":
                break

        # Extract Market Cap
        market_cap = "N/A"
        for li in soup.find_all("li"):
            li_text = li.get_text()
            if "Market Cap" in li_text:
                number_span = li.find("span", class_="number")
                if number_span:
                    market_cap = number_span.text.strip()
                    break

        # Extract P/E Ratio
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

        # Extract ROE
        roe = "N/A"
        for li in soup.find_all("li", class_="flex"):
            label = li.find("span", class_="name")
            value = li.find("span", class_="number")
            if label and value and "ROE" in label.text:
                roe = clean_percentage_value(value.text.strip())
                break

        # EXTRACT ONLY WORKING METRICS WITH SPECIFIC METHODS

        # Extract Promoter Holding % - METHOD 2 (table td)
        promoter_holding = extract_method_2(
            soup,
            [["Promoters"], ["Promoter holding"], ["Promoter Holding"], ["Promoter"]]
        )

        # Extract FII Holding % - METHOD 2 (table td)
        fii_holding = extract_method_2(
            soup,
            [["FII"], ["Foreign"], ["FPI"], ["Foreign Institutional"], ["Foreign Portfolio"]]
        )

        # Extract Book Value - METHOD 1 (li.flex + span.number)
        book_value = extract_method_1(
            soup,
            [["Book value"], ["Book Value"], ["Book value per share"]]
        )

        # Extract Dividend Yield - METHOD 1 (li.flex + span.number)
        dividend_yield = extract_method_1(
            soup,
            [["Dividend yield"], ["Dividend Yield"], ["Div Yield"]]
        )

        # Generate company logo URL
        primary_logo = f"https://logo.clearbit.com/{symbol.lower()}.com"

        try:
            logo_response = requests.head(primary_logo, timeout=3)
            if logo_response.status_code == 200:
                logo_url = primary_logo
            else:
                logo_url = f"https://ui-avatars.com/api/?name={symbol}&background=39CC89&color=fff&size=64"
        except:
            logo_url = f"https://ui-avatars.com/api/?name={symbol}&background=39CC89&color=fff&size=64"

        # Return structured stock data - ONLY WORKING METRICS
        return {
            # Basic metrics (always working)
            "name": name,
            "price": price,
            "pe_ratio": pe_ratio,
            "roe": roe,
            "market_cap": market_cap,
            "logo": logo_url,
            "link": url,

            # Working extracted metrics only
            "promoter_holding": promoter_holding,
            "fii_holding": fii_holding,
            "book_value": book_value,
            "dividend_yield": dividend_yield,

            # Removed metrics (consistently failed)
            # "promoter_change": "N/A",      # REMOVED - All methods failed
            # "industry_pe": "N/A",          # REMOVED - All methods failed  
            # "current_ratio": "N/A",        # REMOVED - All methods failed
            # "debt_to_equity": "N/A"        # REMOVED - All methods failed
        }

    except requests.exceptions.Timeout:
        return {"error": "Request timed out. Please try again."}
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error in fetch_stock_data(): {str(e)}")
        return {"error": "Network connection failed"}
    except Exception as e:
        logger.error(f"Error in fetch_stock_data(): {str(e)}")
        return {"error": f"Unexpected error: {str(e)}"}

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
            return jsonify({"error": "Please enter a valid stock symbol (letters and numbers only, 1-15 characters)"}), 400

        # Fetch stock data
        data = fetch_stock_data(symbol.upper())

        # Return error if data fetching failed or stock not found
        if "error" in data:
            if "not found" in data["error"].lower():
                return jsonify({"error": f"'{symbol.upper()}' is not a valid stock symbol. Please check and try again."}), 404
            else:
                return jsonify({"error": data["error"]}), 500

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
