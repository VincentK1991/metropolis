# Web Search and PDF Report Generation with Charts and Tables

## Overview

This guide demonstrates how to perform web searches, gather information, and generate professional PDF reports with charts and tables using Python. This workflow is useful for creating research reports, market analysis documents, and data-driven presentations with visualizations.

## High-Level Flow

```
1. Perform web search to gather information
2. Fetch and extract content from relevant URLs
3. Process and structure the gathered data
4. Create visualizations (charts, graphs, tables)
5. Generate PDF with formatted text and embedded visuals
6. Clean up temporary files
```

## Installation (if not already installed in virtual env.)

```bash
# Install required packages
uv add reportlab matplotlib pillow
```

## Part 1: Web Search and Data Gathering

### Step 1: Perform Web Search

Use the `WebSearch` tool or library to search for relevant information:

```python
# Using WebSearch tool in Claude Code
# Query for specific topic
query = "K-shaped recovery USA economy 2025"

# Results include:
# - Titles and URLs of relevant articles
# - Brief descriptions
# - Publication dates
```

### Step 2: Fetch Content from URLs

Extract detailed information from the most relevant sources:

```python
# Using WebFetch tool
from web_tools import fetch_url_content

urls = [
    "https://www.example.com/article1",
    "https://www.example.com/article2",
]

content = []
for url in urls:
    data = fetch_url_content(
        url=url,
        prompt="Extract key statistics, trends, and findings"
    )
    content.append(data)
```

### Step 3: Structure Your Data

Organize the gathered information into a structured format:

```python
report_data = {
    "title": "K-Shaped Recovery in the USA",
    "sections": [
        {
            "heading": "Executive Summary",
            "content": "...",
        },
        {
            "heading": "Current State",
            "content": "...",
            "data": {
                "spending_top_10": 49,
                "spending_top_20": 63,
                "delinquency_student": 10.2,
                "delinquency_credit": 8.9,
            }
        }
    ],
    "sources": [
        "NPR. Article title. Date.",
        "CNN. Article title. Date.",
    ]
}
```

## Part 2: Creating Visualizations

### Step 1: Set Up Matplotlib

```python
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend for server/script use
```

### Step 2: Create Bar Charts

```python
# Create a bar chart
fig, ax = plt.subplots(figsize=(6, 4))

# Data
categories = ['Top 10%', 'Top 20%', 'Bottom 80%']
values = [49, 63, 37]
colors = ['#2ecc71', '#3498db', '#e74c3c']

# Create bars
bars = ax.bar(categories, values, color=colors, edgecolor='black', linewidth=1.2)

# Styling
ax.set_ylabel('Share of Total Spending (%)', fontsize=11, fontweight='bold')
ax.set_xlabel('Income Group', fontsize=11, fontweight='bold')
ax.set_title('Spending Concentration by Income Group', fontsize=13, fontweight='bold')
ax.set_ylim(0, 70)
ax.grid(axis='y', alpha=0.3, linestyle='--')

# Add value labels on bars
for bar in bars:
    height = bar.get_height()
    ax.text(bar.get_x() + bar.get_width()/2., height,
            f'{height}%', ha='center', va='bottom', fontweight='bold')

# Save chart
plt.tight_layout()
plt.savefig('spending_chart.png', dpi=150, bbox_inches='tight')
plt.close()
```

### Step 3: Create Pie Charts

```python
# Create a pie chart
fig, ax = plt.subplots(figsize=(6, 6))

# Data
labels = ['Top 10%', 'Top 11-20%', 'Next 20%', 'Bottom 50%']
sizes = [65, 18, 12, 5]
colors = ['#2ecc71', '#3498db', '#f39c12', '#e74c3c']

# Create pie chart
wedges, texts, autotexts = ax.pie(
    sizes,
    labels=labels,
    autopct='%1.0f%%',
    colors=colors,
    startangle=90,
    textprops={'fontsize': 10}
)

# Style percentage labels
for autotext in autotexts:
    autotext.set_color('white')
    autotext.set_fontweight('bold')
    autotext.set_fontsize(11)

ax.set_title('Wealth Distribution', fontsize=13, fontweight='bold', pad=20)

plt.tight_layout()
plt.savefig('wealth_pie.png', dpi=150, bbox_inches='tight')
plt.close()
```

