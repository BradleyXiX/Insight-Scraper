import streamlit as st
import pandas as pd
from main import get_nairobi_leads # Importing your scraper function

# 1. Page Configuration (The 'Identity' of your Agency tool)
st.set_page_config(page_title="InsightScraper Pro", page_icon="📈")

st.title("🚀 InsightScraper Lead-Gen Dashboard")
st.markdown("Find high-value business leads in Nairobi instantly.")

# 2. Sidebar for User Input
with st.sidebar:
    st.header("Search Parameters")
    query = st.text_input("What niche are you targeting?", placeholder="e.g. Law Firms")
    search_button = st.button("Generate Leads")

# 3. The Logic Flow
if search_button:
    if query:
        with st.spinner(f"Scraping the latest leads for '{query}'..."):
            # Call the scraper function we wrote in main.py
            df = get_nairobi_leads(query)
            
            if not df.empty:
                st.success(f"Found {len(df)} new leads!")
                
                # Display the data in a clean, interactive table
                st.dataframe(df, use_container_width=True)
                
                # 4. Export Feature: Download as CSV (A value-add for clients)
                csv = df.to_csv(index=False).encode('utf-8')
                st.download_button(
                    label="Download Leads as CSV",
                    data=csv,
                    file_name=f"{query}_leads.csv",
                    mime="text/csv",
                )
            else:
                st.warning("No leads found. Try a different search term.")
    else:
        st.error("Please enter a niche to search for.")