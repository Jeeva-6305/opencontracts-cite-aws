# Multimodal Embedding Architecture

## Overview

OpenContracts supports multimodal document processing through a **pluggable embedder architecture**. Any embedder can become multimodal by implementing the image embedding interface and setting the appropriate flags. The default multimodal embedder uses CLIP ViT-L-14 (768 dimensions), but the architecture supports any multimodal model with any vector dimension.

This enables powerful cross-modal similarity search where text queries can find relevant images and vice versa.

## Architecture

### Unified Vector Space

The key insight of multimodal embeddings is that both text and images are embedded into the **same vector space**:

```
Text Query    "revenue chart"  → CLIP text encoder  → 768d vector
Image Data    <chart.png>      → CLIP image encoder → 768d vector (SAME space!)

Similarity = cosine(text_vector, image_vector)  # Works across modalities!
```

This means:
- A text query like "bar chart showing quarterly revenue" can find actual chart images
- Image annotations are searchable alongside text annotations
- No separate image search system required

### Content Modalities

Each annotation tracks what content types it contains via the `content_modalities` field:

```python
class Annotation(models.Model):
    content_modalities = ArrayField(
        models.CharField(max_length=20),
        default=list,
        help_text="Content types: ['TEXT'], ['IMAGE'], or ['TEXT', 'IMAGE']"
    )
```

Possible values:
- `["TEXT"]` - Text-only annotation (default for most annotations)
- `["IMAGE"]` - Image-only annotation (e.g., a figure without caption)
- `["TEXT", "IMAGE"]` - Mixed modality (e.g., figure with caption)

### Embedding Generation Flow

When generating embeddings for an annotation:

```
                                    ┌─────────────────┐
Annotation ──► Check modalities ───►│ TEXT only?      │──► embed_text(raw_text) ──► 768d
                                    │ IMAGE only?     │──► avg(embed_image(img1), ...) ──► 768d
                                    │ MIXED?          │──► weighted_avg(text_emb, img_emb) ──► 768d
                                    └─────────────────┘
```

For mixed-modality annotations, embeddings are combined via configurable weighted average:

```python
# Default: 30% text, 70% image (images weighted higher as they're often dominant)
MULTIMODAL_EMBEDDING_WEIGHTS = {
    "text_weight": 0.3,
    "image_weight": 0.7,
}
```

## Configuration

### Environment Variables

```bash
# Multimodal embedder service URL
MULTIMODAL_EMBEDDER_URL=http://multimodal-embedder:8000

# Optional API key
MULTIMODAL_EMBEDDER_API_KEY=your-api-key

# Embedding weight configuration
MULTIMODAL_TEXT_WEIGHT=0.3
MULTIMODAL_IMAGE_WEIGHT=0.7
```

### Corpus Configuration

Set the multimodal embedder as the preferred embedder for a corpus:

```python
from opencontractserver.corpuses.models import Corpus

corpus = Corpus.objects.get(id=corpus_id)
corpus.preferred_embedder = (
    "opencontractserver.pipeline.embedders."
    "multimodal_microservice.CLIPMicroserviceEmbedder"
)
corpus.save()
```

### Docker Compose

The multimodal embedder runs as a separate microservice:

```yaml
# In docker-compose.yml
multimodal-embedder:
  image: ghcr.io/jsv4/vectorembeddermicroservice-multimodal:latest
  container_name: multimodal-embedder
  environment:
    PORT: 8000
    TRANSFORMERS_OFFLINE: 1  # Use pre-downloaded model
```

## API Endpoints

The multimodal embedder service exposes:

| Endpoint | Method | Description | Request Body |
|----------|--------|-------------|--------------|
| `/embeddings` | POST | Single text embedding | `{"text": "..."}` |
| `/embeddings/image` | POST | Single image embedding | `{"image": "<base64>"}` |
| `/embeddings/batch` | POST | Batch text (max 100) | `{"texts": [...]}` |
| `/embeddings/image/batch` | POST | Batch images (max 20) | `{"images": [...]}` |

