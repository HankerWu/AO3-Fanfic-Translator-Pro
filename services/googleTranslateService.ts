
/**
 * Service to interact with Google Translate via Local Proxy (Web API)
 * Does NOT require an API Key, but requires `server.js` running.
 */

export const translateWithGoogle = async (
    texts: string[],
    targetLang: string,
    apiKey?: string // Kept for compatibility, not used for Web API
  ): Promise<string[]> => {
    
    // Map internal language codes if necessary
    let validLang = targetLang;
    if (targetLang === 'zh') validLang = 'zh-CN';
    if (targetLang === 'zh-TW') validLang = 'zh-TW';
  
    // Point to local proxy
    const url = `http://localhost:3001/api/translate`;
  
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: texts,
          target: validLang
        })
      });
  
      if (!response.ok) {
        throw new Error(`Local Backend Error: ${response.status} ${response.statusText}. Please ensure 'node server.js' is running.`);
      }
  
      const data = await response.json();
      
      if (data && Array.isArray(data.translations)) {
        return data.translations;
      }
      
      throw new Error("Invalid response format from Backend Proxy");
  
    } catch (error) {
      console.error("Google Translate Service Error:", error);
      throw error;
    }
  };
