// State management
const state = {
  selectedFile: null,
  requestId: null,
  analysisId: null,
};

// DOM Elements
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const uploadButton = document.getElementById('upload-button');
const ingestButton = document.getElementById('ingest-button');
const analyzeButton = document.getElementById('analyze-button');
const fileInfo = document.getElementById('file-info');
const fileName = document.getElementById('file-name');
const fileSize = document.getElementById('file-size');
const progressSection = document.getElementById('progress-section');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const resultsEmpty = document.getElementById('results-empty');
const resultsContent = document.getElementById('results-content');
const resultsLoading = document.getElementById('results-loading');
const healthStatus = document.getElementById('health-status');
const healthText = document.getElementById('health-text');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  checkSystemHealth();
  setInterval(checkSystemHealth, 30000); // Check every 30 seconds
});

// Event Listeners
function setupEventListeners() {
  // Upload zone click
  uploadButton.addEventListener('click', () => fileInput.click());
  uploadZone.addEventListener('click', (e) => {
    if (e.target !== uploadButton) fileInput.click();
  });

  // File input change
  fileInput.addEventListener('change', handleFileSelect);

  // Drag and drop
  uploadZone.addEventListener('dragover', handleDragOver);
  uploadZone.addEventListener('dragleave', handleDragLeave);
  uploadZone.addEventListener('drop', handleDrop);

  // Action buttons
  ingestButton.addEventListener('click', handleIngest);
  analyzeButton.addEventListener('click', handleAnalyze);

  // Sample documents
  document.querySelectorAll('.sample-doc').forEach(btn => {
    btn.addEventListener('click', handleSampleDoc);
  });

  // Copy email button
  document.getElementById('copy-email')?.addEventListener('click', handleCopyEmail);
}

// Health Check
async function checkSystemHealth() {
  try {
    const response = await fetch('/api/healthz');
    const data = await response.json();

    const statusIndicator = healthStatus.querySelector('.status-indicator');
    statusIndicator.className = 'status-indicator';

    if (data.status === 'healthy') {
      statusIndicator.classList.add('status-healthy');
      healthText.textContent = 'Healthy';
    } else if (data.status === 'degraded') {
      statusIndicator.classList.add('status-degraded');
      healthText.textContent = 'Degraded';
    } else {
      statusIndicator.classList.add('status-unhealthy');
      healthText.textContent = 'Unhealthy';
    }
  } catch (error) {
    const statusIndicator = healthStatus.querySelector('.status-indicator');
    statusIndicator.className = 'status-indicator status-unhealthy';
    healthText.textContent = 'Error';
  }
}

// File Selection
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    selectFile(file);
  }
}

function selectFile(file) {
  // Validate file size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    alert('File size exceeds 10MB limit');
    return;
  }

  // Validate file type
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    alert('File type not supported. Please upload PDF, DOCX, or TXT files.');
    return;
  }

  state.selectedFile = file;
  
  // Display file info
  fileInfo.classList.remove('hidden');
  fileName.textContent = file.name;
  fileSize.textContent = `${(file.size / 1024).toFixed(2)} KB`;
  
  // Enable ingest button
  ingestButton.disabled = false;
  
  // Reset analysis state
  state.requestId = null;
  state.analysisId = null;
  analyzeButton.disabled = true;
  hideResults();
}

// Drag and Drop
function handleDragOver(event) {
  event.preventDefault();
  uploadZone.classList.add('drag-over');
}

function handleDragLeave() {
  uploadZone.classList.remove('drag-over');
}

function handleDrop(event) {
  event.preventDefault();
  uploadZone.classList.remove('drag-over');
  
  const file = event.dataTransfer.files[0];
  if (file) {
    fileInput.files = event.dataTransfer.files;
    selectFile(file);
  }
}

// Ingest Document
async function handleIngest() {
  if (!state.selectedFile) return;

  try {
    ingestButton.disabled = true;
    showProgress('Ingesting document...');

    const formData = new FormData();
    formData.append('document', state.selectedFile);

    const response = await fetch('/api/ingest', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to ingest document');
    }

    const result = await response.json();
    state.requestId = result.data.requestId;

    updateProgress(100);
    
    // Show success message
    setTimeout(() => {
      hideProgress();
      alert(`Document ingested successfully!\n\nRedacted ${result.data.redactionCount} PII items:\n- Emails: ${result.data.redactionsByType.email}\n- Phones: ${result.data.redactionsByType.phone}\n- SSNs: ${result.data.redactionsByType.ssn}`);
      
      // Enable analyze button
      analyzeButton.disabled = false;
    }, 500);

  } catch (error) {
    hideProgress();
    alert(`Error: ${error.message}`);
    ingestButton.disabled = false;
  }
}