All endpoints return 768-dimensional vectors:
```json
{"embeddings": [[0.123, -0.456, ...]]}
```

## Usage

### Vector Store Search with Modality Filter

```python
from opencontractserver.llms.vector_stores.core_vector_stores import (
    CoreAnnotationVectorStore,
    VectorSearchQuery,
)

# Search all modalities (default)
store = CoreAnnotationVectorStore(corpus_id=123)
results = store.search(VectorSearchQuery(query_text="revenue chart"))

# Search only text annotations
store = CoreAnnotationVectorStore(corpus_id=123, modalities=["TEXT"])
results = store.search(VectorSearchQuery(query_text="contract terms"))

# Search only image annotations
store = CoreAnnotationVectorStore(corpus_id=123, modalities=["IMAGE"])
results = store.search(VectorSearchQuery(query_text="pie chart"))
```

### Agent Tools

Agents can use the `similarity_search` tool with modality filtering:

```python
# In agent conversation
"Search for images of revenue charts"
→ similarity_search(query="revenue chart", modalities=["IMAGE"])

"Find text mentions of quarterly earnings"
→ similarity_search(query="quarterly earnings", modalities=["TEXT"])
```

### Image Tools for Agents

Agents have access to image-specific tools:

- `list_document_images` - List all images in a document with metadata
- `get_document_image` - Retrieve base64-encoded image data
- `get_annotation_images` - Get images within an annotation's bounds

## Implementation Details

### Multimodal Embeddings Utility

The `opencontractserver/utils/multimodal_embeddings.py` module provides:

```python
def generate_multimodal_embedding(
    annotation: Annotation,
    embedder: BaseEmbedder,
    text_weight: float = 0.3,
    image_weight: float = 0.7,
) -> Optional[list[float]]:
    """
    Generate unified embedding for annotation with text, images, or both.

    Logic:
    - TEXT only: embed_text(raw_text)
    - IMAGE only: average(embed_image(img1), embed_image(img2), ...)
    - MIXED: weighted_average(text_embedding, images_average)
    """
```

### Embedding Task Integration

The `calculate_embedding_for_annotation_text` Celery task automatically:
1. Checks if the corpus uses a multimodal embedder
2. Checks the annotation's `content_modalities`
3. Uses `generate_multimodal_embedding()` for annotations with images
4. Falls back to text-only embedding otherwise

### Image Token Storage

Images extracted from PDFs are stored as unified tokens in PAWLs format:

```python
{
    "is_image": True,
    "image_path": "document_images/doc_123/page_0_img_5.png",
    "format": "png",
    "width": 400,
    "height": 300,
    "x": 72,
    "y": 200,
    "text": ""  # Empty for images
}
```

## Testing

Run multimodal integration tests:

```bash
docker compose -f test.yml run django pytest \
    opencontractserver/tests/test_multimodal_integration.py -v
```

These tests verify:
- Embedder service connectivity
- Text embedding dimensions (768)
- Image embedding dimensions (768)
- Cross-modal similarity (text and image in same space)
- Batch embedding operations
- PDF parsing with image extraction
- End-to-end multimodal pipeline

## Troubleshooting

### Embedder Service Not Available

If embeddings fail, check:
1. Service is running: `docker compose ps multimodal-embedder`
2. URL is correct: `MULTIMODAL_EMBEDDER_URL` environment variable
3. Network connectivity: `curl http://multimodal-embedder:8000/health`

### Images Not Being Embedded

Check:
1. Annotation has `content_modalities = ["IMAGE"]` or `["TEXT", "IMAGE"]`
2. Image tokens exist in PAWLs data with `is_image=True`
3. Image files exist at `image_path` locations
4. Embedder supports images: `embedder.supports_images == True`

### Unexpected Search Results

If cross-modal search isn't working:
1. Verify corpus uses multimodal embedder
2. Check annotation embeddings exist and are 768-dimensional
3. Confirm modalities filter is set correctly (or not set for all modalities)

