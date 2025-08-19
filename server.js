require('dotenv').config();

const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Debug: Check if environment variables are loading
console.log('Environment check:');
console.log('USPTO_API_KEY exists:', !!process.env.USPTO_API_KEY);
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));

// Cache for storing patent analysis results
const analysisCache = new Map();

// Test the new USPTO API endpoint
app.get('/test-new-uspto', async (req, res) => {
  try {
    const testKey = process.env.USPTO_API_KEY;
    
    const testCases = [
      {
        name: 'New ODP API - Applications Search',
        url: 'https://api.uspto.gov/api/v1/patent/applications/search',
        params: { q: 'apple', limit: 3 },
        headers: { 'x-api-key': testKey }
      }
    ];

    const results = [];
    
    for (const testCase of testCases) {
      try {
        const config = {
          timeout: 15000,
          params: testCase.params,
          headers: testCase.headers
        };
        
        const response = await axios.get(testCase.url, config);
        results.push({
          name: testCase.name,
          status: response.status,
          success: true,
          data: response.data
        });
      } catch (error) {
        results.push({
          name: testCase.name,
          status: error.response?.status || 'no response',
          success: false,
          error: error.message,
          responseData: error.response?.data
        });
      }
      
      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test Gemini API
app.get('/test-gemini', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        contents: [
          {
            parts: [
              {
                text: "Explain how AI works in a few words"
              }
            ]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': process.env.GEMINI_API_KEY
        },
        timeout: 15000
      }
    );

    res.json({ 
      success: true, 
      response: response.data 
    });
  } catch (error) {
    console.error('Gemini API test failed:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Gemini API test failed',
      details: error.response?.data || error.message
    });
  }
});

// Function to analyze patent with Gemini AI using the correct API endpoint
async function analyzePatentWithAI(patentData) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return "AI analysis unavailable: API key not configured properly.";
    }

    // Check cache first
    const cacheKey = JSON.stringify(patentData);
    if (analysisCache.has(cacheKey)) {
      return analysisCache.get(cacheKey);
    }

    const prompt = `
      Analyze this patent and provide a comprehensive report with the following sections:
      
      PATENT DETAILS:
      - Title: ${patentData.title}
      - Patent ID: ${patentData.patent_id}
      - Publication Date: ${patentData.publication_date}
      - Inventor: ${patentData.inventor || 'Not available'}
      - Assignee: ${patentData.assignee || 'Not available'}
      
      ABSTRACT:
      ${patentData.snippet || 'No abstract available'}
      
      Please provide a detailed analysis with these sections:
      1. Technical Summary: Explain the patent's technology in simple terms
      2. Innovation Assessment: Evaluate the novelty and uniqueness
      3. Commercial Potential: Identify possible applications and market opportunities
      4. Competitive Landscape: Analyze how this affects existing market players
      5. Risks and Challenges: Identify potential implementation barriers
      6. Strategic Recommendations: Suggest how a company might leverage or work around this patent
      
      Format the response in clear sections with headings.
    `;

    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': process.env.GEMINI_API_KEY
        },
        timeout: 30000
      }
    );

    const analysis = response.data.candidates[0].content.parts[0].text;
    
    // Cache the result
    analysisCache.set(cacheKey, analysis);
    
    return analysis;
  } catch (error) {
    console.error('Error in AI analysis:', error.response?.data || error.message);
    return "AI analysis is temporarily unavailable. Please try again later.";
  }
}

// Function to analyze patent landscape with Gemini AI
async function analyzePatentLandscape(patents, keywords) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return "Landscape analysis unavailable: API key not configured properly.";
    }

    // Prepare a summary of patents for landscape analysis
    const patentsSummary = patents.map(p => ({
      title: p.title,
      id: p.patent_id,
      date: p.publication_date,
      assignee: p.assignee
    }));
    
    const prompt = `
      Based on the following set of patents related to "${keywords}", provide a comprehensive business landscape analysis:
      
      PATENTS SUMMARY:
      ${JSON.stringify(patentsSummary, null, 2)}
      
      Please analyze and provide:
      
      1. TECHNOLOGY TRENDS: Identify emerging patterns and technology evolution
      2. KEY PLAYERS: Identify companies/inventors dominating this space
      3. WHITE SPACE OPPORTUNITIES: Identify areas with limited patent activity
      4. POTENTIAL COLLABORATIONS: Suggest possible partnership opportunities
      5. INTELLECTUAL PROPERTY STRATEGY: Recommend approaches for innovation protection
      6. MARKET ENTRY CONSIDERATIONS: Highlight barriers and advantages for new entrants
      
      Provide actionable business insights and strategic recommendations.
    `;

    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': process.env.GEMINI_API_KEY
        },
        timeout: 30000
      }
    );

    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error in landscape analysis:', error.response?.data || error.message);
    return "Landscape analysis is temporarily unavailable.";
  }
}

