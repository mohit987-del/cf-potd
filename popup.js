// DOM Elements
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const problemContentEl = document.getElementById('problem-content');
const errorMessageEl = document.querySelector('.error-message');
const retryBtn = document.getElementById('retry-btn');
const usernameSetupEl = document.getElementById('username-setup');
const usernameInput = document.getElementById('username-input');
const saveUsernameBtn = document.getElementById('save-username-btn');
const usernameError = document.getElementById('username-error');
const changeUsernameBtn = document.getElementById('change-username-btn');

// Problem Display Elements
const problemTitleEl = document.getElementById('problem-title');
const problemRatingEl = document.getElementById('problem-rating');
const problemTagsEl = document.getElementById('problem-tags');
const solveBtnEl = document.getElementById('solve-btn');
const currentDateEl = document.getElementById('current-date');
const countdownTimerEl = document.getElementById('countdown-timer');
const statusBadgeEl = document.getElementById('status-badge');

// Storage Keys
const STORAGE_KEYS = {
  PROBLEM: 'dailyProblem',
  DATE: 'problemDate',
  ALL_PROBLEMS: 'allProblems',
  USERNAME: 'cfUsername'
};

/**
 * Get saved username
 */
async function getSavedUsername() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.USERNAME);
  return data[STORAGE_KEYS.USERNAME] || null;
}

/**
 * Save username
 */
async function saveUsername(username) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.USERNAME]: username
  });
}

/**
 * Verify if username exists on Codeforces
 */
async function verifyUsername(username) {
  try {
    const response = await fetch(`https://codeforces.com/api/user.info?handles=${username}`);
    const data = await response.json();
    return data.status === 'OK';
  } catch (error) {
    return false;
  }
}

/**
 * Check if user has solved the problem
 */
async function checkProblemStatus(username, problem) {
  try {
    const response = await fetch(`https://codeforces.com/api/user.status?handle=${username}&from=1&count=100`);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      return { solved: false, error: true };
    }
    
    // Check if any submission for this problem has verdict "OK"
    const solved = data.result.some(submission => 
      submission.problem.contestId === problem.contestId &&
      submission.problem.index === problem.index &&
      submission.verdict === 'OK'
    );
    
    return { solved, error: false };
  } catch (error) {
    console.error('Error checking problem status:', error);
    return { solved: false, error: true };
  }
}

/**
 * Update status badge
 */
function updateStatusBadge(status) {
  statusBadgeEl.className = 'status-badge ' + status.type;
  statusBadgeEl.innerHTML = `
    <span class="status-icon">${status.icon}</span>
    <span class="status-text">${status.text}</span>
  `;
}

/**
 * Get today's date string (YYYY-MM-DD)
 */
function getTodayDate() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Get a seeded random problem based on the date
 */
function getDailyProblem(problems, date) {
  // Use date as seed for consistent daily selection
  const seed = date.split('-').reduce((acc, val) => acc + parseInt(val), 0);
  const index = seed % problems.length;
  return problems[index];
}

/**
 * Display the problem
 */
async function displayProblem(problem) {
  // Set problem title
  problemTitleEl.textContent = `${problem.name}`;
  
  // Store the actual rating in a data attribute
  problemRatingEl.dataset.rating = problem.rating;
  
  // Store tags data
  problemTagsEl.dataset.tags = JSON.stringify(problem.tags || []);
  
  // Reset blur state for new problem
  problemRatingEl.classList.add('blurred');
  problemRatingEl.textContent = 'Rating';
  
  // Show 'Tags' label initially
  problemTagsEl.innerHTML = '<span class="tags-label">Tags</span>';
  problemTagsEl.classList.add('blurred');
  
  // Add click handler to reveal/hide rating
  problemRatingEl.onclick = function() {
    if (this.classList.contains('blurred')) {
      this.textContent = `⭐ ${this.dataset.rating}`;
      this.classList.remove('blurred');
    } else {
      this.textContent = 'Rating';
      this.classList.add('blurred');
    }
  };
  
  // Add click handler to reveal/hide tags
  problemTagsEl.onclick = function() {
    if (this.classList.contains('blurred')) {
      // Show actual tags
      const tags = JSON.parse(this.dataset.tags);
      this.innerHTML = '';
      if (tags && tags.length > 0) {
        tags.forEach(tag => {
          const tagEl = document.createElement('span');
          tagEl.className = 'tag';
          tagEl.textContent = tag;
          this.appendChild(tagEl);
        });
      } else {
        this.innerHTML = '<span class="tag">No tags</span>';
      }
      this.classList.remove('blurred');
    } else {
      // Hide tags and show label
      this.innerHTML = '<span class="tags-label">Tags</span>';
      this.classList.add('blurred');
    }
  };
  
  // Set solve button link
  const problemUrl = CodeforcesAPI.getProblemUrl(problem);
  solveBtnEl.href = problemUrl;
  
  // Set current date
  currentDateEl.textContent = new Date().toLocaleString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
  
  // Show problem content
  showView('problem');
  
  // Check if problem is solved
  updateStatusBadge({ type: 'checking', icon: '⏳', text: 'Checking status...' });
  
  const username = await getSavedUsername();
  const status = await checkProblemStatus(username, problem);
  
  if (status.error) {
    updateStatusBadge({ type: 'error', icon: '⚠️', text: 'Could not check status' });
  } else if (status.solved) {
    updateStatusBadge({ type: 'solved', icon: '✅', text: 'Already solved!' });
  } else {
    updateStatusBadge({ type: 'unsolved', icon: '⏳', text: 'Not solved yet' });
  }
}

