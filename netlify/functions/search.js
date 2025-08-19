const axios = require('axios');

// Cache for storing patent analysis results
const analysisCache = new Map();

// Function to analyze patent with Gemini AI
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
      Analyze this patent and provide a comprehensive business intelligence report:
      
      PATENT DETAILS:
      - Title: ${patentData.title}
      - Patent ID: ${patentData.patent_id}
      - Publication Date: ${patentData.publication_date}
      - Inventor: ${patentData.inventor || 'Not available'}
      - Assignee: ${patentData.assignee || 'Not available'}
      
      ABSTRACT:
      ${patentData.snippet || patentData.abstract || 'No abstract available'}
      
      Provide a detailed analysis with these sections:
      
      **EXECUTIVE SUMMARY**
      Provide a 2-3 sentence overview of the patent's significance and commercial potential.
      
      **1. TECHNICAL ANALYSIS**
      - Core Innovation: What's the main technical breakthrough?
      - Technical Complexity: How sophisticated is this technology?
      - Implementation Requirements: What would it take to build this?
      
      **2. BUSINESS IMPACT & MARKET POTENTIAL**
      - Market Applications: Where can this technology be commercialized?
      - Industry Disruption: Which industries could be affected?
      - Revenue Opportunities: What are the monetization paths?
      - Market Size: Estimate the addressable market
      
      **3. COMPETITIVE LANDSCAPE**
      - Competitive Advantage: What edge does this provide?
      - Market Position: How does this compare to existing solutions?
      - Barriers to Entry: What prevents competitors from copying this?
      
      **4. STRATEGIC RECOMMENDATIONS**
      - Investment Thesis: Should companies invest in this area?
      - Partnership Opportunities: Who should collaborate on this?
      - Licensing Strategy: How should IP be monetized?
      - Risk Mitigation: How to minimize implementation risks?
      
      **5. IMPLEMENTATION ROADMAP**
      - Development Timeline: How long to bring to market?
      - Resource Requirements: What capabilities are needed?
      - Key Milestones: What are the critical success factors?
      
      Format with clear headers and actionable insights.
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

// Function to get USPTO data
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
          snippet: metaData.abstractText || "No abstract available.",
          abstract: metaData.abstractText || "No abstract available."
        };
      });
    }
    return [];
  } catch (error) {
    console.log('USPTO API failed:', error.message);
    throw new Error('Failed to fetch patents from USPTO API');
  }
}

// Function to analyze patent landscape
async function analyzePatentLandscape(patents, keywords) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return "Landscape analysis unavailable: API key not configured properly.";
    }

    const patentsSummary = patents.slice(0, 10).map(p => ({
      title: p.title,
      id: p.patent_id,
      date: p.publication_date,
      assignee: p.assignee
    }));
    
    const prompt = `
      Based on these ${patents.length} patents related to "${keywords}", provide a comprehensive business landscape analysis:
      
      PATENTS SAMPLE:
      ${JSON.stringify(patentsSummary, null, 2)}
      
      Analyze and provide:
      
      **1. TECHNOLOGY TRENDS & EVOLUTION**
      - Emerging patterns in innovation
      - Technology maturity assessment
      - Future development directions
      
      **2. COMPETITIVE INTELLIGENCE**
      - Key players and market leaders
      - Patent filing strategies
      - Innovation hotspots and gaps
      
      **3. MARKET OPPORTUNITIES**
      - White space identification
      - Underexplored applications
      - Cross-industry potential
      
      **4. STRATEGIC RECOMMENDATIONS**
      - Market entry strategies
      - Partnership opportunities
      - IP acquisition targets
      - R&D investment areas
      
      **5. RISK ASSESSMENT**
      - Patent thickets and barriers
      - Litigation risks
      - Technology obsolescence threats
      
      Provide actionable business insights with specific recommendations.
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

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { keywords, maxResults = 20 } = JSON.parse(event.body);

    if (!keywords || keywords.trim() === '') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "No keywords provided." })
      };
    }

    if (!process.env.USPTO_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "USPTO API key not configured." })
      };
    }

    // Get USPTO data
    const processedPatents = await getUSPTOData(keywords, maxResults);
    
    if (processedPatents.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "No patents found for the given keywords." })
      };
    }

    // Get AI analysis for patents if Gemini is configured
    let patentsWithAnalysis = processedPatents;
    
    if (process.env.GEMINI_API_KEY) {
      // Analyze first 5 patents to manage API load and response time
      const patentsToAnalyze = processedPatents.slice(0, 5);
      const analyzedPatents = await Promise.all(
        patentsToAnalyze.map(async (patent) => {
          try {
            const analysis = await analyzePatentWithAI(patent);
            return { ...patent, analysis };
          } catch (error) {
            console.error(`Failed to analyze patent ${patent.patent_id}:`, error);
            return { ...patent, analysis: "Analysis failed for this patent." };
          }
        })
      );
      
      // Add remaining patents without detailed analysis
      const remainingPatents = processedPatents.slice(5).map(patent => ({
        ...patent,
        analysis: "Analysis not performed due to rate limiting. Refresh to analyze more patents."
      }));
      
      patentsWithAnalysis = [...analyzedPatents, ...remainingPatents];
    }

    // Get landscape analysis if Gemini is configured
    let landscapeAnalysis = "Landscape analysis not configured.";
    if (process.env.GEMINI_API_KEY) {
      try {
        landscapeAnalysis = await analyzePatentLandscape(processedPatents, keywords);
      } catch (error) {
        console.error('Landscape analysis failed:', error);
        landscapeAnalysis = "Landscape analysis failed.";
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        patents: patentsWithAnalysis,
        landscape: landscapeAnalysis,
        total: processedPatents.length,
        dataSource: 'uspto'
      })
    };

  } catch (error) {
    console.error('Error in search function:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: `Search failed: ${error.message}`
      })
    };
  }
};
