# Insight Scraper 🚀

**Insight Scraper** is a high-performance Python-based lead generation tool tailored for extracting high-value business leads from Nairobi/Kenya online directories. It uses a modern architecture with **Streamlit** for the frontend dashboard and asynchronous **Playwright** + **BeautifulSoup4** for efficient and robust web scraping. 

## ✨ Features
- **Modern User Dashboard**: A clean and interactive UI built with Streamlit.
- **Asynchronous Scraping**: Utilizes Playwright to navigate JavaScript-heavy sites and extract data concurrently and efficiently.
- **Data Export**: Easily download generated leads as a CSV file for your CRM or outreach campaigns.
- **Dockerized Environment**: Quick and consistent deployment without worrying about local dependency or browser binary issues.

## 🛠️ Built With
- **Python 3.x**
- [**Streamlit**](https://streamlit.io/): Frontend dashboard.
- [**Playwright**](https://playwright.dev/python/): Browser automation to avoid blocks.
- [**BeautifulSoup4**](https://www.crummy.com/software/BeautifulSoup/): Fast HTML parsing.
- [**Pandas**](https://pandas.pydata.org/): Data manipulation and structuring into tables.

## 🚀 Getting Started

### Prerequisites
Make sure you have [Docker](https://docs.docker.com/get-docker/) installed on your system. Docker will handle all Python dependencies alongside Playwright's required chromium binaries.

### Installation & Running

1. **Clone the repository** (or navigate to the project directory):
   ```bash
   cd insight-scraper
   ```

2. **Build the Docker Image**:
   ```bash
   docker build -t insight-scraper .
   ```

3. **Run the Application**:
   ```bash
   docker run -p 8501:8501 insight-scraper
   ```

4. **Access the Dashboard**:
   Open a web browser and go to `http://localhost:8501` to start generating leads!

## 💡 Usage Example
1. Open the dashboard.
2. In the sidebar, type a target niche (e.g., *Law Firms*, *Restaurants*).
3. Click on the **Generate Leads** button.
4. Preview the extracted data in the interactive table or click **Download Leads as CSV** to save it locally.

## 📝 Project Structure
```text
insight-scraper/
├── Dockerfile                  # Instructions to build the Docker image
├── .dockerignore               # Files to ignore in the Docker context
├── README.md                   # Project documentation
└── app/
    ├── dashboard.py            # Streamlit frontend application
    ├── main.py                 # Coordinator logic for worker scripts
    ├── scraper_worker.py       # Asynchronous Playwright scraping script
    └── requirements.txt        # Python package dependencies
```
