// netlify/functions/search.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { keywords, maxResults = 20, showApproved = false } = JSON.parse(event.body);

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

    // Get USPTO data using the proper API structure
    const patents = await getUSPTOData(keywords, maxResults, showApproved);
    
    if (patents.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "No patents found for the given keywords." })
      };
    }

    // Generate practical analysis if Gemini is available
    let practicalInsights = null;
    if (process.env.GEMINI_API_KEY) {
      try {
        practicalInsights = await generatePracticalAnalysis(patents, keywords);
      } catch (error) {
        console.error('Analysis failed:', error);
        practicalInsights = { error: "Analysis temporarily unavailable" };
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        patents: patents,
        insights: practicalInsights,
        metadata: {
          searchTerm: keywords,
          resultsCount: patents.length,
          timestamp: new Date().toISOString(),
          dataSource: 'uspto',
          patentType: showApproved ? 'approved' : 'new'
        }
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

async function getUSPTOData(keywords, maxResults, showApproved) {
  try {
    // Configure the API query based on patent type
    const filters = [
      {
        name: "applicationMetaData.applicationTypeLabelName",
        value: ["Utility"]
      }
    ];
    
    // Add filter for patent type
    if (showApproved) {
      filters.push({
        name: "applicationMetaData.publicationCategoryBag",
        value: ["Granted/Issued"]
      });
    } else {
      filters.push({
        name: "applicationMetaData.publicationCategoryBag",
        value: ["Pre-Grant Publications - PGPub"]
      });
    }

    const searchPayload = {
      q: keywords,
      filters: filters,
      rangeFilters: [
        {
          field: "applicationMetaData.filingDate",
          valueFrom: "2020-01-01",
          valueTo: new Date().toISOString().split('T')[0]
        }
      ],
      pagination: {
        offset: 0,
        limit: Math.min(maxResults, 25)
      },
      sort: [
        {
          field: "applicationMetaData.filingDate",
          order: "Desc"
        }
      ],
      fields: [
        "applicationNumberText",
        "applicationMetaData",
        "patentApplicationPublication",
        "patentGrant"
      ]
    };

    const response = await fetch('https://api.uspto.gov/api/v1/patent/applications/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.USPTO_API_KEY
      },
      body: JSON.stringify(searchPayload)
    });

    if (!response.ok) {
      throw new Error(`USPTO API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return (data.patentFileWrapperDataBag || []).map(patent => {
      const metadata = patent.applicationMetaData || {};
      const publication = patent.patentApplicationPublication || {};
      const grant = patent.patentGrant || {};
      
      // Extract inventors properly
      const inventors = [];
      if (metadata.inventorBag) {
        metadata.inventorBag.forEach(inventor => {
          const firstName = inventor.firstName || '';
          const lastName = inventor.lastName || '';
          const name = `${firstName} ${lastName}`.trim() || 'Unknown';
          const location = inventor.correspondenceAddressBag && inventor.correspondenceAddressBag.length > 0 
            ? `${inventor.correspondenceAddressBag[0].cityName || ''}, ${inventor.correspondenceAddressBag[0].geographicRegionName || ''}`.trim() 
            : 'Unknown';
          inventors.push({ name, location });
        });
      }

      // Extract assignees properly  
      const assignees = [];
      if (metadata.applicantBag) {
        metadata.applicantBag.forEach(applicant => {
          if (applicant.applicantNameText) {
            assignees.push({ name: applicant.applicantNameText, type: 'Organization' });
          }
        });
      }

      // Extract abstract from multiple possible sources
      let abstract = 'Abstract not available';
      if (publication.abstract) {
        abstract = publication.abstract;
      } else if (grant.abstract) {
        abstract = grant.abstract;
      } else if (metadata.inventionTitle) {
        abstract = metadata.inventionTitle;
      }

      return {
        patent_id: patent.applicationNumberText || `temp-${Math.random().toString(36).substr(2, 9)}`,
        publication_number: patent.applicationNumberText || 'N/A',
        title: metadata.inventionTitle || 'Title not available',
        inventor: inventors.length > 0 ? inventors.map(i => i.name).join(', ') : 'Unknown',
        assignee: assignees.length > 0 ? assignees.map(a => a.name).join(', ') : 'Unknown',
        publication_date: metadata.publicationDate || publication.publicationDate || metadata.filingDate || 'Unknown',
        filing_date: metadata.filingDate || 'Unknown',
        snippet: abstract.substring(0, 200) + (abstract.length > 200 ? '...' : ''),
        abstract: abstract,
        status: metadata.applicationStatusDescriptionText || 'Unknown',
        classification: {
          primary: metadata.uspcSymbolText || 'Unknown',
          ipc: metadata.cpcClassificationBag && metadata.cpcClassificationBag.length > 0 
            ? metadata.cpcClassificationBag[0] 
            : 'Unknown'
        },
        inventors_detailed: inventors,
        assignees_detailed: assignees
      };
    });

  } catch (error) {
    console.error('USPTO API Error:', error);
    throw new Error(`Failed to fetch patent data: ${error.message}`);
  }
}

async function generatePracticalAnalysis(patents, searchTerm) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY || !patents || patents.length === 0) {
    return {
      techBreakdown: [],
      competitorActivity: { topPlayers: [], filingPatterns: "No data available" },
      practicalUses: [],
      techMaturity: "Unknown",
      interestingFindings: [],
      patentStrength: "Assessment needed"
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    
    // Try different model names
    let model;
    try {
      model = genAI.getGenerativeModel({ model: "gemini-pro" });
    } catch (e) {
      try {
        model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
      } catch (e2) {
        console.error('Both model names failed:', e2);
        throw new Error('No valid model available');
      }
    }

    // Prepare focused patent data for analysis
    const patentData = patents.slice(0, 8).map(p => ({
      title: p.title,
      abstract: p.abstract.substring(0, 400),
      assignee: p.assignee,
      inventor: p.inventor,
      filing_date: p.filing_date,
      classification: p.classification?.primary || 'Unknown'
    }));

    const prompt = `Analyze these ${patents.length} recent patents for "${searchTerm}" and extract specific, actionable insights:

${JSON.stringify(patentData, null, 1)}

Extract practical intelligence - no corporate jargon or generic advice. Focus on what patent researchers actually need:

1. Technical mechanisms: How do these inventions actually work? What are the core technical approaches?

2. Company activity: Which organizations are most active? What are their specific focus areas? Any notable filing patterns?

3. Real applications: Where is this technology being used or could realistically be deployed? Market readiness status?

4. Technology maturity: Is this early research, ready for commercialization, or already in market?

5. Notable patterns: Any interesting trends in dates, inventor movements, or technical approaches?

6. Patent landscape: Are these broad foundational patents or narrow improvements? Strength assessment?

Give me specific, concrete observations that help understand this technology space.

Return as JSON:
{
  "techBreakdown": [
    {"mechanism": "specific approach", "howItWorks": "plain explanation", "keyInnovation": "unique aspect"}
  ],
  "competitorActivity": {
    "topPlayers": [{"company": "name", "focus": "specific area", "filingTrend": "pattern observed"}],
    "filingPatterns": "specific observations about timing/strategy"
  },
  "practicalUses": [
    {"application": "real use case", "marketReady": "yes/no/partial", "obstacles": "specific barriers"}
  ],
  "techMaturity": "early research/proof of concept/pilot stage/commercial deployment",
  "interestingFindings": ["specific notable observations"],
  "patentStrength": "assessment of breadth and defensibility"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse as JSON first
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      }
    } catch (parseError) {
      console.warn('Could not parse AI response as JSON');
    }

    // Fallback to structured response with raw text
    return {
      techBreakdown: [
        {
          mechanism: "Technology Analysis", 
          howItWorks: text.substring(0, 300),
          keyInnovation: "See detailed analysis"
        }
      ],
      competitorActivity: {
        topPlayers: patents.slice(0, 3).map(p => ({
          company: p.assignee || 'Unknown',
          focus: p.title.substring(0, 50) + '...',
          filingTrend: 'Analysis needed'
        })),
        filingPatterns: "Detailed analysis available below"
      },
      practicalUses: [
        {
          application: `${searchTerm} applications`,
          marketReady: "Assessment in progress",
          obstacles: "See analysis details"
        }
      ],
      techMaturity: "Analysis in progress",
      interestingFindings: ["Detailed analysis available"],
      patentStrength: "Requires claim review",
      rawAnalysis: text
    };

  } catch (error) {
    console.error('AI Analysis Error:', error);
    return {
      techBreakdown: [],
      competitorActivity: { topPlayers: [], filingPatterns: "Analysis failed" },
      practicalUses: [],
      techMaturity: "Analysis failed",
      interestingFindings: [`Analysis error: ${error.message}`],
      patentStrength: "Could not assess",
      error: error.message
    };
  }
}
