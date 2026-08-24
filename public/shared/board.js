const UNIT_ICONS = { plane: '✈️', ship: '🚢', car: '🚗' };

function unitIcon(unit) {
  return UNIT_ICONS[unit] || '❓';
}

// يبني عنصر شبكة 5x5. onCellClick(index) اختياري.
function buildBoardGrid({ container, cellsData, onCellClick, mode }) {
  container.innerHTML = '';
  container.classList.add('board-grid');
  for (let i = 0; i < 25; i++) {
    const cellData = cellsData ? cellsData[i] : null;
    const cell = document.createElement('div');
    cell.className = 'board-cell';
    cell.dataset.index = String(i);

    const numberLabel = document.createElement('span');
    numberLabel.className = 'cell-number';
    numberLabel.textContent = String(i + 1);
    cell.appendChild(numberLabel);

    if (mode === 'placement' && cellData && cellData.length > 0) {
      cell.classList.add('filled');
      const icon = document.createElement('span');
      icon.className = 'cell-icon';
      icon.textContent = cellData.map((u) => unitIcon(u.unit)).join('');
      cell.appendChild(icon);
    }

    if (mode === 'hit' && cellData) {
      cell.classList.add(cellData.hit ? 'hit' : 'miss');
      const icon = document.createElement('span');
      icon.className = 'cell-icon';
      icon.textContent = cellData.hit
        ? cellData.units.map((u) => unitIcon(u.unit)).join('')
        : '✖️';
      cell.appendChild(icon);
    }

    if (onCellClick) {
      cell.addEventListener('click', () => onCellClick(i, cell));
    }

    container.appendChild(cell);
  }
}

window.BoardUtils = { buildBoardGrid, unitIcon, UNIT_ICONS };
