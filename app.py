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

# Enhanced function to extract data from various HTML structures
def extract_metric_value(soup, patterns, fallback_patterns=None):
    """
    Extract metric value using multiple patterns and fallback options
    """
    all_patterns = patterns + (fallback_patterns or [])

    for pattern in all_patterns:
        # Check in li elements with class="flex flex-space-between"
        for li in soup.find_all("li", class_="flex"):
            li_text = li.get_text()
            if any(keyword.lower() in li_text.lower() for keyword in pattern):
                number_span = li.find("span", class_="number")
                if number_span:
                    return clean_percentage_value(number_span.text.strip())

        # Check in table rows (improved)
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

        # Check in simple li elements
        for li in soup.find_all("li"):
            li_text = li.get_text()
            if any(keyword.lower() in li_text.lower() for keyword in pattern):
                number_span = li.find("span", class_="number")
                if number_span:
                    return clean_percentage_value(number_span.text.strip())

                # Extract number from text if no span found
                # Look for patterns like "Debt to Equity: 0.25" or "Current Ratio: 1.5"
                for keyword in pattern:
                    if keyword.lower() in li_text.lower():
                        # Split by the keyword and get the part after it
                        parts = li_text.lower().split(keyword.lower())
                        if len(parts) > 1:
                            after_keyword = parts[1]
                            # Extract numbers (including decimals)
                            numbers = re.findall(r'[\d,]+\.?\d*', after_keyword)
                            if numbers:
                                return clean_percentage_value(numbers[0])

        # Check in div and span elements
        for element in soup.find_all(["div", "span"]):
            element_text = element.get_text()
            if any(keyword.lower() in element_text.lower() for keyword in pattern):
                # Look for numbers in the element
                numbers = re.findall(r'[\d,]+\.?\d*', element_text)
                if numbers:
                    return clean_percentage_value(numbers[-1])

    return "N/A"

# Function to try alternative data sources
def get_alternative_financial_data(symbol):
    """
    Try to get financial ratios from alternative patterns or calculations
    """
    try:
        url = f"https://www.screener.in/company/{symbol}/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        response = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, "html.parser")

        # Alternative patterns for missing metrics
        alternative_data = {}

        # Try to find Current Ratio in financial statements section
        for section in soup.find_all(["section", "div"], class_=re.compile(r'.*financial.*|.*ratio.*|.*balance.*', re.I)):
            text = section.get_text()
            if "current ratio" in text.lower():
                numbers = re.findall(r'[\d,]+\.?\d+', text)
                if numbers:
                    alternative_data['current_ratio'] = numbers[-1]
                    break

        # Try to find Debt to Equity in balance sheet section
        for section in soup.find_all(["section", "div"], class_=re.compile(r'.*balance.*|.*debt.*|.*financial.*', re.I)):
            text = section.get_text()
            if "debt" in text.lower() and "equity" in text.lower():
                numbers = re.findall(r'[\d,]+\.?\d+', text)
                if numbers:
                    alternative_data['debt_to_equity'] = numbers[-1]
                    break

        # Try to find Industry PE in comparison sections
        for section in soup.find_all(["div", "section"]):
            text = section.get_text()
            if "industry" in text.lower() and ("p/e" in text.lower() or "pe" in text.lower()):
                numbers = re.findall(r'[\d,]+\.?\d+', text)
                if numbers:
                    alternative_data['industry_pe'] = numbers[-1]
                    break

        return alternative_data

    except Exception as e:
        logger.error(f"Error in alternative data fetch: {str(e)}")
        return {}

# Function to fetch stock data from Screener.in
def fetch_stock_data(symbol):
    try:
        # Build Screener.in URL for the stock
        url = f"https://www.screener.in/company/{symbol}/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        response = requests.get(url, headers=headers, timeout=10)

        # Check if the stock page exists (Screener.in returns 404 for invalid symbols)
        if response.status_code == 404:
            return {"error": "Stock symbol not found"}

        # Parse HTML content
        soup = BeautifulSoup(response.text, "html.parser")

        # Extract company name from h1 tag
        name_tag = soup.find("h1")
        name = name_tag.text.strip() if name_tag else "N/A"

        # Additional validation: Check if we're actually on a stock page
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
                roe = clean_percentage_value(value.text.strip())
                break

        # IMPROVED METRICS EXTRACTION WITH MULTIPLE PATTERNS AND ALTERNATIVES

        # Extract Promoter Holding % - multiple search patterns
        promoter_holding = extract_metric_value(
            soup,
            [["Promoters"], ["Promoter holding"], ["Promoter Holding"], ["Promoter"]]
        )

        # Extract Change in Promoter Holding % - multiple search patterns  
        promoter_change = extract_metric_value(
            soup,
            [["Change in promoter holding"], ["Chg in promoter holding"], 
             ["Promoter change"], ["Change in Promoters"], ["promoter holding change"]]
        )

        # Extract FII Holding % - multiple search patterns
        fii_holding = extract_metric_value(
            soup,
            [["FII"], ["Foreign"], ["FPI"], ["Foreign Institutional"], ["Foreign Portfolio"]]
        )

        # Extract Industry P/E - multiple search patterns
        industry_pe = extract_metric_value(
            soup,
            [["Industry P/E"], ["Industry PE"], ["Sector P/E"], ["Sector PE"], ["Peer P/E"]]
        )

        # Extract Current Ratio - multiple search patterns
        current_ratio = extract_metric_value(
            soup,
            [["Current ratio"], ["Current Ratio"], ["Liquidity Ratio"]]
        )

        # Extract Book Value per Share - multiple search patterns
        book_value = extract_metric_value(
            soup,
            [["Book value"], ["Book Value"], ["Book value per share"]]
        )

        # Extract Dividend Yield - multiple search patterns
        dividend_yield = extract_metric_value(
            soup,
            [["Dividend yield"], ["Dividend Yield"], ["Div Yield"]]
        )

        # Extract Debt to Equity ratio - multiple search patterns
        debt_to_equity = extract_metric_value(
            soup,
            [["Debt to equity"], ["D/E"], ["Debt-to-equity"], ["Debt/Equity"], ["DE Ratio"]]
        )

        # Try alternative data sources for missing values
        alternative_data = get_alternative_financial_data(symbol)

        # Fill in missing values from alternative sources
        if current_ratio == "N/A" and 'current_ratio' in alternative_data:
            current_ratio = alternative_data['current_ratio']

        if debt_to_equity == "N/A" and 'debt_to_equity' in alternative_data:
            debt_to_equity = alternative_data['debt_to_equity']

        if industry_pe == "N/A" and 'industry_pe' in alternative_data:
            industry_pe = alternative_data['industry_pe']

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

        # Return structured stock data (EXISTING DATA + IMPROVED NEW METRICS)
        return {
            # Existing metrics (keeping exactly as they were)
            "name": name,
            "price": price,
            "pe_ratio": pe_ratio,
            "roe": roe,
            "market_cap": market_cap,
            "logo": logo_url,
            "link": url,

            # Improved new metrics extraction (cleaned values)
            "promoter_holding": promoter_holding,
            "promoter_change": promoter_change,
            "fii_holding": fii_holding,
            "industry_pe": industry_pe,
            "current_ratio": current_ratio,
            "book_value": book_value,
            "dividend_yield": dividend_yield,
            "debt_to_equity": debt_to_equity
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
