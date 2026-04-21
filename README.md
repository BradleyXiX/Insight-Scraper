# Insight Scraper

[![Python](https://img.shields.io/badge/Python-3.x-blue.svg)](https://www.python.org/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-blue.svg)](https://www.docker.com/)
[![Built with Streamlit](https://img.shields.io/badge/Streamlit-Framework-FF4B4B.svg)](https://streamlit.io/)
[![Playwright](https://img.shields.io/badge/Playwright-Automation-2EAD33.svg)](https://playwright.dev/python/)

Insight Scraper is a robust, high-performance Python-based lead generation tool specifically engineered to extract valuable business leads from online directories in Kenya. Leveraging an asynchronous architecture with [Playwright](https://playwright.dev/python/) and front-end interface built with [Streamlit](https://streamlit.io/), the application efficiently bypasses standard scraping blockers while providing an intuitive, user-friendly dashboard.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation and Deployment](#installation-and-deployment)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Intuitive Dashboard:** A responsive, web-based UI powered by Streamlit for submitting queries and visualizing data.
- **Asynchronous Data Extraction:** Employs Playwright for asynchronous, concurrent web scraping, ensuring high speed and reliability even on JavaScript-heavy websites.
- **Automated Export Capability:** One-click functionality to export generated leads consistently into CSV format for CRM importing and external analysis.
- **Containerized Environment:** Fully Dockerized for rapid deployment, guaranteeing uniform execution environments and resolving cross-platform dependencies out-of-the-box.

## Architecture

Insight Scraper is built using the following core technologies:

- **Frontend:** Streamlit 
- **Web Scraping Engine:** Playwright (Chromium headless), BeautifulSoup4
- **Data Transformation:** Pandas
- **Infrastructure:** Docker

## Prerequisites

Ensure you have the following installed on your system:
- [Docker Engine](https://docs.docker.com/get-docker/) (handles all application dependencies including Chromium binaries)

## Installation and Deployment

**1. Clone the repository**
```bash
git clone https://github.com/your-username/insight-scraper.git
cd insight-scraper
```

**2. Build the Docker image**
```bash
docker build -t insight-scraper .
```

**3. Run the application container**
```bash
docker run -p 8501:8501 insight-scraper
```

**4. Access the dashboard**
Navigate to `http://localhost:8501` in your preferred web browser.

## Usage

1. Launch the application via Docker and navigate to the local dashboard address.
2. In the **Search Parameters** sidebar, enter your target industry or niche (e.g., *Real Estate Agencies*, *Law Firms*).
3. Select **Generate Leads** to initiate the scraping process.
4. Review the extracted data in the interactive table on the main dashboard.
5. Click **Download Leads as CSV** to save the dataset to your local machine.

## Project Structure

```text
insight-scraper/
├── Dockerfile                  # Container build instructions
├── .dockerignore               # Docker context exclusion rules
├── README.md                   # Project documentation
└── app/
    ├── dashboard.py            # Streamlit user interface definitions
    ├── main.py                 # Core routing and asynchronous task delegation
    ├── scraper_worker.py       # Isolated Playwright scraper process
    └── requirements.txt        # Python dependency manifest
```

## Contributing

Contributions are welcome. Please adhere to the following guidelines:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/NewFeature`).
3. Commit your changes (`git commit -m 'Add NewFeature'`).
4. Push to the branch (`git push origin feature/NewFeature`).
5. Open a Pull Request.

## License

This project is licensed under the MIT License.
