
import { TranslationBlock, TranslationProject } from '../types';

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const splitTextIntoBlocks = (text: string): TranslationBlock[] => {
  // Normalize line endings
  const normalized = text.replace(/\r\n/g, '\n');
  const rawBlocks = normalized.split(/\n\s*\n/);
  
  return rawBlocks
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => {
      // Explicit Markdown header support for Text/MD imports
      const isMarkdownHeader = /^#+\s/.test(chunk);
      
      return {
        id: generateId(),
        original: chunk,
        translated: '',
        isEdited: false,
        isLoading: false,
        type: isMarkdownHeader ? 'header' : 'text', // Preserve Markdown structure
        chapterIndex: 0
      };
    });
};

/**
 * Recalculates chapter indices for the entire project based on 'header' block types.
 * Should be called whenever a block type is toggled or rescanned.
 */
export const recalculateChapterIndices = (blocks: TranslationBlock[]): TranslationBlock[] => {
    let currentChapterIndex = 0;
    return blocks.map((b, index) => {
        // If it's a header, and NOT the very first block (title), increment index
        if (b.type === 'header' && index > 0) {
            currentChapterIndex++;
        }
        return { ...b, chapterIndex: currentChapterIndex };
    });
};

export const sanitizeProjectData = (project: TranslationProject): TranslationProject => {
  const cleanBlocks = project.blocks.map(b => ({
      ...b,
      // Ensure defaults if missing from old versions
      type: b.type || 'text',
      chapterIndex: b.chapterIndex ?? 0,
      note: b.note || '',
      isFavorite: b.isFavorite || false,
      // Ensure strings aren't null/undefined
      original: b.original || '',
      translated: b.translated || ''
  }));

  const reindexedBlocks = recalculateChapterIndices(cleanBlocks);

  return { 
      ...project, 
      blocks: reindexedBlocks,
      metadata: {
          ...project.metadata,
          tags: project.metadata.tags || [],
          url: project.metadata.url || '' // Ensure URL field exists
      }
  };
};

// --- Similarity and Merging Utils ---

const normalizeForComparison = (text: string) => {
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
};

export const calculateSimilarity = (oldBlocks: TranslationBlock[], newBlocks: TranslationBlock[]): number => {
    if (oldBlocks.length === 0) return 0;
    const oldTextBlocks = oldBlocks.filter(b => b.type === 'text');
    const newTextBlocks = newBlocks.filter(b => b.type === 'text');
    if (oldTextBlocks.length === 0) return 0;

    const oldSet = new Set(oldTextBlocks.map(b => normalizeForComparison(b.original)));
    let preservedCount = 0;
    const newSet = new Set(newTextBlocks.map(b => normalizeForComparison(b.original)));
    
    oldTextBlocks.forEach(b => {
        if (newSet.has(normalizeForComparison(b.original))) {
            preservedCount++;
        }
    });

    return Math.round((preservedCount / oldTextBlocks.length) * 100);
};

export const mergeProjectBlocks = (
    oldBlocks: TranslationBlock[], 
    newBlocks: TranslationBlock[]
): TranslationBlock[] => {
    const historyMap = new Map<string, TranslationBlock>();
    
    oldBlocks.forEach(b => {
        if (b.translated || b.isFavorite || b.note || b.type === 'header') {
            historyMap.set(normalizeForComparison(b.original), b);
        }
    });

    return newBlocks.map(newBlock => {
        const key = normalizeForComparison(newBlock.original);
        const match = historyMap.get(key);
        
        if (match) {
            return {
                ...newBlock,
                translated: match.translated,
                isEdited: match.isEdited,
                isFavorite: match.isFavorite,
                note: match.note,
                type: match.type 
            };
        }
        return newBlock;
    });
};

const cleanText = (text: string | null | undefined): string => {
  if (!text) return "";
  return text.replace(/\s+/g, ' ').trim();
};

