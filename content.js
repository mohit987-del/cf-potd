// Content script to inject calendar into Codeforces problemset page

// Codeforces API helper
const CodeforcesAPI = {
  BASE_URL: 'https://codeforces.com/api',
  
  async fetchContestProblems() {
    try {
      const response = await fetch(`${this.BASE_URL}/problemset.problems`);
      if (!response.ok) {
        throw new Error('Failed to fetch problems from Codeforces API');
      }
      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error('API returned error status');
      }
      
      return data.result;
    } catch (error) {
      console.error('Error fetching problems:', error);
      throw error;
    }
  },

  filterProblems(result, minRating = 1400, maxRating = 1900, lastNContests = 50) {
    const { problems } = result;
    
    const contestIds = new Set();
    problems.forEach(problem => {
      if (problem.contestId) {
        contestIds.add(problem.contestId);
      }
    });
    
    const sortedContestIds = Array.from(contestIds).sort((a, b) => b - a).slice(0, lastNContests);
    const recentContestSet = new Set(sortedContestIds);
    
    const filteredProblems = problems.filter(problem => {
      const hasRating = problem.rating >= minRating && problem.rating <= maxRating;
      const isFromRecentContest = recentContestSet.has(problem.contestId);
      const hasContestId = problem.contestId !== undefined;
      
      return hasRating && isFromRecentContest && hasContestId;
    });
    
    return filteredProblems;
  },

  getProblemUrl(problem) {
    return `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`;
  }
};

class CFCalendar {
  constructor() {
    // Get current date in IST
    this.currentDate = this.getISTDate();
    this.selectedDate = new Date(this.currentDate);
    this.minDate = new Date(this.currentDate);
    this.minDate.setMonth(this.minDate.getMonth() - 3);
    this.allProblems = null;
    this.username = null;
    this.solvedProblems = new Map(); // Map of dateString -> problem
    this.problemsForDates = new Map(); // Map of dateString -> problem info
    this.monthStats = { solved: 0, total: 0, streak: 0 };
    
    this.init();
  }

  /**
   * Get current date in IST timezone
   */
  getISTDate() {
    const now = new Date();
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    return istTime;
  }

