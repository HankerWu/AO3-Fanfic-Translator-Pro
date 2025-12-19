
import { TranslationBlock, TranslationProject } from '../types';

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const splitTextIntoBlocks = (text: string): TranslationBlock[] => {
  const rawBlocks = text.split(/\n\s*\n/);
  return rawBlocks
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => ({
      id: generateId(),
      original: chunk,
      translated: '',
      isEdited: false,
      isLoading: false,
    }));
};

export const sanitizeProjectData = (project: TranslationProject): TranslationProject => {
  // Check if any block is stuck in loading state
  const hasStuckBlocks = project.blocks.some(b => b.isLoading);
  if (!hasStuckBlocks) return project;

  const sanitizedBlocks = project.blocks.map(b => {
    // If a block is marked as loading, reset it.
    if (b.isLoading) {
      // Fix: Check if translation text exists. 
      // If text is present, assume it finished but state failed to update, so KEEP the text.
      // Only wipe text if it is empty.
      const hasText = b.translated && b.translated.trim().length > 0;
      
      return { 
        ...b, 
        isLoading: false, 
        translated: hasText ? b.translated : '', 
        // If we kept text, keep the edited status, otherwise reset it
        isEdited: hasText ? b.isEdited : false 
      };
    }
    return b;
  });

  return {
    ...project,
    blocks: sanitizedBlocks
  };
};

const cleanText = (text: string | null | undefined): string => {
  if (!text) return "";
  return text.replace(/\s+/g, ' ').trim();
};

const parseHTML = (htmlString: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // Metadata Extraction
  // 1. Title
  const title = cleanText(doc.querySelector('.meta h1')?.textContent) || 
                cleanText(doc.querySelector('h1')?.textContent) || 
                cleanText(doc.querySelector('#workskin h2.heading')?.textContent) || 
                doc.title ||
                "Untitled HTML";
  
  // 2. Author             
  const author = cleanText(doc.querySelector('.meta .byline a[rel="author"]')?.textContent) || 
                 cleanText(doc.querySelector('a[rel="author"]')?.textContent) || 
                 cleanText(doc.querySelector('.byline')?.textContent) || 
                 "Unknown Author";
                 
  let fandom = "Unknown Fandom";
  const tags: string[] = [];

  // 3. Tags & Fandom - Strategy A: Parse dl.tags (Standard AO3 Download)
  const metaDl = doc.querySelector('dl.tags');
  if (metaDl) {
      // AO3 structure usually pairs dt and dd sequentially
      let currentLabel = "";
      
      // Iterate through children to handle potential structure variations
      const children = Array.from(metaDl.children);
      for (const child of children) {
          if (child.tagName === 'DT') {
              currentLabel = cleanText(child.textContent).toLowerCase().replace(':', '');
          } else if (child.tagName === 'DD') {
              const values = Array.from(child.querySelectorAll('a')).map(a => cleanText(a.textContent));
              if (values.length === 0) {
                  const text = cleanText(child.textContent);
                  if (text) values.push(text);
              }

              if (currentLabel.includes('fandom')) {
                  fandom = values.join(', ');
              } else if (
                  currentLabel === 'rating' || 
                  currentLabel === 'archive warning' || 
                  currentLabel === 'category' || 
                  currentLabel.includes('relationship') || 
                  currentLabel.includes('character') || 
                  currentLabel.includes('freeform') || 
                  currentLabel === 'tags' ||
                  currentLabel === 'additional tags'
              ) {
                  tags.push(...values);
              }
          }
      }
  } 
  
  // Strategy B: Fallback to class-based selectors (AO3 Site Scrape)
  if (fandom === "Unknown Fandom" && tags.length === 0) {
       const fandomElement = doc.querySelector('.fandom.tags') || doc.querySelector('.fandoms');
       if (fandomElement && fandomElement.textContent) {
           fandom = cleanText(fandomElement.textContent).replace(/^Fandoms?:\s*/i, '');
       }

       const specificTags = doc.querySelectorAll('.relationship.tags a, .character.tags a, .freeform.tags a');
       if (specificTags.length > 0) {
           specificTags.forEach(el => tags.push(cleanText(el.textContent)));
       } else {
           // Generic fallback
           const allTagLinks = doc.querySelectorAll('.tags a.tag');
           allTagLinks.forEach(el => tags.push(cleanText(el.textContent)));
       }
  }

  // Content Extraction
  // Improved Strategy: Locate #chapters or .userstuff
  const blocks: TranslationBlock[] = [];
  
  // Try to find the specific chapter containers first (common in full work downloads)
  const chapterContainers = doc.querySelectorAll('#chapters > .userstuff, #chapters > .chapter');
  
  if (chapterContainers.length > 0) {
     chapterContainers.forEach((chapter, index) => {
        // Try to find chapter title inside meta if available
        const metaTitle = chapter.querySelector('.meta h2.heading') || chapter.querySelector('.meta h3.heading');
        if (metaTitle) {
            const titleText = cleanText(metaTitle.textContent);
            if (titleText) {
                blocks.push({
                    id: generateId(),
                    original: `## ${titleText}`, // Use Markdown header for visual distinction
                    translated: '',
                    isEdited: false,
                    isLoading: false,
                });
            }
        } else {
            // If no explicit meta title, but we are in a multi-chapter structure, add a generic header
            if (chapterContainers.length > 1) {
                blocks.push({
                    id: generateId(),
                    original: `## Chapter ${index + 1}`,
                    translated: '',
                    isEdited: false,
                    isLoading: false,
                });
            }
        }

        // The actual text content usually lives in a .userstuff div inside the chapter div, or is the div itself
        const contentNode = chapter.querySelector('.userstuff[role="article"]') || chapter;
        extractBlocksFromNode(contentNode, blocks);
     });
  } else {
      // Single chapter or simple structure
      const root = doc.getElementById('chapters') || 
                   doc.getElementById('workskin') || 
                   doc.querySelector('.userstuff') || 
                   doc.body;
      extractBlocksFromNode(root, blocks);
  }
  
  // Fallback: if structure parsing failed, grab all text
  if (blocks.length === 0) {
      const root = doc.body; 
      return {
          title, author, fandom, tags,
          blocks: splitTextIntoBlocks(root.textContent || "")
      };
  }

  return {
    title,
    author,
    fandom,
    tags,
    blocks
  };
};

