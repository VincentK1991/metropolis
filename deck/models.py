"""Pydantic models for Deck JSON schema validation."""

from typing import List, Optional, Union, Literal, Dict
from pydantic import BaseModel, Field


# Type aliases
UUID = str
Cell = Union[str, int, None]


# ---- Core ---- #

DeckStatus = Literal["draft", "outline_ready", "populating", "ready", "exported"]
DeckSize = Literal[1, 3, 5]


class DeepResearchBlob(BaseModel):
    """Deep research blob containing user query and text."""

    userQuery: str
    text: str


class Deck(BaseModel):
    """Main deck structure."""

    id: UUID
    title: str
    size: DeckSize
    status: DeckStatus
    slides: List["Slide"]
    sources: Optional[List["Source"]] = None
    outline: Optional[List["OutlineItem"]] = None
    asOfDate: Optional[str] = None
    createdAt: str
    updatedAt: str
    deepResearch: Optional[DeepResearchBlob] = None
    lastExportJobId: Optional[UUID] = None


# ---- Outline ---- #

SlidePatternKind = Literal[
    "COMPANY_OVERVIEW",
    "HISTORICAL_FINANCIALS",
    "COMPARABLE_COMPANIES_TRADING",
    "ANALYST_PERSPECTIVES",
    "STOCK_PRICE",
    "CUSTOM",
]


class OutlineItem(BaseModel):
    """Outline item for deck structure."""

    id: UUID
    title: str
    description: Optional[str] = None
    suggestedPattern: Optional[SlidePatternKind] = None
    pinned: Optional[bool] = None
    keptFrom: Optional[UUID] = None


# ---- Layouts / Patterns ---- #

LayoutKind = Literal["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8"]


class LayoutSlot(BaseModel):
    """Layout slot definition."""

    index: int
    row: int
    col: int
    rowSpan: Optional[int] = None
    colSpan: Optional[int] = None
    defaultHeadline: Optional[str] = None


class LayoutSpec(BaseModel):
    """Layout specification."""

    kind: LayoutKind
    rows: int
    cols: int
    slots: List[LayoutSlot]


BlockKindType = Literal[
    "BULLETS", "TABLE", "CHART", "CALLOUT", "FOOTNOTE", "IMAGE", "LOGO", "PLACEHOLDER"
]


class PatternSpec(BaseModel):
    """Pattern specification."""

    kind: SlidePatternKind
    defaultLayout: LayoutKind
    requiredBlocks: List[BlockKindType]
    optionalBlocks: Optional[List[BlockKindType]] = None
    slotHints: Optional[Dict[int, List[BlockKindType]]] = None


# ---- Slides & Blocks ---- #


class Slide(BaseModel):
    """Slide structure."""

    id: UUID
    index: int  # 0-based; Title slide is index=-1 (virtual)
    title: str
    description: Optional[str] = None
    pattern: Optional[SlidePatternKind] = None
    layout: LayoutKind
    blocks: List["Block"]
    citations: Optional[List["CitationRef"]] = None
    notes: Optional[str] = None
    locked: Optional[bool] = None


class BlockBase(BaseModel):
    """Base block structure."""

    id: UUID
    kind: BlockKindType
    slot: int
    headline: Optional[str] = None


class BulletsBlock(BlockBase):
    """Bullets block."""

    kind: Literal["BULLETS"] = "BULLETS"
    bullets: List[str]
    dense: Optional[bool] = None
    bulletCitations: Optional[Dict[int, List["CitationRef"]]] = None


class TableBlock(BlockBase):
    """Table block."""

    kind: Literal["TABLE"] = "TABLE"
    headers: List[str]
    rows: List[List[Cell]]
    dense: Optional[bool] = None
    rowBands: Optional[bool] = None
    subtotalRows: Optional[List[int]] = None
    formats: Optional[Dict[int, Literal["currency", "percent", "integer", "text"]]] = (
        None
    )
    sortableBy: Optional[int] = None
    footnotes: Optional[List[str]] = None
    cellCitations: Optional[Dict[str, List["CitationRef"]]] = None


ChartType = Literal["LINE", "COLUMN", "STACKED", "WATERFALL"]


class ChartSeriesPoint(BaseModel):
    """Chart series point."""

    x: Union[str, int, float]
    y: Union[int, float]


class ChartSeries(BaseModel):
    """Chart series."""

    name: str
    points: List[ChartSeriesPoint]


