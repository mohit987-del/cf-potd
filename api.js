// Codeforces API integration
const CodeforcesAPI = {
  BASE_URL: 'https://codeforces.com/api',
  
  /**
   * Fetch all contest problems
   */
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

  /**
   * Filter problems by rating and recent contests
   */
  filterProblems(result, minRating = 1400, maxRating = 1900, lastNContests = 50) {
    const { problems, problemStatistics } = result;
    
    // Get recent contest IDs
    const contestIds = new Set();
    problems.forEach(problem => {
      if (problem.contestId) {
        contestIds.add(problem.contestId);
      }
    });
    
    // Sort contest IDs and get last N contests
    const sortedContestIds = Array.from(contestIds).sort((a, b) => b - a).slice(0, lastNContests);
    const recentContestSet = new Set(sortedContestIds);
    
    // Filter problems
    const filteredProblems = problems.filter(problem => {
      const hasRating = problem.rating >= minRating && problem.rating <= maxRating;
      const isFromRecentContest = recentContestSet.has(problem.contestId);
      const hasContestId = problem.contestId !== undefined;
      
      return hasRating && isFromRecentContest && hasContestId;
    });
    
    return filteredProblems;
  },

  /**
   * Get problem URL
   */
  getProblemUrl(problem) {
    return `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`;
  }
};