const parseHTML = (htmlString: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // --- Metadata Extraction ---
  const title = cleanText(doc.querySelector('.meta h1')?.textContent) || 
                cleanText(doc.querySelector('h1')?.textContent) || 
                cleanText(doc.querySelector('#workskin h2.heading')?.textContent) || 
                doc.title || "Untitled HTML";
  
  const author = cleanText(doc.querySelector('.meta .byline a[rel="author"]')?.textContent) || 
                 cleanText(doc.querySelector('a[rel="author"]')?.textContent) || 
                 cleanText(doc.querySelector('.byline')?.textContent) || "Unknown Author";
  
  // Extract URL
  let url = "";
  const canonicalLink = doc.querySelector('link[rel="canonical"]');
  if (canonicalLink) {
      url = canonicalLink.getAttribute('href') || "";
  } else {
      const titleLink = doc.querySelector('h1 a');
      if (titleLink) {
          const href = titleLink.getAttribute('href');
          if (href && href.startsWith('http')) url = href;
          else if (href) url = `https://archiveofourown.org${href}`;
      }
  }

  let fandom = "Unknown Fandom";
  const tags: string[] = [];

  const metaDl = doc.querySelector('dl.tags');
  if (metaDl) {
      let currentLabel = "";
      const children = Array.from(metaDl.children);
      for (const child of children) {
          if (child.tagName === 'DT') {
              currentLabel = cleanText(child.textContent).toLowerCase().replace(':', '');
          } else if (child.tagName === 'DD') {
              const values = Array.from(child.querySelectorAll('a')).map(a => cleanText(a.textContent));
              if (values.length === 0) { const text = cleanText(child.textContent); if (text) values.push(text); }

              if (currentLabel.includes('fandom')) fandom = values.join(', ');
              else if (['rating', 'archive warning', 'category', 'relationship', 'character', 'freeform', 'tags', 'additional tags'].some(k => currentLabel.includes(k))) {
                  tags.push(...values);
              }
          }
      }
  } 
  
  if (fandom === "Unknown Fandom" && tags.length === 0) {
       const fandomElement = doc.querySelector('.fandom.tags') || doc.querySelector('.fandoms');
       if (fandomElement && fandomElement.textContent) fandom = cleanText(fandomElement.textContent).replace(/^Fandoms?:\s*/i, '');
       const specificTags = doc.querySelectorAll('.relationship.tags a, .character.tags a, .freeform.tags a');
       if (specificTags.length > 0) specificTags.forEach(el => tags.push(cleanText(el.textContent)));
  }

  // --- Content Extraction ---
  const blocks: TranslationBlock[] = [];
  const chaptersNode = doc.getElementById('chapters');
  let chapterNodes: Element[] = [];

  if (chaptersNode) {
      const modules = Array.from(chaptersNode.children).filter(el => 
          el.classList.contains('userstuff') || el.classList.contains('chapter') || el.getAttribute('role') === 'article'
      );
      if (modules.length > 0) chapterNodes = modules;
      else chapterNodes = [chaptersNode];
  } else {
      const userstuff = doc.querySelector('.userstuff') || doc.body;
      chapterNodes = [userstuff];
  }

  chapterNodes.forEach((chapterEl, index) => {
      let chapterTitle = "";
      const metaHeading = chapterEl.querySelector('.meta h2.heading') || chapterEl.querySelector('.meta h3.heading');
      
      if (metaHeading) {
          chapterTitle = cleanText(metaHeading.textContent);
      } else if (chapterNodes.length > 1) {
          chapterTitle = `Chapter ${index + 1}`;
      }

      if (chapterTitle) {
          blocks.push({
              id: generateId(),
              original: chapterTitle,
              translated: '',
              isEdited: false,
              isLoading: false,
              type: 'header',
              chapterIndex: index
          });
      }

      const contentRoot = chapterEl.querySelector('.userstuff[role="article"]') || chapterEl.querySelector('.userstuff') || chapterEl;
      extractBlocksFromNode(contentRoot, blocks, index);
  });

  if (blocks.length === 0) {
      return { title, author, fandom, tags, url, blocks: splitTextIntoBlocks(doc.body.textContent || "") };
  }

  const reindexedBlocks = recalculateChapterIndices(blocks);

  return { title, author, fandom, tags, url, blocks: reindexedBlocks };
};