class ChartBlock(BlockBase):
    """Chart block."""

    kind: Literal["CHART"] = "CHART"
    chartType: ChartType
    series: List[ChartSeries]
    indexTo100: Optional[Dict[Literal["base"], Union[int, str, float]]] = None
    eventMarkers: Optional[
        List[Dict[Literal["x", "label"], Union[str, int, float]]]
    ] = None
    yAxisFormat: Optional[Literal["currency", "percent", "integer"]] = None


class CalloutBlock(BlockBase):
    """Callout block."""

    kind: Literal["CALLOUT"] = "CALLOUT"
    label: str
    value: str
    delta: Optional[
        Dict[Literal["value", "direction"], Union[str, Literal["up", "down"]]]
    ] = None
    asOf: Optional[str] = None
    citations: Optional[List["CitationRef"]] = None


class FootnoteBlock(BlockBase):
    """Footnote block."""

    kind: Literal["FOOTNOTE"] = "FOOTNOTE"
    text: Optional[str] = None
    legalLine: Optional[str] = None
    sourceLabels: List[str]


class ImageBlock(BlockBase):
    """Image block."""

    kind: Literal["IMAGE"] = "IMAGE"
    alt: str
    uri: str
    maxHeightPx: Optional[int] = None


class LogoBlock(BlockBase):
    """Logo block."""

    kind: Literal["LOGO"] = "LOGO"
    alt: Optional[str] = None
    uris: List[str]
    maxHeightPx: Optional[int] = None
    gapPx: Optional[int] = None


class PlaceholderBlock(BlockBase):
    """Placeholder block."""

    kind: Literal["PLACEHOLDER"] = "PLACEHOLDER"
    reason: Literal["MISSING_DATA", "TBD_CONTENT"]
    need: Optional[str] = None
    suggestedFetch: Optional[str] = None


# Union type for all blocks
Block = Union[
    BulletsBlock,
    TableBlock,
    ChartBlock,
    CalloutBlock,
    FootnoteBlock,
    ImageBlock,
    LogoBlock,
    PlaceholderBlock,
]


# ---- Sources & Citations ---- #


class Source(BaseModel):
    """Source definition."""

    id: UUID
    label: str
    title: Optional[str] = None
    uri: Optional[str] = None
    publishedAt: Optional[str] = None
    excerpt: Optional[str] = None
    origin: Optional[Literal["DR", "USER", "OTHER"]] = None


class CitationRef(BaseModel):
    """Citation reference."""

    sourceLabel: str
    passageId: Optional[str] = None


# ---- Export ---- #


class ExportJob(BaseModel):
    """Export job definition."""

    id: UUID
    deckId: UUID
    format: Literal["PPTX"]
    startedAt: str
    completedAt: Optional[str] = None
    fileUri: Optional[str] = None
    status: Literal["running", "succeeded", "failed"]
    error: Optional[str] = None


# ---- LLM IO types (subset used in MVP) ---- #


class TitleizerInput(BaseModel):
    """Input for title generation."""

    userQuery: str
    deepResearchText: Optional[str] = None


class TitleizerOutput(BaseModel):
    """Output for title generation."""

    title: str


class OutlineProposalInput(BaseModel):
    """Input for outline proposal."""

    deckId: UUID
    title: str
    size: DeckSize
    deepResearchText: Optional[str] = None
    constraints: Optional[Dict[str, List[SlidePatternKind]]] = None


class OutlineProposalOutput(BaseModel):
    """Output for outline proposal."""

    outline: List[OutlineItem]


class DraftScaffoldingInput(BaseModel):
    """Input for draft scaffolding."""

    deckId: UUID
    outline: List[OutlineItem]
    deepResearchText: str


class SlideScaffold(BaseModel):
    """Slide scaffold definition."""

    slideId: UUID
    outlineItemId: UUID
    title: str
    description: Optional[str] = None
    pattern: Optional[SlidePatternKind] = None
    layout: LayoutKind
    blocks: List[Block]


class DraftScaffoldingOutput(BaseModel):
    """Output for draft scaffolding."""

    slides: List[SlideScaffold]


class PopulateAllSlidesInput(BaseModel):
    """Input for populating all slides."""

    deck: Deck
    deepResearchText: str


class PopulateAllSlidesOutput(BaseModel):
    """Output for populating all slides."""

    slides: List[Slide]


# Update forward references
Deck.model_rebuild()
Slide.model_rebuild()
BulletsBlock.model_rebuild()
TableBlock.model_rebuild()
CalloutBlock.model_rebuild()
