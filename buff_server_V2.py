from flask import Flask, request, jsonify
from flask_cors import CORS
from buff163_unofficial_api import Buff163API
from time import time

# Flask app setup
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Buff163 API setup
cookie = (
    "Your_Buff_Cookie_Here" #Lookup online how to obtain Buff key
)
buff163api = Buff163API(session_cookie=cookie)

# In-memory cache
cache = {}
cache_ttl = 300  # Cache time-to-live in seconds

def get_from_cache(market_hash_name):
    """Retrieve cached response if not expired."""
    cached_item = cache.get(market_hash_name)
    if cached_item and time() - cached_item['timestamp'] < cache_ttl:
        return cached_item['response']
    return None

def save_to_cache(market_hash_name, response):
    """Save API response to cache."""
    cache[market_hash_name] = {
        'response': response,
        'timestamp': time()
    }

# Route to fetch price
@app.route('/fetch_price', methods=['GET'])
def fetch_price():
    market_hash_name = request.args.get('market_hash_name', '').strip()
    if not market_hash_name:
        return jsonify({"error": "market_hash_name is required"}), 400

    # Check cache first
    cached_response = get_from_cache(market_hash_name)
    if cached_response:
        return jsonify(cached_response)

    try:
        # Fetch data from Buff163 API
        response = buff163api._rest_adapter.get(
            endpoint=f"/market/goods?game=csgo&search={market_hash_name}"
        )
        items = response.data.get("data", {}).get("items", [])

        if not items:
            response = {"price": "No Listings", "market_hash_name": market_hash_name}
            save_to_cache(market_hash_name, response)
            return jsonify(response), 404

        # Extract the first item's price and details
        item = items[0]
        response = {
            "price": f"¥{item.get('sell_min_price', 'N/A')}",
            "market_hash_name": item.get("market_hash_name", "Unknown"),
            "goods_id": item.get("goods_id", "N/A")
        }

        # Save to cache
        save_to_cache(market_hash_name, response)
        return jsonify(response)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
