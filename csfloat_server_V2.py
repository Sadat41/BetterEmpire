from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from urllib.parse import quote_plus

# Flask app setup
app = Flask(__name__)
CORS(app)

# CSFloat API configuration
CSFLOAT_API_KEY = "Your_Token_Here"
CSFLOAT_API_URL = "https://csfloat.com/api/v1/listings"


@app.route('/fetch_csfloat_price', methods=['GET'])
def fetch_csfloat_price():
    market_hash_name = request.args.get('market_hash_name', '').strip()
    if not market_hash_name:
        return jsonify({"error": "market_hash_name is required"}), 400

    try:
        # Properly encode the market_hash_name
        # Leave spaces intact but encode `|` and parentheses properly
        encoded_market_hash_name = market_hash_name.replace(" | ", " %7C ").replace(" ", "%20")
        api_url = f"{CSFLOAT_API_URL}?market_hash_name={encoded_market_hash_name}&sort_by=lowest_price&limit=1"
        print(f"Requesting CSFloat API with URL: {api_url}")

        # Make the API request
        response = requests.get(api_url, headers={"Authorization": CSFLOAT_API_KEY})
        response.raise_for_status()  # Raise error for HTTP issues

        # Parse the response
        data = response.json().get("data", [])
        if not data:
            print(f"No listings found for: {market_hash_name}")
            return jsonify({"price": "No Listings", "market_hash_name": market_hash_name}), 404

        # Find the lowest price listing
        lowest_price_listing = min(data, key=lambda x: x["price"])
        price = lowest_price_listing["price"] / 100  # Convert cents to USD
        float_value = lowest_price_listing["item"].get("float_value", "N/A")
        inspect_link = lowest_price_listing["item"].get("inspect_link", "N/A")

        return jsonify({
            "price": f"{price:.2f}",
            "market_hash_name": market_hash_name,
            "float_value": float_value,
            "inspect_link": inspect_link
        })

    except requests.exceptions.RequestException as e:
        print(f"CSFloat API request error: {e}")
        return jsonify({"error": str(e)}), 500


# Run the Flask app
if __name__ == "__main__":
    app.run(debug=True, port=5001)  # Run on a different port (5001)