// Try to get data from the new USPTO ODP API
async function getUSPTOData(keywords, maxResults = 20) {
  try {
    const response = await axios.get('https://api.uspto.gov/api/v1/patent/applications/search', {
      params: {
        q: `applicationMetaData.inventionTitle:${keywords}* OR applicationMetaData.abstractText:${keywords}*`,
        limit: maxResults
      },
      headers: {
        'x-api-key': process.env.USPTO_API_KEY
      },
      timeout: 20000
    });

    console.log('USPTO API response structure:', JSON.stringify(response.data, null, 2).substring(0, 500) + '...');

    if (response.data && response.data.patentFileWrapperDataBag) {
      return response.data.patentFileWrapperDataBag.map(patent => {
        const metaData = patent.applicationMetaData || {};
        
        // Extract inventor names properly
        let inventors = 'Unknown';
        if (metaData.inventorName && Array.isArray(metaData.inventorName)) {
          inventors = metaData.inventorName.join(', ');
        } else if (metaData.inventorName) {
          inventors = metaData.inventorName;
        }
        
        // Extract assignee properly
        let assignee = 'Unknown';
        if (metaData.assigneeName) {
          assignee = metaData.assigneeName;
        } else if (metaData.assignee && metaData.assignee.name) {
          assignee = metaData.assignee.name;
        }
        
        return {
          patent_id: patent.applicationNumberText || `US${Math.floor(Math.random() * 10000000)}`,
          publication_number: patent.applicationNumberText || 'N/A',
          title: metaData.inventionTitle || 'Untitled Patent',
          inventor: inventors,
          assignee: assignee,
          publication_date: metaData.filingDate || new Date().toISOString().split('T')[0],
          snippet: metaData.abstractText || "No abstract available."
        };
      });
    }
    return [];
  } catch (error) {
    console.log('New USPTO ODP API failed:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
    return [];
  }
}

// Search endpoint with the new USPTO API
app.post('/search', async (req, res) => {
  const { keywords, maxResults = 20 } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    console.warn("Gemini API key not found. AI features will be disabled.");
  }

  if (!keywords || keywords.trim() === '') {
    return res.status(400).json({ error: "No keywords provided." });
  }

  try {
    let processedPatents = [];
    let dataSource = 'sample';
    
    // Try to get data from the new USPTO ODP API if key is available
    if (process.env.USPTO_API_KEY) {
      const usptoData = await getUSPTOData(keywords, maxResults);
      if (usptoData.length > 0) {
        processedPatents = usptoData;
        dataSource = 'uspto';
        console.log(`Successfully retrieved ${usptoData.length} patents from USPTO ODP API`);
      } else {
        return res.status(500).json({ error: "USPTO API returned no results. Please try different keywords." });
      }
    } else {
      return res.status(500).json({ error: "USPTO API key not configured." });
    }

    // Get AI analysis for each patent if Gemini is configured
    let patentsWithAnalysis = processedPatents;
    
    if (process.env.GEMINI_API_KEY) {
      // Get AI analysis for each patent (first 3 to manage API load)
      patentsWithAnalysis = await Promise.all(
        processedPatents.slice(0, 3).map(async (patent) => {
          try {
            const analysis = await analyzePatentWithAI(patent);
            return { ...patent, analysis };
          } catch (error) {
            console.error(`Failed to analyze patent ${patent.patent_id}:`, error);
            return { ...patent, analysis: "Analysis failed for this patent." };
          }
        })
      );
      
      // Add remaining patents without analysis
      const remainingPatents = processedPatents.slice(3).map(patent => ({
        ...patent,
        analysis: "Analysis not performed due to rate limiting."
      }));
      
      patentsWithAnalysis = [...patentsWithAnalysis, ...remainingPatents];
    } else {
      // Add placeholder analysis if Gemini not configured
      patentsWithAnalysis = processedPatents.map(patent => ({
        ...patent,
        analysis: "AI analysis not configured. Please check your Gemini API key."
      }));
    }

    // Get landscape analysis if Gemini is configured
    let landscapeAnalysis = "Landscape analysis not configured. Please check your Gemini API key.";
    if (process.env.GEMINI_API_KEY) {
      try {
        landscapeAnalysis = await analyzePatentLandscape(processedPatents, keywords);
      } catch (error) {
        console.error('Landscape analysis failed:', error);
        landscapeAnalysis = "Landscape analysis failed.";
      }
    }

    res.json({ 
      patents: patentsWithAnalysis, 
      landscape: landscapeAnalysis,
      total: processedPatents.length,
      dataSource: dataSource
    });

  } catch (error) {
    console.error('Error in search:', error.message);
    
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ error: "Request timeout. Please try again." });
    } else if (error.response) {
      if (error.response.status === 401 || error.response.status === 403) {
        return res.status(403).json({ error: "Authentication failed. Please check your API key." });
      } else if (error.response.status === 429) {
        return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
      } else {
        return res.status(error.response.status).json({ 
          error: `API Error: ${error.response.data.message || error.response.statusText}` 
        });
      }
    } else if (error.request) {
      return res.status(503).json({ error: 'The USPTO API is currently unavailable. Please try again later.' });
    } else {
      return res.status(500).json({ error: 'An unknown server error occurred.' });
    }
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Visit http://localhost:${PORT}/test-new-uspto to test the new USPTO ODP API`);
  console.log(`Visit http://localhost:${PORT}/test-gemini to test the Gemini API`);
});