### Step 4: Create Comparison Charts with Reference Lines

```python
# Bar chart with reference line
fig, ax = plt.subplots(figsize=(6, 4))

categories = ['Student\nLoans', 'Credit\nCards', 'Auto\nLoans']
values = [10.2, 8.9, 7.6]
colors = ['#e74c3c', '#e67e22', '#f39c12']

# Create bars
bars = ax.bar(categories, values, color=colors, edgecolor='black', linewidth=1.2)

# Add reference line
ax.axhline(y=5, color='green', linestyle='--', linewidth=2,
           label='Pre-Pandemic Average', alpha=0.7)

# Styling
ax.set_ylabel('Delinquency Rate (%)', fontsize=11, fontweight='bold')
ax.set_xlabel('Debt Type', fontsize=11, fontweight='bold')
ax.set_title('Debt Delinquency Rates', fontsize=13, fontweight='bold')
ax.set_ylim(0, 12)
ax.grid(axis='y', alpha=0.3, linestyle='--')
ax.legend(loc='upper right')

# Add value labels
for bar in bars:
    height = bar.get_height()
    ax.text(bar.get_x() + bar.get_width()/2., height,
            f'{height}%', ha='center', va='bottom', fontweight='bold')

plt.tight_layout()
plt.savefig('delinquency_chart.png', dpi=150, bbox_inches='tight')
plt.close()
```

## Part 3: Creating PDF with ReportLab

### Step 1: Set Up PDF Document

```python
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image, Table, TableStyle
from reportlab.lib import colors
from datetime import datetime

# Create PDF document
pdf_filename = "report.pdf"
doc = SimpleDocTemplate(
    pdf_filename,
    pagesize=letter,
    rightMargin=72,
    leftMargin=72,
    topMargin=72,
    bottomMargin=18
)

# Container for content
elements = []
```

### Step 2: Define Custom Styles

```python
styles = getSampleStyleSheet()

# Add custom styles
styles.add(ParagraphStyle(
    name='Justify',
    alignment=TA_JUSTIFY,
    fontSize=11,
    leading=14
))

styles.add(ParagraphStyle(
    name='TitleCustom',
    fontSize=24,
    leading=28,
    alignment=TA_CENTER,
    textColor=colors.HexColor('#1a1a1a'),
    spaceAfter=30,
    fontName='Helvetica-Bold'
))

styles.add(ParagraphStyle(
    name='Heading1Custom',
    fontSize=16,
    leading=20,
    alignment=TA_LEFT,
    textColor=colors.HexColor('#2c3e50'),
    spaceAfter=12,
    spaceBefore=12,
    fontName='Helvetica-Bold'
))

styles.add(ParagraphStyle(
    name='Caption',
    fontSize=9,
    leading=11,
    alignment=TA_CENTER,
    textColor=colors.HexColor('#666666'),
    spaceAfter=12,
    fontStyle='italic'
))
```

### Step 3: Add Title and Metadata

```python
# Title
title = Paragraph("Report Title", styles['TitleCustom'])
elements.append(title)
elements.append(Spacer(1, 0.2*inch))

# Date
date_text = Paragraph(
    f"<i>Report Generated: {datetime.now().strftime('%B %d, %Y')}</i>",
    styles['Normal']
)
elements.append(date_text)
elements.append(Spacer(1, 0.3*inch))
```

### Step 4: Add Text Content

```python
# Section heading
elements.append(Paragraph("1. Introduction", styles['Heading1Custom']))

# Body text
intro_text = """This report presents findings from recent research on economic
trends. The analysis reveals significant patterns in consumer behavior and
spending distribution across different income groups."""
elements.append(Paragraph(intro_text, styles['Justify']))
elements.append(Spacer(1, 0.3*inch))
```

### Step 5: Add Bullet Points

```python
# Important: ReportLab allows only ONE <bullet> tag per paragraph
# Create separate paragraphs for each bullet point

bullet_points = [
    "<bullet>&bull;</bullet> <b>Key Finding 1:</b> Description of first finding",
    "<bullet>&bull;</bullet> <b>Key Finding 2:</b> Description of second finding",
    "<bullet>&bull;</bullet> <b>Key Finding 3:</b> Description of third finding"
]

for point in bullet_points:
    elements.append(Paragraph(point, styles['Normal']))

elements.append(Spacer(1, 0.3*inch))
```