const extractBlocksFromNode = (root: Element, blocks: TranslationBlock[], chapterIndex: number) => {
    const relevantTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'LI', 'DIV', 'HR'];
    const allElements = Array.from(root.querySelectorAll('*'));
    
    for (const el of allElements) {
        if (!relevantTags.includes(el.tagName)) continue;

        if (el.closest('.meta') || el.closest('.navigation') || el.closest('.footer') || el.id === 'work_endnotes') continue;

        if (el.tagName === 'DIV') {
            const hasBlockChildren = Array.from(el.children).some(c => relevantTags.includes(c.tagName) && c.tagName !== 'BR');
            if (hasBlockChildren) continue;
        }

        const hasBlockChildren = Array.from(el.children).some(c => relevantTags.includes(c.tagName));
        if (hasBlockChildren && el.tagName !== 'BLOCKQUOTE') continue; 

        const text = cleanText(el.textContent);
        
        if (el.tagName === 'HR') {
            blocks.push({ id: generateId(), original: '---', translated: '---', isEdited: false, isLoading: false, type: 'separator', chapterIndex });
            continue;
        }

        if (text.length < 1) continue; 
        if (text === "Chapter Text") continue;
        
        const cleanT = text.replace(/^[#*]+\s*/, '').replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
        const isMarkdownHeader = /^#+\s/.test(text) || (['H1','H2','H3'].includes(el.tagName) && text.length < 80);
        let isHeader = isMarkdownHeader;

        blocks.push({
            id: generateId(),
            original: text,
            translated: '',
            isEdited: false,
            isLoading: false,
            type: isHeader ? 'header' : 'text',
            chapterIndex
        });
    }
};

export const parseUploadedFile = async (file: File): Promise<{ title: string, author: string, fandom: string, tags: string[], url?: string, blocks: TranslationBlock[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm')) {
        try { resolve(parseHTML(content)); } catch (err) { resolve(fallbackParse(file.name, content)); }
      } else {
        resolve(fallbackParse(file.name, content));
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

const fallbackParse = (filename: string, content: string) => {
    const blocks = splitTextIntoBlocks(content);
    const indexedBlocks = recalculateChapterIndices(blocks);
    
    return {
        title: filename.replace(/\.[^/.]+$/, ""),
        author: "Unknown",
        fandom: "Unknown",
        tags: [],
        url: "",
        blocks: indexedBlocks
    };
};

/**
 * Attempts to fetch AO3 content using multiple public CORS proxies.
 * Note: AO3 often blocks these. This is a best-effort attempt.
 */
export const fetchAO3FromProxy = async (url: string): Promise<{ title: string, author: string, fandom: string, tags: string[], url: string, blocks: TranslationBlock[] }> => {
    // Add view_full_work=true to ensure we get all chapters if it's a multi-chapter URL
    let targetUrl = url;
    if (url.includes('archiveofourown.org/works/') && !url.includes('view_full_work=true')) {
        targetUrl = url.includes('?') ? `${url}&view_full_work=true` : `${url}?view_full_work=true`;
    }

    // Try a list of proxies in order. 
    // Corsproxy.io is often more robust for headers than allorigins.
    const proxies = [
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`
    ];

    let lastError: any;

    for (const proxyUrl of proxies) {
        try {
            const response = await fetch(proxyUrl);
            if (!response.ok) {
                // If 403/429, likely blocked by AO3 via Cloudflare
                continue;
            }
            
            const htmlContent = await response.text();
            
            // Check if we actually got AO3 content or a Cloudflare challenge page
            if (htmlContent.includes('Attention Required! | Cloudflare') || htmlContent.includes('Just a moment...')) {
                throw new Error("Blocked by Cloudflare");
            }

            const result = parseHTML(htmlContent);
            // Basic validation to see if parse worked
            if (!result.title || result.title === "Untitled HTML") {
                 // Try next proxy
                 continue;
            }

            if (!result.url) result.url = url;
            return result;

        } catch (err) {
            lastError = err;
            console.warn(`Proxy failed: ${proxyUrl}`, err);
        }
    }

    // If we get here, all proxies failed
    throw new Error("AO3 Security blocked all proxy attempts. Please use 'File Upload' instead.");
};

export const exportTranslation = (project: TranslationProject, format: 'markdown' | 'html' | 'txt') => {
  let content = '';
  const filename = `${project.metadata.title || 'fanfic'}_${project.metadata.targetLanguage}.${format}`;
  const clean = (t: string) => t.replace(/^[#\s]+/, '');

  if (format === 'markdown') {
    content = `# ${project.metadata.title}\n**Author:** ${project.metadata.author}\n**Source:** ${project.metadata.url || 'N/A'}\n---\n\n`;
    project.blocks.forEach(block => {
      const text = block.translated || block.original;
      if (block.type === 'header') content += `## ${clean(text)}\n\n`;
      else if (block.type === 'separator') content += `---\n\n`;
      else content += `${text}\n\n`;
    });
  } else if (format === 'html') {
    content = `<html><body><h1>${project.metadata.title}</h1>
        ${project.blocks.map(b => {
             const text = clean(b.translated || b.original);
             if (b.type === 'header') return `<h2>${text}</h2>`;
             if (b.type === 'separator') return `<hr/>`;
             return `<p>${b.translated.replace(/\n/g, '<br/>')}</p>`
        }).join('')}</body></html>`;
  } else {
    content = `${project.metadata.title}\n\n`;
    project.blocks.forEach(block => {
      const text = clean(block.translated || block.original);
      if (block.type === 'header') content += `\n[ ${text} ]\n\n`;
      else content += `${text}\n\n`;
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
