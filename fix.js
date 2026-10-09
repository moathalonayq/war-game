const fs = require('fs');
let content = fs.readFileSync('public/display/display.js', 'utf8');

content = content.replace(/window\.revealNext = function\(\) \{[\s\S]*?window\.revealNext\(\);\ \}\);/, `
window.revealNext = function() {
  const finishArea = document.getElementById('finishArea');
  if (finishArea && finishArea.style.display === 'block') {
    if (window.podiumSteps && window.currentRevealIndex < window.podiumSteps.length) {
      const step = window.podiumSteps[window.currentRevealIndex];
      if (step.rankInfo) {
        const el = document.getElementById(\`step-\${step.rankNum}\`);
        if (el) el.classList.add('revealed');
        const medalEl = document.getElementById(\`medal-\${step.rankNum}\`);
        if (medalEl) setTimeout(() => medalEl.style.opacity = '1', 500);
      }
      window.currentRevealIndex++;
      if (window.currentRevealIndex >= window.podiumSteps.length) {
        const btn = document.getElementById('revealBtn');
        if (btn) btn.style.display = 'none';
      }
    }
  }
};

window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') window.revealNext();
});

document.addEventListener('click', (e) => {
  if(e.target && e.target.id === 'revealBtn') window.revealNext();
});
`);

fs.writeFileSync('public/display/display.js', content);
console.log('Fixed display.js');