// Helper to extract P, Headers, and Blockquotes from a container
const extractBlocksFromNode = (root: Element, blocks: TranslationBlock[]) => {
    const relevantTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'LI', 'DIV', 'HR'];
    // We traverse purely to find these block elements.
    // Flatten the tree but respect order.
    
    // Using a TreeWalker might be better but querySelectorAll('*') is easier to filter
    const allElements = Array.from(root.querySelectorAll('*'));
    
    for (const el of allElements) {
        if (!relevantTags.includes(el.tagName)) continue;

        // Skip if inside a hidden/meta div that we shouldn't translate
        if (el.closest('.meta') || el.closest('.navigation') || el.closest('.footer') || el.id === 'work_endnotes') continue;

        // Special handling for DIVs: Only process if they look like paragraphs (text nodes) and don't contain other block elements
        if (el.tagName === 'DIV') {
            const hasBlockChildren = Array.from(el.children).some(c => relevantTags.includes(c.tagName) && c.tagName !== 'BR');
            if (hasBlockChildren) continue;
        }

        // Avoid duplication: If a parent was already processed, we might duplicate text if we aren't careful.
        // The simple strategy here: Only take "leaf" block elements.
        // If an element contains other block elements, we skip it and let the loop catch the children.
        const hasBlockChildren = Array.from(el.children).some(c => relevantTags.includes(c.tagName));
        if (hasBlockChildren && el.tagName !== 'BLOCKQUOTE') continue; // Blockquotes we might want to keep as one block or split? Let's split if complex.

        const text = cleanText(el.textContent);
        
        // Horizontal Rule
        if (el.tagName === 'HR') {
            blocks.push({
                 id: generateId(),
                 original: '---',
                 translated: '---', // No translation needed
                 isEdited: false,
                 isLoading: false,
            });
            continue;
        }

        if (text.length < 1 && el.tagName !== 'HR') continue; // Skip empty
        
        // Skip repetitive UI text like "Chapter Text" headers if they appear inside content
        if (text === "Chapter Text") continue;

        blocks.push({
            id: generateId(),
            original: text,
            translated: '',
            isEdited: false,
            isLoading: false,
        });
    }
};

export const parseUploadedFile = async (file: File): Promise<{ title: string, author: string, fandom: string, tags: string[], blocks: TranslationBlock[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      
      if (file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm')) {
        try {
            resolve(parseHTML(content));
        } catch (err) {
            console.error("HTML Parse Error", err);
            resolve({
                title: file.name.replace(/\.[^/.]+$/, ""),
                author: "Unknown",
                fandom: "Unknown",
                tags: [],
                blocks: splitTextIntoBlocks(content)
             });
        }
      } else {
        resolve({
          title: file.name.replace(/\.[^/.]+$/, ""),
          author: "Unknown",
          fandom: "Unknown",
          tags: [],
          blocks: splitTextIntoBlocks(content)
        });
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

export const exportTranslation = (project: TranslationProject, format: 'markdown' | 'html' | 'txt') => {
  let content = '';
  const filename = `${project.metadata.title || 'fanfic'}_${project.metadata.targetLanguage}.${format}`;

  if (format === 'markdown') {
    content = `# ${project.metadata.title}\n`;
    content += `**Author:** ${project.metadata.author}\n`;
    content += `**Fandom:** ${project.metadata.fandom}\n`;
    if (project.metadata.tags && project.metadata.tags.length > 0) {
        content += `**Tags:** ${project.metadata.tags.join(', ')}\n`;
    }
    content += `**Translated:** ${new Date().toLocaleDateString()}\n\n---\n\n`;
    
    project.blocks.forEach(block => {
      content += `${block.translated}\n\n`;
    });
  } else if (format === 'html') {
    content = `
      <html>
      <head>
        <title>${project.metadata.title}</title>
        <style>
          body { font-family: serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
          h1 { text-align: center; }
          .meta { color: #666; font-style: italic; margin-bottom: 40px; text-align: center;}
          p { margin-bottom: 1.5em; text-indent: 2em; text-align: justify; }
        </style>
      </head>
      <body>
        <h1>${project.metadata.title}</h1>
        <div class="meta">
          Author: ${project.metadata.author} | Fandom: ${project.metadata.fandom}
        </div>
        <hr/>
        ${project.blocks.map(b => `<p>${b.translated.replace(/\n/g, '<br/>')}</p>`).join('')}
      </body>
      </html>
    `;
  } else {
    content = `${project.metadata.title}\nBy ${project.metadata.author}\n\n`;
    project.blocks.forEach(block => {
      content += `${block.translated}\n\n`;
    });
  }

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