### Step 6: Add Images (Charts)

```python
# Add chart image
img = Image('spending_chart.png', width=5*inch, height=3.33*inch)
elements.append(img)

# Add caption
caption = Paragraph(
    "Figure 1: Consumer spending distribution by income group",
    styles['Caption']
)
elements.append(caption)
elements.append(Spacer(1, 0.3*inch))
```

### Step 7: Add Tables

```python
# Create table data
table_data = [
    ['Category', 'Value 1', 'Value 2', 'Status'],
    ['Group A', '$100M', '25%', 'Growing'],
    ['Group B', '$75M', '18%', 'Stable'],
    ['Group C', '$50M', '12%', 'Declining'],
]

# Define column widths
col_widths = [1.5*inch, 1.3*inch, 1.3*inch, 1.5*inch]

# Create table
table = Table(table_data, colWidths=col_widths)

# Style the table
table.setStyle(TableStyle([
    # Header row styling
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#34495e')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 11),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),

    # Data rows styling
    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
    ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
    ('FONTSIZE', (0, 1), (-1, -1), 10),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
]))

elements.append(table)
elements.append(Paragraph("Table 1: Summary statistics by category", styles['Caption']))
elements.append(Spacer(1, 0.3*inch))
```

### Step 8: Add Page Breaks

```python
# Add page break between major sections
elements.append(PageBreak())
```

### Step 9: Build and Save PDF

```python
# Build the PDF
doc.build(elements)
print(f"PDF generated: {pdf_filename}")
```

## Complete Example

```python
#!/usr/bin/env python3
"""Generate a PDF report with charts and tables"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib import colors
from datetime import datetime
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')

def create_bar_chart(filename, categories, values, title, ylabel):
    """Create and save a bar chart"""
    fig, ax = plt.subplots(figsize=(6, 4))

    colors_list = ['#2ecc71', '#3498db', '#e74c3c']
    bars = ax.bar(categories, values, color=colors_list, edgecolor='black', linewidth=1.2)

    ax.set_ylabel(ylabel, fontsize=11, fontweight='bold')
    ax.set_title(title, fontsize=13, fontweight='bold')
    ax.grid(axis='y', alpha=0.3, linestyle='--')

    for bar in bars:
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height,
                f'{height}%', ha='center', va='bottom', fontweight='bold')

    plt.tight_layout()
    plt.savefig(filename, dpi=150, bbox_inches='tight')
    plt.close()

def create_pdf_report(output_filename, title, sections, chart_files):
    """Create PDF report with text, charts, and tables"""

    # Setup document
    doc = SimpleDocTemplate(output_filename, pagesize=letter,
                           rightMargin=72, leftMargin=72,
                           topMargin=72, bottomMargin=18)
    elements = []
    styles = getSampleStyleSheet()

    # Custom styles
    styles.add(ParagraphStyle(
        name='TitleCustom',
        fontSize=24,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold',
        spaceAfter=30
    ))

    styles.add(ParagraphStyle(
        name='Heading1',
        fontSize=16,
        fontName='Helvetica-Bold',
        spaceAfter=12,
        spaceBefore=12
    ))

    # Add title
    elements.append(Paragraph(title, styles['TitleCustom']))
    elements.append(Spacer(1, 0.2*inch))

    # Add date
    date_str = f"<i>Generated: {datetime.now().strftime('%B %d, %Y')}</i>"
    elements.append(Paragraph(date_str, styles['Normal']))
    elements.append(Spacer(1, 0.3*inch))

    # Add sections
    for section in sections:
        elements.append(Paragraph(section['heading'], styles['Heading1']))
        elements.append(Paragraph(section['content'], styles['Normal']))
        elements.append(Spacer(1, 0.2*inch))

        # Add chart if specified
        if 'chart' in section:
            img = Image(section['chart'], width=5*inch, height=3.33*inch)
            elements.append(img)
            elements.append(Spacer(1, 0.3*inch))

    # Build PDF
    doc.build(elements)
    print(f"PDF created: {output_filename}")

# Usage example
if __name__ == "__main__":
    # Create chart
    create_bar_chart(
        'chart.png',
        categories=['Group A', 'Group B', 'Group C'],
        values=[45, 35, 20],
        title='Distribution by Group',
        ylabel='Percentage (%)'
    )

    # Create PDF
    sections = [
        {
            'heading': '1. Overview',
            'content': 'This report analyzes key trends in the data.',
        },
        {
            'heading': '2. Findings',
            'content': 'The analysis reveals significant patterns.',
            'chart': 'chart.png'
        }
    ]

    create_pdf_report(
        'report.pdf',
        'Analysis Report',
        sections,
        ['chart.png']
    )
```

