import os
import re
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template

app = Flask(__name__)

# BigQuery Release Notes RSS/Atom Feed URL
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def parse_entry_body(content_html):
    """
    Parses the HTML body of a release note entry and splits it into
    individual updates (headers and their following paragraphs/elements).
    """
    if not content_html:
        return []
    
    # We want to find <h3>[Type]</h3> and the subsequent HTML content
    # up until the next <h3> tag or the end of the content.
    # We use a lookahead assertion to stop at the next h3 tag.
    pattern = re.compile(r'<h3[^>]*>(.*?)</h3>(.*?)(?=<h3[^>]*>|$)', re.DOTALL | re.IGNORECASE)
    matches = pattern.findall(content_html)
    
    updates = []
    for type_text, body_text in matches:
        clean_type = type_text.strip()
        clean_body = body_text.strip()
        
        # Simple heuristic to strip wrapper tags if they just contain text,
        # but keep links and general structure intact
        updates.append({
            "type": clean_type,
            "body": clean_body
        })
        
    # Fallback if no <h3> tags were found but there is content
    if not updates and content_html.strip():
        updates.append({
            "type": "Update",
            "body": content_html.strip()
        })
        
    return updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    try:
        # Fetch the Atom feed using urllib to minimize external dependencies
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            xml_data = response.read()
            
        # Parse XML
        # Atom feed namespace
        namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
        root = ET.fromstring(xml_data)
        
        feed_title = root.find('atom:title', namespaces)
        feed_title_text = feed_title.text if feed_title is not None else "BigQuery Release Notes"
        
        releases = []
        for entry in root.findall('atom:entry', namespaces):
            title = entry.find('atom:title', namespaces)
            title_text = title.text if title is not None else ""
            
            updated = entry.find('atom:updated', namespaces)
            updated_text = updated.text if updated is not None else ""
            
            # Find alternate link
            link = entry.find('atom:link[@rel="alternate"]', namespaces)
            if link is None:
                link = entry.find('atom:link', namespaces)
            link_href = link.attrib.get('href', '') if link is not None else ""
            
            content = entry.find('atom:content', namespaces)
            content_html = content.text if content is not None else ""
            
            # Extract distinct updates (e.g. Features, Fixes) inside the entry
            updates = parse_entry_body(content_html)
            
            releases.append({
                "date": title_text,
                "updated": updated_text,
                "link": link_href,
                "updates": updates
            })
            
        return jsonify({
            "success": True,
            "title": feed_title_text,
            "releases": releases
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    # Start the server on port 5000
    app.run(debug=True, port=5000)