## Creating Custom Multimodal Embedders

The architecture is fully pluggable. To add a new multimodal embedder:

### 1. Create the Embedder Class

```python
from opencontractserver.pipeline.base.embedder import BaseEmbedder
from opencontractserver.pipeline.base.file_types import FileTypeEnum
from opencontractserver.types.enums import ContentModality

class MyMultimodalEmbedder(BaseEmbedder):
    title = "My Multimodal Embedder"
    description = "Custom embedder supporting text and images"
    author = "Your Name"
    dependencies = ["torch", "transformers"]

    # Set your model's output dimension
    vector_size = 1024  # Can be any dimension

    supported_file_types = [FileTypeEnum.PDF, FileTypeEnum.TXT]

    # Enable multimodal support - single source of truth
    supported_modalities = {ContentModality.TEXT, ContentModality.IMAGE}

    # Derived properties are available automatically:
    # - is_multimodal: True (len(supported_modalities) > 1)
    # - supports_text: True (ContentModality.TEXT in supported_modalities)
    # - supports_images: True (ContentModality.IMAGE in supported_modalities)

    def _embed_text_impl(self, text: str, **kwargs) -> list[float] | None:
        """Generate text embeddings."""
        # Your text embedding logic here
        return self.model.encode_text(text).tolist()

    def _embed_image_impl(
        self, image_base64: str, image_format: str = "jpeg", **kwargs
    ) -> list[float] | None:
        """Generate image embeddings."""
        # Your image embedding logic here
        image = decode_base64_image(image_base64)
        return self.model.encode_image(image).tolist()
```

### 2. Register the Embedder

Add to your Django settings or configure per-corpus:

```python
# In settings.py (global default)
PREFERRED_EMBEDDERS = {
    "application/pdf": "myapp.embedders.MyMultimodalEmbedder",
}

# Or per-corpus
corpus.preferred_embedder = "myapp.embedders.MyMultimodalEmbedder"
corpus.save()
```

### 3. Key Requirements

- **Same vector space**: `embed_text()` and `embed_image()` must return vectors in the same embedding space
- **Consistent dimensions**: Both methods must return vectors of `vector_size` dimensions
- **Supported dimensions**: The database supports 384, 768, 1536, and 3072 dimensions

The embedding task will automatically detect your embedder's capabilities via `supported_modalities` and use `generate_multimodal_embedding()` when appropriate.

## Performance Considerations

- **Batch Processing**: Use batch endpoints for multiple embeddings
- **Image Size**: Large images are resized by most models (e.g., 224x224 for CLIP)
- **Caching**: Embeddings are stored in database, not recomputed
- **Model Loading**: First request may be slow while model loads

### Pre-extracted Image Content (Performance Optimization)

To avoid repeatedly loading full PAWLs files (~10MB) for image embeddings, annotations with IMAGE modality can store pre-extracted image data in `image_content_file`:

```python
# Annotation model field
image_content_file = FileField(
    upload_to=calc_oc_file_path,
    blank=True,
    null=True,
    help_text="JSON file containing extracted image data for IMAGE modality annotations"
)
```

**File format:**
```json
{
  "images": [
    {
      "base64": "...",
      "format": "jpeg",
      "page_index": 0,
      "token_index": 5,
      "width": 200,
      "height": 150
    }
  ]
}
```

**How it works:**
1. During annotation creation via `import_annotations()`, image data is pre-extracted from PAWLs
2. `batch_extract_annotation_images()` efficiently processes multiple annotations sharing one PAWLs load
3. When generating embeddings, `get_annotation_image_tokens()` checks `image_content_file` first (fast path)
4. Falls back to PAWLs loading only for legacy annotations

**Performance impact:**
- Before: 100 image annotations = 100 PAWLs loads (~1GB I/O)
- After: 100 image annotations = 100 small JSON loads (~10MB I/O)
- Speed improvement: ~10-20x faster for image embedding generation
