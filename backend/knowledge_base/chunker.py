import re
from typing import List

class RecursiveTextSplitter:
    """
    Splits text recursively using delimiters (paragraphs, newlines, sentences, words)
    to keep semantic blocks together.
    Designed for large context windows (2000-4000 token chunks) with overlap.
    """
    def __init__(self, chunk_size_tokens: int = 3000, chunk_overlap_tokens: int = 300):
        # Rule of thumb: 1 token ≈ 4 characters
        self.chunk_size_chars = chunk_size_tokens * 4
        self.chunk_overlap_chars = chunk_overlap_tokens * 4
        self.delimiters = ["\n\n", "\n", " ", ""]

    def split_text(self, text: str) -> List[str]:
        if not text:
            return []
            
        # If the whole text fits, return it immediately
        if len(text) <= self.chunk_size_chars:
            return [text.strip()]
            
        return self._split(text, self.delimiters)

    def _split(self, text: str, separators: List[str]) -> List[str]:
        # Final list of chunks
        chunks = []
        
        # Pick the current separator
        separator = separators[0] if separators else ""
        next_separators = separators[1:] if len(separators) > 1 else []
        
        # Split text by current separator
        if separator:
            splits = text.split(separator)
        else:
            splits = list(text)
            
        # Combine splits into chunks that fit the chunk_size_chars
        current_chunk = []
        current_len = 0
        
        for part in splits:
            part_len = len(part)
            
            # If a single part is larger than the chunk size, we need to split it recursively
            if part_len > self.chunk_size_chars:
                # Flush the current chunk first
                if current_chunk:
                    chunks.append(separator.join(current_chunk))
                    current_chunk = []
                    current_len = 0
                
                # Recursively split the oversized part using the next separator
                if next_separators:
                    sub_chunks = self._split(part, next_separators)
                    chunks.extend(sub_chunks)
                else:
                    # Hard character split if no separators left
                    for i in range(0, part_len, self.chunk_size_chars):
                        chunks.append(part[i:i + self.chunk_size_chars])
            else:
                # Check if adding this part exceeds the limit
                separator_len = len(separator) if current_chunk else 0
                if current_len + separator_len + part_len <= self.chunk_size_chars:
                    current_chunk.append(part)
                    current_len += separator_len + part_len
                else:
                    # Flush current chunk
                    if current_chunk:
                        chunks.append(separator.join(current_chunk))
                    
                    # Start a new chunk, implementing overlap from the end of the flushed chunk
                    overlap_source = separator.join(current_chunk) if current_chunk else ""
                    overlap_text = ""
                    if overlap_source and self.chunk_overlap_chars > 0:
                        overlap_text = overlap_source[-self.chunk_overlap_chars:]
                        # Find first separator in overlap text to avoid partial words
                        first_sep_idx = overlap_text.find(separator) if separator else -1
                        if first_sep_idx != -1:
                            overlap_text = overlap_text[first_sep_idx + len(separator):]
                            
                    current_chunk = []
                    current_len = 0
                    if overlap_text:
                        current_chunk.append(overlap_text)
                        current_len = len(overlap_text)
                        
                    current_chunk.append(part)
                    current_len += (len(separator) if current_len > 0 else 0) + part_len
                    
        # Flush the final chunk
        if current_chunk:
            chunks.append(separator.join(current_chunk))
            
        # Post-process to strip and filter out empty chunks
        return [c.strip() for c in chunks if c.strip()]