## Best Practices

### 1. Use Virtual Environments

Always activate your virtual environment when using installed packages:

```bash
# Using uv virtual environment
source .venv/bin/activate && python3 script.py

# Or directly
.venv/bin/python3 script.py
```

### 2. Choose Appropriate Chart Types

- **Bar charts**: Comparing discrete categories
- **Pie charts**: Showing parts of a whole (percentages)
- **Line charts**: Showing trends over time
- **Scatter plots**: Showing relationships between variables

### 3. Consistent Color Schemes

Use a consistent color palette throughout your report:

```python
# Define color palette at the start
COLOR_PALETTE = {
    'primary': '#2ecc71',    # Green
    'secondary': '#3498db',  # Blue
    'accent': '#e74c3c',     # Red
    'neutral': '#95a5a6',    # Gray
}
```

### 4. Set DPI for Print Quality

```python
# For screen viewing
plt.savefig('chart.png', dpi=100)

# For print quality
plt.savefig('chart.png', dpi=150)

# For high-quality print
plt.savefig('chart.png', dpi=300)
```

### 5. Clean Up Temporary Files

```python
import os

# After building PDF, remove temporary chart files
temp_files = ['chart1.png', 'chart2.png', 'chart3.png']
for file in temp_files:
    if os.path.exists(file):
        os.remove(file)
```

### 6. Handle Bullet Points Correctly

ReportLab allows only ONE `<bullet>` tag per paragraph:

```python
# ✓ Correct - separate paragraphs
bullet_points = [
    "<bullet>&bull;</bullet> Point one",
    "<bullet>&bull;</bullet> Point two",
]
for point in bullet_points:
    elements.append(Paragraph(point, styles['Normal']))

# ✗ Wrong - multiple bullets in one paragraph
text = """<bullet>&bull;</bullet> Point one<br/>
<bullet>&bull;</bullet> Point two"""  # Will cause error
elements.append(Paragraph(text, styles['Normal']))
```

### 7. Size Images Appropriately

```python
# Maintain aspect ratio
# For 6x4 chart: width=6, height=4, ratio=1.5
width_in_pdf = 5*inch
height_in_pdf = (5/1.5)*inch  # Maintains aspect ratio

img = Image('chart.png', width=width_in_pdf, height=height_in_pdf)
```

## Common Pitfalls

### 1. Forgetting to Use Agg Backend

```python
# ✗ Wrong - may cause issues in non-GUI environments
import matplotlib.pyplot as plt

# ✓ Correct - use non-interactive backend
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
```

### 2. Not Closing Matplotlib Figures

```python
# ✗ Wrong - memory leak
plt.savefig('chart.png')
# Next figure...

# ✓ Correct - close after saving
plt.savefig('chart.png')
plt.close()
```

### 3. Incorrect Image Paths

```python
# ✗ Wrong - relative path might not work
img = Image('../charts/chart.png', width=5*inch, height=3*inch)

# ✓ Correct - use absolute path or ensure working directory
import os
chart_path = os.path.abspath('chart.png')
img = Image(chart_path, width=5*inch, height=3*inch)
```

### 4. Table Width Overflow

```python
# ✗ Wrong - table might overflow page
table = Table(data)  # No width specified

# ✓ Correct - specify column widths that fit the page
# Letter page width = 8.5 inches, minus margins (72pt each) = 6.5 inches
col_widths = [1.5*inch, 1.5*inch, 1.5*inch, 2*inch]  # Total = 6.5 inches
table = Table(data, colWidths=col_widths)
```

