pub struct RecursiveTextSplitter {
    chunk_size_chars: usize,
    chunk_overlap_chars: usize,
    delimiters: Vec<String>,
}

impl RecursiveTextSplitter {
    pub fn new(chunk_size_tokens: usize, chunk_overlap_tokens: usize) -> Self {
        Self {
            chunk_size_chars: chunk_size_tokens * 4,
            chunk_overlap_chars: chunk_overlap_tokens * 4,
            delimiters: vec![
                "\n\n".to_string(),
                "\n".to_string(),
                " ".to_string(),
                "".to_string(),
            ],
        }
    }

    pub fn split_text(&self, text: &str) -> Vec<String> {
        if text.is_empty() {
            return Vec::new();
        }

        if text.len() <= self.chunk_size_chars {
            return vec![text.trim().to_string()];
        }

        self.split_recursive(text, &self.delimiters)
    }

    fn split_recursive(&self, text: &str, separators: &[String]) -> Vec<String> {
        let mut chunks = Vec::new();
        if separators.is_empty() {
            // Hard character split
            let chars = text.chars().collect::<Vec<char>>();
            let mut i = 0;
            while i < chars.len() {
                let end = (i + self.chunk_size_chars).min(chars.len());
                let part: String = chars[i..end].iter().collect();
                chunks.push(part);
                i += self.chunk_size_chars;
            }
            return chunks;
        }

        let separator = &separators[0];
        let next_separators = &separators[1..];

        // Split text by current separator
        let splits: Vec<&str> = if separator.is_empty() {
            text.split("").filter(|s| !s.is_empty()).collect()
        } else {
            text.split(separator).collect()
        };

        let mut current_chunk: Vec<String> = Vec::new();
        let mut current_len = 0;

        for part in splits {
            let part_len = part.len();

            if part_len > self.chunk_size_chars {
                // Flush the current chunk
                if !current_chunk.is_empty() {
                    chunks.push(current_chunk.join(separator));
                    current_chunk.clear();
                    current_len = 0;
                }

                // Recursively split the oversized part
                let sub_chunks = self.split_recursive(part, next_separators);
                chunks.extend(sub_chunks);
            } else {
                let separator_len = if current_chunk.is_empty() { 0 } else { separator.len() };
                if current_len + separator_len + part_len <= self.chunk_size_chars {
                    current_chunk.push(part.to_string());
                    current_len += separator_len + part_len;
                } else {
                    // Flush current chunk
                    if !current_chunk.is_empty() {
                        chunks.push(current_chunk.join(separator));
                    }

                    // Start a new chunk with overlap
                    let overlap_source = if current_chunk.is_empty() { String::new() } else { current_chunk.join(separator) };
                    let mut overlap_text = String::new();
                    if !overlap_source.is_empty() && self.chunk_overlap_chars > 0 {
                        let start_idx = overlap_source.len().saturating_sub(self.chunk_overlap_chars);
                        overlap_text = overlap_source[start_idx..].to_string();

                        if !separator.is_empty() {
                            if let Some(first_sep_idx) = overlap_text.find(separator) {
                                overlap_text = overlap_text[first_sep_idx + separator.len()..].to_string();
                            }
                        }
                    }

                    current_chunk.clear();
                    current_len = 0;

                    if !overlap_text.is_empty() {
                        current_chunk.push(overlap_text.clone());
                        current_len = overlap_text.len();
                    }

                    current_chunk.push(part.to_string());
                    current_len += if current_len > 0 { separator.len() } else { 0 } + part_len;
                }
            }
        }

        if !current_chunk.is_empty() {
            chunks.push(current_chunk.join(separator));
        }

        chunks.into_iter()
            .map(|c| c.trim().to_string())
            .filter(|c| !c.is_empty())
            .collect()
    }
}
