"""
Main UI dashboard for Insight Scraper.

This module provides the Streamlit frontend interface to accept user 
queries, trigger the asynchronous backend scraping process, and 
display the structured results.
"""
import streamlit as st
import pandas as pd
from main import get_nairobi_leads

st.set_page_config(page_title="InsightScraper Pro", page_icon="📈")

st.title("🚀 InsightScraper Lead-Gen Dashboard")
st.markdown("Find high-value business leads in Nairobi instantly.")

# Sidebar for Query Configuration
with st.sidebar:
    st.header("Search Parameters")
    query = st.text_input("What niche are you targeting?", placeholder="e.g. Law Firms")
    search_button = st.button("Generate Leads")

# Execute scraping process and handle response
if search_button:
    if query:
        with st.spinner(f"Scraping the latest leads for '{query}'..."):
            df = get_nairobi_leads(query)
            
            if not df.empty:
                st.success(f"Found {len(df)} new leads!")
                
                # Render interactive data table
                st.dataframe(df, width='stretch')
                
                # Provide CSV export functionality
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