### 5. Multiple Bullet Tags in One Paragraph

```python
# ✗ Wrong - causes ValueError
text = "<bullet>&bull;</bullet> Point 1<br/><bullet>&bull;</bullet> Point 2"
elements.append(Paragraph(text, styles['Normal']))

# ✓ Correct - one bullet per paragraph
for point in ["Point 1", "Point 2"]:
    elements.append(Paragraph(f"<bullet>&bull;</bullet> {point}", styles['Normal']))
```

## Advanced Techniques

### 1. Multi-Column Tables

```python
# Create table with merged cells
table_data = [
    ['Category', 'Q1', 'Q2', 'Q3', 'Q4'],
    ['Revenue', '$1M', '$1.2M', '$1.5M', '$1.8M'],
    ['Expenses', '$800K', '$850K', '$900K', '$950K'],
]

table = Table(table_data)
table.setStyle(TableStyle([
    # Merge cells for title row
    ('SPAN', (0, 0), (4, 0)),
    ('ALIGN', (0, 0), (4, 0), 'CENTER'),
]))
```

### 2. Custom Table Cell Colors

```python
# Color specific cells based on values
table.setStyle(TableStyle([
    # Color header
    ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),

    # Color specific cell (row 1, col 1)
    ('BACKGROUND', (1, 1), (1, 1), colors.lightgreen),

    # Color range of cells
    ('BACKGROUND', (0, 2), (2, 4), colors.lightyellow),
]))
```

### 3. Add Watermarks

```python
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

def add_watermark(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 60)
    canvas.setFillGray(0.9, 0.5)  # Light gray, 50% opacity
    canvas.rotate(45)
    canvas.drawString(2*inch, 0, "DRAFT")
    canvas.restoreState()

# Use with build
doc.build(elements, onFirstPage=add_watermark)
```

### 4. Dynamic Chart Colors Based on Values

```python
def get_color_by_value(value, threshold):
    """Return color based on value threshold"""
    return '#2ecc71' if value >= threshold else '#e74c3c'

values = [75, 45, 90, 30]
colors = [get_color_by_value(v, 50) for v in values]

plt.bar(categories, values, color=colors)
```

## Troubleshooting

### Issue: Charts not appearing in PDF

**Solution**: Verify image files exist before adding to PDF:

```python
import os

if os.path.exists('chart.png'):
    img = Image('chart.png', width=5*inch, height=3.33*inch)
    elements.append(img)
else:
    print("Warning: chart.png not found")
```

### Issue: Table text wrapping incorrectly

**Solution**: Use narrower columns or smaller font:

```python
table.setStyle(TableStyle([
    ('FONTSIZE', (0, 0), (-1, -1), 9),  # Smaller font
    ('WORDWRAP', (0, 0), (-1, -1), True),  # Enable word wrap
]))
```

### Issue: PDF file is too large

**Solution**: Reduce image DPI or compress:

```python
# Lower DPI
plt.savefig('chart.png', dpi=100)  # Instead of 300

# Or optimize with PIL
from PIL import Image
img = Image.open('chart.png')
img.save('chart.png', optimize=True, quality=85)
```

### Issue: Matplotlib font warnings

**Solution**: Use standard fonts or install font packages:

```python
# Use safe fonts
plt.rcParams['font.family'] = 'DejaVu Sans'

# Or suppress warnings
import warnings
warnings.filterwarnings('ignore', category=UserWarning)
```

## Summary

Creating PDF reports with web-searched data involves:

1. **Search and gather** data using web search tools
2. **Extract and structure** information from sources
3. **Create visualizations** using matplotlib (bar, pie, line charts)
4. **Build PDF** with ReportLab (text, tables, images)
5. **Style consistently** with custom paragraph styles and colors
6. **Clean up** temporary files after generation

Key points to remember:
- Use `matplotlib.use('Agg')` for non-GUI environments
- One `<bullet>` tag per paragraph in ReportLab
- Close matplotlib figures with `plt.close()` to avoid memory leaks
- Activate virtual environment when using installed packages
- Specify image sizes to maintain aspect ratios
- Clean up temporary chart files after PDF generation

This workflow enables automated generation of professional research reports with data visualizations directly from web sources.
