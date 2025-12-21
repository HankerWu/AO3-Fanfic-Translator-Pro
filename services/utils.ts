
import { TranslationBlock, TranslationProject } from '../types';

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const splitTextIntoBlocks = (text: string): TranslationBlock[] => {
  const normalized = text.replace(/\r\n/g, '\n');
  const rawBlocks = normalized.split(/\n\s*\n/);
  return rawBlocks
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => {
      const isMarkdownHeader = /^#+\s/.test(chunk);
      return {
        id: generateId(),
        original: chunk,
        translated: '',
        isEdited: false,
        isLoading: false,
        type: isMarkdownHeader ? 'header' : 'text',
        chapterIndex: 0
      };
    });
};

export const recalculateChapterIndices = (blocks: TranslationBlock[]): TranslationBlock[] => {
    let currentChapterIndex = 0;
    return blocks.map((b, index) => {
        if (b.type === 'header' && index > 0) {
            currentChapterIndex++;
        }
        return { ...b, chapterIndex: currentChapterIndex };
    });
};

export const sanitizeProjectData = (project: TranslationProject): TranslationProject => {
  const cleanBlocks = project.blocks.map(b => ({
      ...b,
      type: b.type || 'text',
      chapterIndex: b.chapterIndex ?? 0,
      note: b.note || '',
      isFavorite: b.isFavorite || false,
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
          url: project.metadata.url || ''
      }
  };
};

export const calculateSimilarity = (oldBlocks: TranslationBlock[], newBlocks: TranslationBlock[]): number => {
    if (oldBlocks.length === 0) return 0;
    const oldTextBlocks = oldBlocks.filter(b => b.type === 'text');
    const newTextBlocks = newBlocks.filter(b => b.type === 'text');
    if (oldTextBlocks.length === 0) return 0;

    const normalizeForComparison = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ');

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
    const normalizeForComparison = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ');
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

    // 1. Parse Metadata
    const title = cleanText(doc.querySelector('.meta h1')?.textContent) || cleanText(doc.querySelector('h1')?.textContent) || doc.title || "Untitled HTML";
    
    // Robust author extraction (handles links and plain text for anons)
    const authorEl = doc.querySelector('.meta .byline');
    let author = "Unknown Author";
    if (authorEl) {
        const link = authorEl.querySelector('a[rel="author"]');
        author = link ? cleanText(link.textContent) : cleanText(authorEl.textContent?.replace(/^by\s+/i, ''));
    }
    
    let url = "";
    // Priority 1: Canonical Link
    const canonical = doc.querySelector('link[rel="canonical"]');
    if (canonical) url = canonical.getAttribute('href') || "";
    
    // Priority 2: Preface/Message Link (Common in AO3 Downloads)
    if (!url) {
        // Look for links specifically containing "works/" but NOT "users/" or "tags/"
        const workLinks = Array.from(doc.querySelectorAll('a[href*="archiveofourown.org/works/"]'));
        // Find the one that matches the pattern ID (works/12345)
        const validLink = workLinks.find(a => /\/works\/\d+$/.test(a.getAttribute('href') || ""));
        if (validLink) {
            url = validLink.getAttribute('href') || "";
        } else if (workLinks.length > 0) {
             // Fallback to first work link if strict regex fails
             url = workLinks[0].getAttribute('href') || "";
        }
    }

    let fandom = "Unknown Fandom";
    const tags: string[] = [];
    const metaDl = doc.querySelector('dl.tags');
    if (metaDl) {
        let currentLabel = "";
        Array.from(metaDl.children).forEach(child => {
            if (child.tagName === 'DT') {
                currentLabel = cleanText(child.textContent).toLowerCase();
            } else if (child.tagName === 'DD') {
                const vals = Array.from(child.querySelectorAll('a')).map(a => cleanText(a.textContent));
                if (vals.length === 0) vals.push(cleanText(child.textContent));
                
                if (currentLabel.includes('fandom')) {
                    fandom = vals.join(', ');
                } else if (['rating','archive','category','relationship','character','tags'].some(k => currentLabel.includes(k))) {
                    tags.push(...vals);
                }
            }
        });
    }

    // 2. Parse Content Blocks
    const blocks: TranslationBlock[] = [];
    const chaptersNode = doc.getElementById('chapters');
    
    let chapterNodes: Element[] = [];
    
    if (chaptersNode) {
        // AO3 HTML downloads usually have <div id="chapters" class="userstuff"> which contains the text directly
        // OR it contains child divs with class "userstuff" or "chapter"
        const children = Array.from(chaptersNode.children);
        const subChapters = children.filter(el => el.classList.contains('userstuff') || el.classList.contains('chapter'));
        
        if (subChapters.length > 0) {
            chapterNodes = subChapters;
        } else {
            // If no sub-chapters, assume #chapters IS the container (common in single chapter downloads)
            chapterNodes = [chaptersNode];
        }
    } else {
        // Fallback for non-standard HTML
        const userstuff = doc.querySelector('.userstuff');
        chapterNodes = userstuff ? [userstuff] : [doc.body];
    }

    chapterNodes.forEach((chapterEl, index) => {
        // Try to find a chapter title
        let chapterTitle = "";
        
        // 1. Look for specific meta heading in multi-chapter structure
        const metaH = chapterEl.querySelector('.meta h2.heading');
        if (metaH) {
            chapterTitle = cleanText(metaH.textContent);
        } 
        // 2. Look for sibling heading (common in single chapter structure: <h2>Title</h2> <div class="userstuff">)
        else if (chapterEl.previousElementSibling && /^H[1-6]$/.test(chapterEl.previousElementSibling.tagName)) {
             const prev = chapterEl.previousElementSibling;
             // Ensure it's a TOC heading or similar
             if (prev.classList.contains('toc-heading') || prev.classList.contains('heading')) {
                 chapterTitle = cleanText(prev.textContent);
             }
        }

        // If multiple chapters found but no title, generate one
        if (!chapterTitle && chapterNodes.length > 1) {
            chapterTitle = `Chapter ${index + 1}`;
        }

        if (chapterTitle) {
            blocks.push({ id: generateId(), original: chapterTitle, translated: '', isEdited: false, isLoading: false, type: 'header', chapterIndex: index });
        }
        
        // If the chapter element itself is .userstuff, use it. Otherwise find the inner .userstuff
        const contentRoot = chapterEl.classList.contains('userstuff') ? chapterEl : (chapterEl.querySelector('.userstuff') || chapterEl);
        
        extractBlocksFromNode(contentRoot, blocks, index);
    });

    if (blocks.length === 0) {
        // Fallback to raw text if structure parsing failed completely
        return { title, author, fandom, tags, url, blocks: splitTextIntoBlocks(doc.body.textContent || "") };
    }

    return { title, author, fandom, tags, url, blocks: recalculateChapterIndices(blocks) };
};

const extractBlocksFromNode = (root: Element, blocks: TranslationBlock[], chapterIndex: number) => {
    // Removed BLOCKQUOTE from relevantTags to prevent duplication (AO3 usually puts <p> inside <blockquote>)
    const relevantTags = ['P', 'H1', 'H2', 'H3', 'H4', 'LI', 'HR']; 
    
    root.querySelectorAll('*').forEach(el => {
        const tagName = el.tagName.toUpperCase();
        if (!relevantTags.includes(tagName)) return;
        
        // Skip metadata/navigation sections
        if (el.closest('.meta') || el.closest('.navigation') || el.id === 'work_endnotes' || el.closest('#afterword')) return;
        
        // Skip divs (shouldn't happen with selector '*' + check, but safe to keep)
        if (tagName === 'DIV') return;

        if (tagName === 'HR') {
            blocks.push({ id: generateId(), original: '---', translated: '---', isEdited: false, isLoading: false, type: 'separator', chapterIndex });
            return;
        }

        const text = cleanText(el.textContent);
        // "Chapter Text" is a common hidden label in AO3 structure
        if (text.length < 1 || text === "Chapter Text") return;
        
        const isHeader = /^#+\s/.test(text) || (['H1','H2','H3','H4'].includes(tagName) && text.length < 100);
        
        blocks.push({ 
            id: generateId(), 
            original: text, 
            translated: '', 
            isEdited: false, 
            isLoading: false, 
            type: isHeader ? 'header' : 'text', 
            chapterIndex 
        });
    });
};

export const parseUploadedFile = async (file: File): Promise<{ title: string, author: string, fandom: string, tags: string[], url?: string, blocks: TranslationBlock[] }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        try { resolve(parseHTML(e.target?.result as string)); }
        catch { 
            const b = splitTextIntoBlocks(e.target?.result as string);
            resolve({ title: file.name, author: "Unknown", fandom: "Unknown", tags: [], blocks: recalculateChapterIndices(b) }); 
        }
    };
    reader.readAsText(file);
  });
};