// Analyze Document
async function handleAnalyze() {
  if (!state.requestId) return;

  try {
    analyzeButton.disabled = true;
    showResultsLoading();

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        request_id: state.requestId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to analyze document');
    }

    const result = await response.json();
    state.analysisId = result.data.analysisId;

    // Display results
    displayResults(result.data);

  } catch (error) {
    hideResultsLoading();
    alert(`Error: ${error.message}`);
    analyzeButton.disabled = false;
  }
}

// Display Results
function displayResults(data) {
  hideResultsLoading();
  resultsEmpty.classList.add('hidden');
  resultsContent.classList.remove('hidden');

  // Classification
  document.getElementById('doc-type').textContent = data.classification.documentType.replace('_', ' ').toUpperCase();
  document.getElementById('doc-confidence').textContent = `${(data.classification.confidence * 100).toFixed(1)}%`;
  document.getElementById('doc-reasoning').textContent = data.classification.reasoning;

  // Extracted Fields
  const fieldsContainer = document.getElementById('extracted-fields');
  fieldsContainer.innerHTML = '';
  
  Object.entries(data.extractedFields.fields).forEach(([key, value]) => {
    if (value !== null && value !== '') {
      const fieldDiv = document.createElement('div');
      fieldDiv.className = 'bg-gray-50 p-2 rounded text-sm';
      fieldDiv.innerHTML = `<span class="font-semibold text-gray-700">${key}:</span> <span class="text-gray-600">${JSON.stringify(value)}</span>`;
      fieldsContainer.appendChild(fieldDiv);
    }
  });

  // RAG Rules
  document.getElementById('rules-count').textContent = data.rag.rulesRetrieved;
  const rulesList = document.getElementById('rules-list');
  rulesList.innerHTML = '';
  
  data.rag.rules.forEach(rule => {
    const ruleDiv = document.createElement('div');
    ruleDiv.className = 'text-xs text-gray-600';
    ruleDiv.innerHTML = `<span class="font-semibold">${rule.id}:</span> ${rule.title} <span class="badge badge-${rule.severity} ml-2">${rule.severity}</span>`;
    rulesList.appendChild(ruleDiv);
  });

  // Compliance Counts
  document.getElementById('compliant-count').textContent = data.compliance.compliantCount;
  document.getElementById('non-compliant-count').textContent = data.compliance.nonCompliantCount;
  document.getElementById('review-count').textContent = data.compliance.needsReviewCount;

  // Checklist Items
  const checklistContainer = document.getElementById('checklist-items');
  checklistContainer.innerHTML = '';
  
  data.compliance.checklist.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'border rounded-lg p-3';
    
    const statusBadge = `<span class="badge badge-${item.status}">${item.status.replace('_', ' ')}</span>`;
    const severityBadge = `<span class="badge badge-${item.severity}">${item.severity}</span>`;
    
    itemDiv.innerHTML = `
      <div class="flex justify-between items-start mb-2">
        <span class="font-semibold text-gray-700">${item.requirement}</span>
        <div class="flex gap-2">
          ${statusBadge}
          ${severityBadge}
        </div>
      </div>
      <p class="text-sm text-gray-600 mb-1">${item.evidence}</p>
      <p class="text-xs text-blue-600">Rule: ${item.ruleId}</p>
    `;
    checklistContainer.appendChild(itemDiv);
  });

  // Negotiation Brief
  document.getElementById('negotiation-brief').textContent = data.outputs.negotiationBrief;

  // Client Email
  document.getElementById('client-email').textContent = data.outputs.clientEmail;
}

