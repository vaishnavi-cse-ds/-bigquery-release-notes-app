# BigQuery Release Notes Hub

An interactive, premium web application that fetches Google BigQuery release notes and lets you select, customize, and share them on X (Twitter) instantly.

---

## 🛠️ Tools & Softwares Used

Here is a breakdown of the technologies, libraries, and tools used to build this application:

### 1. Backend (Python Server)
*   **Python (v3.14.3)**: The core programming language used to build the server logic.
*   **Flask (v3.1.3)**: A lightweight WSGI web application framework in Python, used to serve the web pages and expose the JSON API endpoint.
*   **urllib (Standard Library)**: Python's built-in HTTP request library used to fetch the official Google Cloud BigQuery RSS/Atom XML feed.
*   **xml.etree.ElementTree (Standard Library)**: Python's built-in XML parsing library used to safely extract entries from the Atom feed.
*   **re (Standard Library)**: Python's regular expressions module used to parse nested `<h3>` headers (Features, Issues, Changes) in the HTML content, breaking a single day's updates into separate, selectable cards.

### 2. Frontend (User Interface)
*   **HTML5**: Semantic markup structuring the dashboard, sidebar filter controls, search bars, and the modal composer.
*   **CSS3**: Custom vanilla styling which provides:
    *   A premium dark theme with vibrant blue accents.
    *   Glassmorphism elements (`backdrop-filter`) for a modern feel.
    *   Responsive layouts using CSS Grid and Flexbox (collapsing into a mobile-friendly top navigation on smaller screens).
    *   Smooth transitions and micro-animations for cards, hover events, and spinner controls.
*   **Vanilla JavaScript**: Core logic for the client side:
    *   Fetches release notes from the Flask backend dynamically.
    *   Handles real-time, zero-latency search queries and category filtering.
    *   Manages the state of checkbox multi-selections.
    *   Controls the custom Tweet composer modal, including character length limits and animating an **SVG progress ring** (blue/yellow/red) based on text constraints.
*   **Google Fonts (Outfit & Inter)**: Imported typography to replace browser defaults with clean, modern typefaces.
*   **FontAwesome Icons (v6.4.0)**: Used for dashboard and status icons (refresh, database, tags, error, checkmarks).
*   **X (Twitter) Web Intents**: The official web intent URL mechanism used to securely redirect users to write and post tweets without requiring third-party API integration or developer keys.

### 3. Development & Version Control Tools
*   **Windows PowerShell**: The command-line interface used to set up the environment, run installations, and launch the server.
*   **Windows Package Manager (winget)**: Used to quickly download and install Git on the local machine.
*   **Git**: Version control software used to track changes, initialize the repository, and make commits.
*   **GitHub**: Hosting service for git repositories to publish the source code online.

---

## 🚀 How to Run the Application

1. **Install Python Dependencies**:
   Open PowerShell in the project directory and run:
   ```powershell
   python -m pip install -r requirements.txt
   ```

2. **Start the Flask Server**:
   ```powershell
   python app.py
   ```

3. **Open the Web Interface**:
   Go to your web browser and open:
   👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**