export const fetchAO3FromProxy = async (url: string): Promise<any> => {
    let targetUrl = url;
    if (url.includes('archiveofourown.org/works/') && !url.includes('view_full_work=true')) {
        targetUrl = url.includes('?') ? `${url}&view_full_work=true` : `${url}?view_full_work=true`;
    }
    const proxies = [`http://localhost:3001/api/proxy?url=${encodeURIComponent(targetUrl)}`]; // Prefer local
    
    try {
        const res = await fetch(proxies[0]);
        if(!res.ok) throw new Error("Proxy failed");
        const html = await res.text();
        const result = parseHTML(html);
        if(!result.url) result.url = url;
        return result;
    } catch(e) {
        throw new Error("Failed to fetch via local proxy. Ensure server.js is running.");
    }
};

export const exportTranslation = (project: TranslationProject, format: 'markdown' | 'html') => {
    let content = '';
    const filename = `${project.metadata.title}_${project.metadata.targetLanguage}.${format}`;
    if (format === 'markdown') {
        content = `# ${project.metadata.title}\n\n`;
        project.blocks.forEach(b => content += b.type==='header' ? `## ${b.translated||b.original}\n\n` : `${b.translated||b.original}\n\n`);
    } else {
        content = `<html><body><h1>${project.metadata.title}</h1>${project.blocks.map(b => `<p>${b.translated||b.original}</p>`).join('')}</body></html>`;
    }
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

export const saveToBackend = async (data: any, filename: string): Promise<boolean> => {
    try {
        const response = await fetch('http://localhost:3001/api/backup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data, filename })
        });
        return response.ok;
    } catch (e) {
        console.warn("Backend backup failed (Server likely offline).", e);
        return false;
    }
};

export const openBackendFolder = async (): Promise<boolean> => {
    try {
        const response = await fetch('http://localhost:3001/api/open-folder', { method: 'POST' });
        return response.ok;
    } catch (e) {
        return false;
    }
};