// Sample Documents
async function handleSampleDoc(event) {
  const type = event.target.dataset.type;
  
  // Create sample content based on type
  let content = '';
  let filename = '';
  
  switch (type) {
    case 'profile':
      filename = 'sample-company-profile.txt';
      content = `COMPANY PROFILE

Company Name: Acme Government Solutions LLC
UEI: A1B2C3D4E5F6
DUNS: 123456789
CAGE Code: 1A2B3

NAICS Codes:
- 541512 (Computer Systems Design Services)
- 541519 (Other Computer Related Services)
- 541611 (Administrative Management Consulting)

Contact Information:
Address: 1234 Main Street, Suite 100, Washington DC 20001
Phone: (555) 123-4567
Email: contact@acmegovsolutions.com
Website: www.acmegovsolutions.com

Company Overview:
Acme Government Solutions is a leading provider of IT consulting and systems integration services to federal agencies. Founded in 2010, we specialize in cloud migration, cybersecurity, and digital transformation initiatives.

Our team of 50+ certified professionals has successfully delivered over 100 projects for various government agencies including DOD, DHS, and GSA.`;
      break;
      
    case 'performance':
      filename = 'sample-past-performance.txt';
      content = `PAST PERFORMANCE REFERENCE

Contract Number: GS-00F-12345
Client: Department of Homeland Security
Contract Value: $2,500,000
Period: January 2022 - December 2024

Project Description:
Provided comprehensive IT security assessment and implementation services for DHS field offices nationwide. Project included vulnerability assessments, security architecture design, and implementation of next-generation firewalls and intrusion detection systems.

Key Accomplishments:
- Assessed security posture of 25 field offices
- Implemented unified security platform reducing incidents by 60%
- Trained 200+ staff members on security best practices
- Achieved 100% on-time delivery for all milestones

Contract Number: W52P1J-20-C-0045
Client: U.S. Army Corps of Engineers
Contract Value: $1,750,000
Period: March 2020 - August 2022

Project Description:
Developed and deployed custom project management software for tracking construction projects across multiple districts.

Key Accomplishments:
- Built scalable cloud-based solution serving 500+ users
- Reduced project tracking time by 40%
- Achieved 99.9% uptime over 2-year period`;
      break;
      
    case 'pricing':
      filename = 'sample-pricing-sheet.txt';
      content = `PRICING SHEET - LABOR CATEGORIES

Geographic Area: Washington DC Metro Area
Escalation Rate: 2.5% annually

Labor Category: Senior IT Consultant
Education: Bachelor's Degree in Computer Science or related field
Experience: 10+ years in IT consulting
Hourly Rate: $185.00
Rate Breakdown:
- Base Labor: $95.00
- Fringe Benefits: $28.50
- Overhead: $38.00
- G&A: $14.25
- Profit: $9.25

Labor Category: IT Systems Analyst
Education: Bachelor's Degree in Information Technology
Experience: 5-7 years in systems analysis
Hourly Rate: $135.00
Rate Breakdown:
- Base Labor: $70.00
- Fringe Benefits: $21.00
- Overhead: $28.00
- G&A: $10.50
- Profit: $5.50

Labor Category: Junior Developer
Education: Associate Degree or equivalent experience
Experience: 2-3 years in software development
Hourly Rate: $95.00
Rate Breakdown:
- Base Labor: $50.00
- Fringe Benefits: $15.00
- Overhead: $20.00
- G&A: $7.50
- Profit: $2.50

Labor Category: Project Manager
Education: Bachelor's Degree + PMP Certification
Experience: 8+ years in project management
Hourly Rate: $165.00
Rate Breakdown:
- Base Labor: $85.00
- Fringe Benefits: $25.50
- Overhead: $34.00
- G&A: $12.75
- Profit: $7.75`;
      break;
  }
  
  // Create a File object from the sample content
  const blob = new Blob([content], { type: 'text/plain' });
  const file = new File([blob], filename, { type: 'text/plain' });
  
  // Update file input and select the file
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  fileInput.files = dataTransfer.files;
  
  selectFile(file);
}

// Copy Email to Clipboard
function handleCopyEmail() {
  const emailText = document.getElementById('client-email').textContent;
  navigator.clipboard.writeText(emailText).then(() => {
    const btn = document.getElementById('copy-email');
    const originalText = btn.textContent;
    btn.textContent = '✓ Copied!';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  });
}

// Progress Management
function showProgress(message) {
  progressSection.classList.remove('hidden');
  progressText.textContent = message;
  updateProgress(0);
}

function updateProgress(percent) {
  progressBar.style.width = `${percent}%`;
  progressText.textContent = `${percent}%`;
}

function hideProgress() {
  progressSection.classList.add('hidden');
}

// Results Management
function showResultsLoading() {
  resultsEmpty.classList.add('hidden');
  resultsContent.classList.add('hidden');
  resultsLoading.classList.remove('hidden');
}

function hideResultsLoading() {
  resultsLoading.classList.add('hidden');
}

function hideResults() {
  resultsContent.classList.add('hidden');
  resultsLoading.classList.add('hidden');
  resultsEmpty.classList.remove('hidden');
}