  /**
   * Get saved username
   */
  async getUsername() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['cfUsername'], (data) => {
        resolve(data.cfUsername || null);
      });
    });
  }

  async init() {
    this.username = await this.getUsername();
    this.createCalendarContainer();
    await this.renderCalendar();
    this.attachEventListeners();
  }

  createCalendarContainer() {
    // Create main calendar container
    const calendarContainer = document.createElement('div');
    calendarContainer.id = 'cf-potd-calendar';
    calendarContainer.innerHTML = `
      <div class="calendar-header">
        <h3>📅 POTD Calendar</h3>
        <button class="calendar-toggle" id="calendar-toggle">−</button>
      </div>
      <div class="calendar-stats" id="calendar-stats">
        <div class="stat-item">
          <span class="stat-label">Solved:</span>
          <span class="stat-value" id="solved-count">0/0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">🔥 Streak:</span>
          <span class="stat-value" id="streak-count">0</span>
        </div>
      </div>
      <div class="calendar-content" id="calendar-content">
        <div class="calendar-nav">
          <button class="nav-btn" id="prev-month">&lt;</button>
          <div class="current-month" id="current-month"></div>
          <button class="nav-btn" id="next-month">&gt;</button>
        </div>
        <div class="calendar-grid" id="calendar-grid"></div>
      </div>
    `;

    // Find the right sidebar and insert calendar at the top
    const sidebar = document.querySelector('#sidebar') || document.querySelector('.second-level-menu-list')?.parentElement;
    
    if (sidebar) {
      sidebar.insertBefore(calendarContainer, sidebar.firstChild);
    } else {
      // Fallback: insert before main content
      const contentDiv = document.querySelector('.datatable') || document.querySelector('#pageContent') || document.body;
      if (contentDiv.parentNode) {
        contentDiv.parentNode.insertBefore(calendarContainer, contentDiv);
      } else {
        document.body.prepend(calendarContainer);
      }
    }

    this.container = calendarContainer;
  }

  attachEventListeners() {
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    const toggleBtn = document.getElementById('calendar-toggle');

    prevBtn.addEventListener('click', () => this.changeMonth(-1));
    nextBtn.addEventListener('click', () => this.changeMonth(1));
    toggleBtn.addEventListener('click', () => this.toggleCalendar());
  }

  toggleCalendar() {
    const content = document.getElementById('calendar-content');
    const toggleBtn = document.getElementById('calendar-toggle');
    
    if (content.style.display === 'none') {
      content.style.display = 'block';
      toggleBtn.textContent = '−';
    } else {
      content.style.display = 'none';
      toggleBtn.textContent = '+';
    }
  }

  async changeMonth(delta) {
    const newDate = new Date(this.selectedDate);
    newDate.setMonth(newDate.getMonth() + delta);

    // Check if new date is within allowed range
    if (newDate >= this.minDate && newDate <= this.currentDate) {
      this.selectedDate = newDate;
      await this.renderCalendar();
    }
  }

  async renderCalendar() {
    const monthYearEl = document.getElementById('current-month');
    const gridEl = document.getElementById('calendar-grid');

    // Update month/year display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    monthYearEl.textContent = `${monthNames[this.selectedDate.getMonth()]} ${this.selectedDate.getFullYear()}`;

    // Update navigation button states
    this.updateNavButtons();

    // Create calendar grid
    gridEl.innerHTML = '';

    // Add day headers
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'calendar-day-header';
      dayHeader.textContent = day;
      gridEl.appendChild(dayHeader);
    });

    // Get first day of month and number of days
    const year = this.selectedDate.getFullYear();
    const month = this.selectedDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Load problems for this month and check solved status
    await this.loadProblemsForMonth(year, month, daysInMonth);

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'calendar-day empty';
      gridEl.appendChild(emptyCell);
    }

    // Add day cells
    const today = this.getISTDate();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    
    let currentStreak = 0;
    let maxStreak = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = document.createElement('div');
      dayCell.className = 'calendar-day';
      dayCell.textContent = day;

      // Create date at noon to avoid timezone issues
      const cellDate = new Date(year, month, day, 12, 0, 0);
      const dateString = this.getDateString(cellDate);
      
      // Mark today
      const cellDateStart = new Date(year, month, day);
      cellDateStart.setHours(0, 0, 0, 0);
      if (cellDateStart.getTime() === today.getTime()) {
        dayCell.classList.add('today');
      }

      // Mark future dates as disabled
      if (cellDateStart > today) {
        dayCell.classList.add('disabled');
      }

      // Mark dates before min date as disabled
      const minDateStart = new Date(this.minDate);
      minDateStart.setHours(0, 0, 0, 0);
      if (cellDateStart < minDateStart) {
        dayCell.classList.add('disabled');
      }

      // Get problem info for this date
      const problemInfo = this.problemsForDates.get(dateString);
      
      if (problemInfo && cellDateStart <= today && cellDateStart >= minDateStart) {
        // Check if solved
        const isSolved = this.solvedProblems.has(dateString);
        
        if (isSolved) {
          dayCell.classList.add('solved');
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
        
        // Add difficulty color coding
        const rating = problemInfo.rating;
        if (rating >= 1400 && rating < 1600) {
          dayCell.classList.add('difficulty-easy');
        } else if (rating >= 1600 && rating < 1800) {
          dayCell.classList.add('difficulty-medium');
        } else if (rating >= 1800) {
          dayCell.classList.add('difficulty-hard');
        }
        
        // Add tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'calendar-tooltip';
        tooltip.innerHTML = `
          <div class="tooltip-title">${problemInfo.name}</div>
          <div class="tooltip-meta">
            <span class="tooltip-rating">⭐ ${problemInfo.rating}</span>
            <span class="tooltip-status">${isSolved ? '✓ Solved' : '⏳ Unsolved'}</span>
          </div>
        `;
        dayCell.appendChild(tooltip);
      }

      // Add click handler for valid dates
      if (cellDateStart <= today && cellDateStart >= minDateStart) {
        dayCell.addEventListener('click', () => this.onDateClick(cellDate, dayCell));
        dayCell.style.cursor = 'pointer';
      }

      gridEl.appendChild(dayCell);
    }
    
    // Update streak in stats
    this.monthStats.streak = maxStreak;
    this.updateStats();
  }

  /**
   * Load problems for the month and check solved status
   */
  async loadProblemsForMonth(year, month, daysInMonth) {
    // Reset stats
    this.monthStats = { solved: 0, total: 0, streak: 0 };
    this.problemsForDates.clear();
    this.solvedProblems.clear();
    
    if (!this.username) {
      return; // Can't check solved status without username
    }
    
    try {
      // Get all problems if not loaded
      if (!this.allProblems) {
        const cachedProblems = await this.getCachedProblems();
        
        if (cachedProblems && cachedProblems.length > 0) {
          this.allProblems = cachedProblems;
        } else {
          const result = await CodeforcesAPI.fetchContestProblems();
          this.allProblems = CodeforcesAPI.filterProblems(result);
          await this.cacheProblems(this.allProblems);
        }
      }
      
      // Get user's solved problems
      const userSubmissions = await this.getUserSubmissions(this.username);
      
      // For each day in the month, get the problem and check if solved
      const today = this.getISTDate();
      today.setHours(0, 0, 0, 0);
      
      for (let day = 1; day <= daysInMonth; day++) {
        const cellDate = new Date(year, month, day, 12, 0, 0);
        const cellDateStart = new Date(year, month, day);
        cellDateStart.setHours(0, 0, 0, 0);
        
        // Only process valid dates
        const minDateStart = new Date(this.minDate);
        minDateStart.setHours(0, 0, 0, 0);
        
        if (cellDateStart <= today && cellDateStart >= minDateStart) {
          const dateString = this.getDateString(cellDate);
          const problem = this.getDailyProblem(this.allProblems, dateString);
          
          // Store problem info
          this.problemsForDates.set(dateString, {
            name: problem.name,
            rating: problem.rating,
            contestId: problem.contestId,
            index: problem.index
          });
          
          this.monthStats.total++;
          
          // Check if solved
          const isSolved = userSubmissions.some(sub => 
            sub.problem.contestId === problem.contestId &&
            sub.problem.index === problem.index &&
            sub.verdict === 'OK'
          );
          
          if (isSolved) {
            this.solvedProblems.set(dateString, problem);
            this.monthStats.solved++;
          }
        }
      }
    } catch (error) {
      console.error('Error loading problems for month:', error);
    }
  }

  /**
   * Get user submissions
   */
  async getUserSubmissions(username) {
    try {
      const response = await fetch(`https://codeforces.com/api/user.status?handle=${username}&from=1&count=1000`);
      const data = await response.json();
      
      if (data.status !== 'OK') {
        return [];
      }
      
      return data.result;
    } catch (error) {
      console.error('Error fetching user submissions:', error);
      return [];
    }
  }

  /**
   * Update stats display
   */
  updateStats() {
    const solvedCountEl = document.getElementById('solved-count');
    const streakCountEl = document.getElementById('streak-count');
    
    if (solvedCountEl) {
      solvedCountEl.textContent = `${this.monthStats.solved}/${this.monthStats.total}`;
    }
    
    if (streakCountEl) {
      streakCountEl.textContent = this.monthStats.streak;
    }
  }

  updateNavButtons() {
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');

    // Check if we can go back one more month
    const prevMonth = new Date(this.selectedDate);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    prevBtn.disabled = prevMonth < this.minDate;

    // Check if we can go forward one more month
    const nextMonth = new Date(this.selectedDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextBtn.disabled = nextMonth > this.currentDate;
  }

  async onDateClick(date, element) {
    const dateString = this.getDateString(date);
    console.log('Date clicked:', dateString);
    
    // Highlight the selected date
    const allDays = document.querySelectorAll('.calendar-day');
    allDays.forEach(day => day.classList.remove('selected'));
    element.classList.add('selected');
    
    // Get problem for this date and open in new tab
    try {
      const problem = await this.getProblemForDate(date);
      if (problem) {
        console.log('Opening problem:', problem.name, 'for date:', dateString);
        const problemUrl = CodeforcesAPI.getProblemUrl(problem);
        window.open(problemUrl, '_blank');
      }
    } catch (error) {
      console.error('Error getting problem for date:', error);
      alert('Failed to load problem for this date. Please try again.');
    }
  }

  /**
   * Get problem for a specific date
   */
  async getProblemForDate(date) {
    const dateString = this.getDateString(date);
    
    try {
      // Get all problems (from cache or fetch)
      if (!this.allProblems) {
        const cachedProblems = await this.getCachedProblems();
        
        if (cachedProblems && cachedProblems.length > 0) {
          this.allProblems = cachedProblems;
        } else {
          // Fetch and cache problems
          const result = await CodeforcesAPI.fetchContestProblems();
          this.allProblems = CodeforcesAPI.filterProblems(result);
          await this.cacheProblems(this.allProblems);
        }
      }
      
      // Select problem using date-based seeding
      const problem = this.getDailyProblem(this.allProblems, dateString);
      return problem;
    } catch (error) {
      console.error('Error getting problem for date:', error);
      throw error;
    }
  }

  /**
   * Get date string in YYYY-MM-DD format
   */
  getDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get a seeded random problem based on the date
   */
  getDailyProblem(problems, dateString) {
    // Use date as seed for consistent daily selection (same algorithm as popup)
    const seed = dateString.split('-').reduce((acc, val) => acc + parseInt(val), 0);
    const index = seed % problems.length;
    console.log('Calendar - Date:', dateString, 'Seed:', seed, 'Index:', index, 'Total problems:', problems.length, 'Problem:', problems[index].name);
    return problems[index];
  }

  /**
   * Get cached problems from storage
   */
  async getCachedProblems() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['allProblems'], (data) => {
        console.log('Cached problems count:', data.allProblems?.length);
        resolve(data.allProblems || null);
      });
    });
  }

  /**
   * Cache problems in storage
   */
  async cacheProblems(problems) {
    return new Promise((resolve) => {
      console.log('Caching problems count:', problems.length);
      chrome.storage.local.set({ allProblems: problems }, () => {
        resolve();
      });
    });
  }
}

// Initialize calendar when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new CFCalendar();
  });
} else {
  new CFCalendar();
}
