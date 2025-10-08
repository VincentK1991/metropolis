# PowerPoint Template Replacement Guide

## Overview

This guide demonstrates how to perform template replacement in PowerPoint presentations using the `python-pptx` library. Template replacement allows you to swap content from one company/entity to another while preserving all original formatting (fonts, colors, positions, sizes).

## High-Level Flow

```
1. Load the template presentation
2. Access the slide(s) to modify
3. Define text replacement mappings (old → new)
4. Iterate through all shapes in the slide
5. Replace text while preserving formatting
6. Save the modified presentation
```

## Installation

```bash
pip install python-pptx
# or with uv
uv add python-pptx
```

## Basic Template Replacement

### Step 1: Load the Template

```python
from pptx import Presentation

# Load the existing template
prs = Presentation('templates/company_template.pptx')

# Access the first slide (or iterate through multiple slides)
slide = prs.slides[0]
```

### Step 2: Define Replacements

Create a dictionary mapping old text to new text. Match character counts and structure for best results.

```python
replacements = {
    'Salesforce, Inc.': 'Atlassian Corporation',

    # Match structure and length closely
    '• Global CRM leader; FY25 revenue $37.9B (+9% YoY) with Customer 360 platform':
    '• Leading team collaboration platform; cloud-first transition driving growth',

    # Financial metrics
    '$13.1B': '$7.3B',
    'Operating Cash Flow (FY25) +28% YoY': 'Total Funding Raised',

    # More replacements...
}
```

### Step 3: Iterate and Replace Text

```python
# Iterate through all shapes in the slide
for shape in slide.shapes:
    # Check if shape has a text_frame (most text shapes)
    if hasattr(shape, 'text_frame'):
        text_frame = shape.text_frame

        # Iterate through paragraphs and runs
        for paragraph in text_frame.paragraphs:
            for run in paragraph.runs:
                # Perform replacements
                for old_text, new_text in replacements.items():
                    if old_text in run.text:
                        run.text = run.text.replace(old_text, new_text)

    # Some shapes use 'text' property directly
    elif hasattr(shape, 'text'):
        for old_text, new_text in replacements.items():
            if old_text in shape.text:
                shape.text = shape.text.replace(old_text, new_text)
```

### Step 4: Save the Result

```python
# Save to a new file
prs.save('output/new_presentation.pptx')
```

## Complete Example

```python
from pptx import Presentation

def replace_template_content(template_path, output_path, replacements):
    """
    Replace content in a PowerPoint template while preserving formatting.

    Args:
        template_path (str): Path to template .pptx file
        output_path (str): Path to save modified .pptx file
        replacements (dict): Dictionary of old_text -> new_text mappings
    """
    # Load template
    prs = Presentation(template_path)

    # Process each slide
    for slide in prs.slides:
        # Iterate through all shapes
        for shape in slide.shapes:
            if hasattr(shape, 'text_frame'):
                # Text frame shapes (most common)
                for paragraph in shape.text_frame.paragraphs:
                    for run in paragraph.runs:
                        for old_text, new_text in replacements.items():
                            if old_text in run.text:
                                run.text = run.text.replace(old_text, new_text)

            elif hasattr(shape, 'text'):
                # Direct text property
                for old_text, new_text in replacements.items():
                    if old_text in shape.text:
                        shape.text = shape.text.replace(old_text, new_text)

    # Save result
    prs.save(output_path)

# Usage
replacements = {
    'Company A': 'Company B',
    'CEO John Doe': 'CEO Jane Smith',
    '$100M revenue': '$150M revenue',
}

replace_template_content(
    'templates/original.pptx',
    'output/modified.pptx',
    replacements
)
```

## Advanced: Modifying Formatting

### Change Colors

```python
from pptx.dml.color import RGBColor

# Find shape and change fill color
for shape in slide.shapes:
    if hasattr(shape, 'text') and 'Key Products' in shape.text:
        if hasattr(shape, 'fill'):
            shape.fill.solid()
            shape.fill.fore_color.rgb = RGBColor(0, 112, 192)  # Blue
```

### Change Font Properties

```python
from pptx.util import Pt

for shape in slide.shapes:
    if hasattr(shape, 'text_frame'):
        for paragraph in shape.text_frame.paragraphs:
            for run in paragraph.runs:
                run.font.name = 'Arial'  # Change font
                run.font.size = Pt(14)   # Change size
                run.font.bold = True      # Make bold
```

### Change Position and Size

```python
from pptx.util import Inches

# Move shape
shape.top = Inches(0.5)    # Vertical position
shape.left = Inches(1.0)   # Horizontal position

# Resize shape
shape.width = Inches(5.0)
shape.height = Inches(2.0)
```

## Analyzing Templates

Before replacing content, analyze the template structure:

```python
from pptx import Presentation

prs = Presentation('template.pptx')

print(f'Number of slides: {len(prs.slides)}')

for i, slide in enumerate(prs.slides, 1):
    print(f'\n=== SLIDE {i} ===')
    print(f'Layout: {slide.slide_layout.name}')

    # Extract all text
    for shape in slide.shapes:
        if hasattr(shape, 'text') and shape.text:
            print(f'Text: {shape.text[:50]}...')

            # Check font properties
            if hasattr(shape, 'text_frame'):
                for para in shape.text_frame.paragraphs:
                    for run in para.runs:
                        print(f'  Font: {run.font.name}, Size: {run.font.size}')

    # Check for tables
    for shape in slide.shapes:
        if shape.has_table:
            print('[Table found]')

    # Check for charts
    for shape in slide.shapes:
        if shape.has_chart:
            print(f'[Chart found: {shape.chart.chart_type}]')
```

## Best Practices

### 1. Match Character Counts

When replacing text, try to match the character count of the original text to maintain visual consistency:

```python
# Good: Similar length
'Global CRM leader with $37B revenue' → 'Team collaboration platform $5B revenue'

# Less ideal: Very different length
'Global CRM leader' → 'Leading enterprise collaboration and project management software company'
```

### 2. Preserve Structure

Maintain bullet points, line breaks, and formatting:

```python
replacements = {
    '• Point one about topic A': '• Point one about topic B',
    '• Point two about topic A': '• Point two about topic B',
}
```

### 3. Use Consistent Fonts

Check the original template's fonts and use the same throughout:

```python
# Find the font used in template
original_font = None
for shape in slide.shapes:
    if hasattr(shape, 'text_frame'):
        for para in shape.text_frame.paragraphs:
            for run in para.runs:
                if run.font.name:
                    original_font = run.font.name
                    break

# Apply to modified text
run.font.name = original_font
```

### 4. Handle Missing Fonts Gracefully

When font.name returns `None`, it inherits from the theme. Set explicitly if needed:

```python
# Common professional fonts
default_fonts = ['DM Sans', 'Arial', 'Calibri', 'Helvetica']

for shape in slide.shapes:
    if hasattr(shape, 'text_frame'):
        for para in shape.text_frame.paragraphs:
            for run in para.runs:
                if run.font.name is None:
                    run.font.name = 'DM Sans'  # Set consistent font
```

## Common Pitfalls

### 1. Not Checking for text_frame vs text

Some shapes use `text_frame`, others use direct `text` property. Always check both:

```python
# ✓ Correct
if hasattr(shape, 'text_frame'):
    # Handle text_frame
elif hasattr(shape, 'text'):
    # Handle text property

# ✗ Incorrect - might miss some text
if hasattr(shape, 'text'):
    shape.text = shape.text.replace(old, new)  # May not work for all shapes
```

### 2. Losing Formatting with Direct text Assignment

```python
# ✗ Bad - loses all formatting
shape.text = "New text"

# ✓ Good - preserves formatting
for para in shape.text_frame.paragraphs:
    for run in para.runs:
        run.text = run.text.replace(old, new)
```

### 3. Not Handling Partial Matches

Be specific with replacements to avoid partial matches:

```python
# ✗ Bad - might replace in wrong places
replacements = {
    'Cloud': 'Platform',  # Too generic
}

# ✓ Good - specific context
replacements = {
    'Data Cloud & AI ARR': 'Platform & AI ARR',
}
```

## Working with Tables

```python
for shape in slide.shapes:
    if shape.has_table:
        table = shape.table

        # Iterate through cells
        for row in table.rows:
            for cell in row.cells:
                # Replace text in cells
                for old_text, new_text in replacements.items():
                    if old_text in cell.text:
                        cell.text = cell.text.replace(old_text, new_text)
```

## Working with Charts

```python
for shape in slide.shapes:
    if shape.has_chart:
        chart = shape.chart

        # Modify chart title
        if chart.has_title:
            chart.chart_title.text_frame.text = "New Chart Title"

        # Note: Modifying chart data is more complex
        # Usually requires recreating the chart
```

## Troubleshooting

### Issue: Changes not appearing

**Solution**: Make sure you're iterating through `runs`, not just `paragraphs`:

```python
# ✓ Correct
for paragraph in text_frame.paragraphs:
    for run in paragraph.runs:  # Important!
        run.text = run.text.replace(old, new)
```

### Issue: Font appears as None

**Solution**: Font might be inherited from theme. Set it explicitly:

```python
if run.font.name is None:
    run.font.name = 'Arial'  # Or your preferred font
```

### Issue: Position not updating

**Solution**: Use `Inches()` or `Pt()` for measurements:

```python
from pptx.util import Inches

shape.top = Inches(1.0)  # ✓ Correct
shape.top = 1.0          # ✗ Wrong - needs proper units
```

## Summary

Template replacement with python-pptx is straightforward:

1. **Load** the template presentation
2. **Define** text replacement mappings
3. **Iterate** through shapes, paragraphs, and runs
4. **Replace** text while preserving formatting
5. **Modify** formatting properties if needed (colors, fonts, positions)
6. **Save** the result

The key is to work at the `run` level within `text_frame` to preserve all formatting attributes.
