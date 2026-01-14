// Content script to inject calendar into Codeforces problemset page

class CFCalendar {
  constructor() {
    this.currentDate = new Date();
    this.selectedDate = new Date();
    this.minDate = new Date();
    this.minDate.setMonth(this.minDate.getMonth() - 3);
    
    this.init();
  }

  init() {
    this.createCalendarContainer();
    this.renderCalendar();
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

  changeMonth(delta) {
    const newDate = new Date(this.selectedDate);
    newDate.setMonth(newDate.getMonth() + delta);

    // Check if new date is within allowed range
    if (newDate >= this.minDate && newDate <= this.currentDate) {
      this.selectedDate = newDate;
      this.renderCalendar();
    }
  }

  renderCalendar() {
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

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'calendar-day empty';
      gridEl.appendChild(emptyCell);
    }

    // Add day cells
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = document.createElement('div');
      dayCell.className = 'calendar-day';
      dayCell.textContent = day;

      const cellDate = new Date(year, month, day);
      
      // Mark today
      if (cellDate.toDateString() === today.toDateString()) {
        dayCell.classList.add('today');
      }

      // Mark future dates as disabled
      if (cellDate > today) {
        dayCell.classList.add('disabled');
      }

      // Mark dates before min date as disabled
      if (cellDate < this.minDate) {
        dayCell.classList.add('disabled');
      }

      // Add click handler for valid dates
      if (cellDate <= today && cellDate >= this.minDate) {
        dayCell.addEventListener('click', () => this.onDateClick(cellDate));
        dayCell.style.cursor = 'pointer';
      }

      gridEl.appendChild(dayCell);
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

  onDateClick(date) {
    console.log('Date clicked:', date.toDateString());
    // You can add functionality here to show the POTD for this date
    // For now, just highlight the selected date
    const allDays = document.querySelectorAll('.calendar-day');
    allDays.forEach(day => day.classList.remove('selected'));
    
    event.target.classList.add('selected');
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
