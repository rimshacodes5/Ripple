document.addEventListener('DOMContentLoaded', () => {
  const missionForm = document.getElementById('mission-form');
  const inputSection = document.getElementById('input-section');
  const loadingSection = document.getElementById('loading');
  const missionResultSection = document.getElementById('mission-result');
  
  // Mission Display Elements
  const missionTitle = document.getElementById('mission-title');
  const missionTime = document.getElementById('mission-time');
  const missionCost = document.getElementById('mission-cost');
  const missionWhyText = document.getElementById('mission-why-text');
  const missionStepsList = document.getElementById('mission-steps-list');

  // Action Buttons
  const completeBtn = document.getElementById('complete-btn');
  const shareBtn = document.getElementById('share-btn');
  const resetBtn = document.getElementById('reset-btn');
  const resetStatsBtn = document.getElementById('reset-stats-btn');

  // History Elements
  const historyList = document.getElementById('history-list');

  // Stats Elements
  const statMissions = document.getElementById('stat-missions');
  const statPeople = document.getElementById('stat-people');
  const waterFill = document.getElementById('water-fill');

  // State Management
  let currentMission = null;
  let completedCount = parseInt(localStorage.getItem('ripple_completedCount')) || 0;
  let ripplesCreated = parseInt(localStorage.getItem('ripple_ripplesCreated')) || 0;
  let waterPercentage = parseInt(localStorage.getItem('ripple_waterPercentage')) || 20;
  let missionHistory = JSON.parse(localStorage.getItem('ripple_history')) || [];

  // Initial Sync
  updateStatsDisplay();
  renderHistory();

  // Synthetic Water Drop Sound Effect (Web Audio API)
  function playWaterSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Frequency slide upward to synthesize a "bloop" splash
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.log('Audio Context not allowed without prior interaction or unsupported');
    }
  }

  // Handle Form Submission
  missionForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      availableTime: document.getElementById('time').value,
      skills: document.getElementById('skills').value,
      cause: document.getElementById('cause').value,
      budget: document.getElementById('budget').value,
      preference: document.getElementById('preference').value
    };

    inputSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');

    try {
      const response = await fetch('/api/generate-mission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!data.success) throw new Error(data.error || 'Failed to generate mission.');

      currentMission = data.mission;
      renderMission(data.mission);

    } catch (err) {
      alert(`Error: ${err.message}`);
      loadingSection.classList.add('hidden');
      inputSection.classList.remove('hidden');
    }
  });

  // Render Mission
  function renderMission(mission) {
    missionTitle.textContent = mission.title;
    missionTime.textContent = `⏱ ${mission.estimatedTime}`;
    missionCost.textContent = `💰 ${mission.cost}`;
    missionWhyText.textContent = mission.whyItFits;

    missionStepsList.innerHTML = '';
    mission.steps.forEach(step => {
      const li = document.createElement('li');
      li.textContent = step;
      missionStepsList.appendChild(li);
    });

    loadingSection.classList.add('hidden');
    missionResultSection.classList.remove('hidden');
  }

  // Handle Complete Mission
  completeBtn.addEventListener('click', () => {
    playWaterSound();

    completedCount += 1;
    ripplesCreated += Math.floor(Math.random() * 3) + 2;
    waterPercentage = Math.min(100, waterPercentage + 15);

    // Save Mission to History
    if (currentMission) {
      missionHistory.unshift({
        title: currentMission.title,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
      if (missionHistory.length > 5) missionHistory.pop(); // Keep top 5
      localStorage.setItem('ripple_history', JSON.stringify(missionHistory));
    }

    // Persist Stats
    localStorage.setItem('ripple_completedCount', completedCount);
    localStorage.setItem('ripple_ripplesCreated', ripplesCreated);
    localStorage.setItem('ripple_waterPercentage', waterPercentage);

    updateStatsDisplay();
    renderHistory();

    completeBtn.disabled = true;
    completeBtn.textContent = 'Mission Completed! 💧';
    completeBtn.style.opacity = '0.7';
  });

  // Handle Share / Copy to Clipboard
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      if (!currentMission) return;
      const shareText = `💧 I'm taking on a micro-mission on Ripple:\n\n"${currentMission.title}"\n\nCreating small ripples of generosity!`;
      navigator.clipboard.writeText(shareText).then(() => {
        const originalText = shareBtn.textContent;
        shareBtn.textContent = 'Copied! ✨';
        setTimeout(() => { shareBtn.textContent = originalText; }, 2000);
      });
    });
  }

  // Handle Reset / Start Another
  resetBtn.addEventListener('click', () => {
    missionForm.reset();
    completeBtn.disabled = false;
    completeBtn.textContent = 'Mark Mission Completed 🎉';
    completeBtn.style.opacity = '1';

    missionResultSection.classList.add('hidden');
    inputSection.classList.remove('hidden');
  });

  // Handle Reset Stats & History
  if (resetStatsBtn) {
    resetStatsBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset your progress and history?')) {
        completedCount = 0;
        ripplesCreated = 0;
        waterPercentage = 20;
        missionHistory = [];

        localStorage.clear();
        updateStatsDisplay();
        renderHistory();
      }
    });
  }

  // UI Helpers
  function updateStatsDisplay() {
    statMissions.textContent = completedCount;
    statPeople.textContent = ripplesCreated;
    waterFill.style.height = `${waterPercentage}%`;
  }

  function renderHistory() {
    if (!historyList) return;
    historyList.innerHTML = '';
    if (missionHistory.length === 0) {
      historyList.innerHTML = '<li class="empty-history">No completed missions yet.</li>';
      return;
    }
    missionHistory.forEach(item => {
      const li = document.createElement('li');
      li.className = 'history-item';
      li.innerHTML = `<span>💧 ${item.title}</span><small>${item.date}</small>`;
      historyList.appendChild(li);
    });
  }
});