/**
 * Show a specific view (loading, error, problem, or username-setup)
 */
function showView(view) {
  loadingEl.classList.add('hidden');
  errorEl.classList.add('hidden');
  problemContentEl.classList.add('hidden');
  usernameSetupEl.classList.add('hidden');
  
  if (view === 'loading') {
    loadingEl.classList.remove('hidden');
  } else if (view === 'error') {
    errorEl.classList.remove('hidden');
  } else if (view === 'problem') {
    problemContentEl.classList.remove('hidden');
  } else if (view === 'username-setup') {
    usernameSetupEl.classList.remove('hidden');
  }
}

/**
 * Show error message
 */
function showError(message) {
  errorMessageEl.textContent = message;
  showView('error');
}

/**
 * Fetch and cache all problems
 */
async function fetchAndCacheProblems() {
  try {
    const result = await CodeforcesAPI.fetchContestProblems();
    const filteredProblems = CodeforcesAPI.filterProblems(result);
    
    if (filteredProblems.length === 0) {
      throw new Error('No problems found matching the criteria');
    }
    
    // Cache the problems
    await chrome.storage.local.set({
      [STORAGE_KEYS.ALL_PROBLEMS]: filteredProblems
    });
    
    return filteredProblems;
  } catch (error) {
    console.error('Error fetching problems:', error);
    throw error;
  }
}

/**
 * Get today's problem (from cache or fetch new)
 */
async function getTodayProblem() {
  const today = getTodayDate();
  
  try {
    // Get cached data
    const data = await chrome.storage.local.get([
      STORAGE_KEYS.PROBLEM,
      STORAGE_KEYS.DATE,
      STORAGE_KEYS.ALL_PROBLEMS
    ]);
    
    // If we have today's problem cached, return it
    if (data[STORAGE_KEYS.DATE] === today && data[STORAGE_KEYS.PROBLEM]) {
      return data[STORAGE_KEYS.PROBLEM];
    }
    
    // Get all problems (from cache or fetch)
    let allProblems = data[STORAGE_KEYS.ALL_PROBLEMS];
    
    if (!allProblems || allProblems.length === 0) {
      allProblems = await fetchAndCacheProblems();
    }
    
    // Select today's problem using date-based seeding
    const problem = getDailyProblem(allProblems, today);
    
    // Cache today's problem
    await chrome.storage.local.set({
      [STORAGE_KEYS.PROBLEM]: problem,
      [STORAGE_KEYS.DATE]: today
    });
    
    return problem;
  } catch (error) {
    console.error('Error getting today\'s problem:', error);
    throw error;
  }
}

/**
 * Load and display today's problem
 */
async function loadProblem() {
  showView('loading');
  
  try {
    const problem = await getTodayProblem();
    displayProblem(problem);
  } catch (error) {
    showError('Failed to load problem. Please check your internet connection and try again.');
  }
}

/**
 * Update countdown timer
 */
function updateCountdown() {
  // Get current time in IST
  const now = new Date();
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  
  // Get midnight IST tomorrow
  const tomorrow = new Date(istTime);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  // Calculate time difference
  const diff = tomorrow - istTime;
  
  if (diff > 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    countdownTimerEl.textContent = 
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  } else {
    countdownTimerEl.textContent = '00:00:00';
  }
}

/**
 * Initialize the popup
 */
async function init() {
  // Check if username is saved
  const username = await getSavedUsername();
  
  if (!username) {
    // Show username setup
    showView('username-setup');
    return;
  }
  
  // Load today's problem
  loadProblem();
  
  // Event listener for retry button
  retryBtn.addEventListener('click', () => loadProblem());
  
  // Event listener for change username button
  changeUsernameBtn.addEventListener('click', () => {
    showView('username-setup');
    usernameInput.value = '';
  });
  
  // Start countdown timer
  updateCountdown();
  setInterval(updateCountdown, 1000);
}

// Event listeners for username setup
saveUsernameBtn.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  
  if (!username) {
    usernameError.textContent = 'Please enter a username';
    usernameError.classList.remove('hidden');
    return;
  }
  
  saveUsernameBtn.disabled = true;
  saveUsernameBtn.textContent = 'Verifying...';
  usernameError.classList.add('hidden');
  
  // Verify username
  const isValid = await verifyUsername(username);
  
  if (!isValid) {
    usernameError.textContent = 'Username not found on Codeforces';
    usernameError.classList.remove('hidden');
    saveUsernameBtn.disabled = false;
    saveUsernameBtn.textContent = 'Save Username';
    return;
  }
  
  // Save username and reload
  await saveUsername(username);
  saveUsernameBtn.textContent = 'Save Username';
  saveUsernameBtn.disabled = false;
  
  // Reload the extension
  init();
});

// Allow Enter key to save username
usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    saveUsernameBtn.click();
  }
});

// Start the extension
init();
