let toukenData = [];
let currentGroups = [];
let currentSelectedGroupId = null;
const HEIGHT_SCALE = 1.5;

window.onload = () => {
  fetch('/api/data')
    .then(res => res.json())
    .then(data => {
      toukenData = data;
      const statusBar = document.getElementById('statusBar');
      statusBar.className = 'status-bar success';
      statusBar.innerHTML = `✅ 自動読み込み完了: <strong>${toukenData.length}件</strong> の刀剣男士データを読み込みました。`;

      document.getElementById('loadedCount').textContent = toukenData.length;
      initFilters();
      renderList();
      updateSelectedCount();
    })
    .catch(err => {
      const statusBar = document.getElementById('statusBar');
      statusBar.className = 'status-bar error';
      statusBar.innerHTML = `⚠️ エラー: ${err.message}`;
    });
};

function checkPassword() {
  // 設定したいパスワードをここに記述
  const correctPassword = "tothenorth"; 
  
  const inputVal = document.getElementById('authPassword').value;
  const errorEl = document.getElementById('authError');

  if (inputVal === correctPassword) {
    // 認証成功したらモーダルを非表示にする
    document.getElementById('authModal').style.display = 'none';
    // セッションに保存して、画面リロードしても再入力しなくてよくする場合（任意）
    sessionStorage.setItem('isAuthorized', 'true');
  } else {
    errorEl.style.display = 'block';
  }
}

// ページ読み込み時にすでに認証済みかチェックしたい場合
window.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('isAuthorized') === 'true') {
    document.getElementById('authModal').style.display = 'none';
  }
});

function initFilters() {
  const types = [...new Set(toukenData.map(d => d.type))].filter(Boolean);
  const schools = [...new Set(toukenData.map(d => d.school))].filter(Boolean);

  const typeSelect = document.getElementById('filterType');
  types.forEach(t => typeSelect.add(new Option(t, t)));

  const schoolSelect = document.getElementById('filterSchool');
  schools.forEach(s => schoolSelect.add(new Option(s, s)));
}

function renderList() {
  const container = document.getElementById('toukenList');
  container.innerHTML = '';
  toukenData.forEach(item => {
    const div = document.createElement('div');
    div.className = 'touken-item';
    div.dataset.type = item.type;
    div.dataset.school = item.school;
    div.innerHTML = `
      <input type="checkbox" id="chk-${item.id}" value="${item.id}" checked onchange="updateSelectedCount()">
      <label for="chk-${item.id}">
        <span class="touken-name">${item.name}</span>
        <span class="tag tag-type">${item.type || ''}</span>
        <span class="tag tag-school">${item.school || ''}</span>
      </label>
    `;
    container.appendChild(div);
  });
}

function applyFilter() {
  const selectedType = document.getElementById('filterType').value;
  const selectedSchool = document.getElementById('filterSchool').value;
  // ★ 追加：検索キーワードを取得して小文字に変換（大文字小文字を区別せず検索するため）
  const keyword = document.getElementById('filterKeyword').value.trim().toLowerCase();

  document.querySelectorAll('.touken-item').forEach(item => {
    const type = item.dataset.type || '';
    const school = item.dataset.school || '';
    // HTML要素からキャラクター名を取得
    const nameEl = item.querySelector('.touken-name');
    const name = nameEl ? nameEl.textContent.toLowerCase() : '';

    const matchType = !selectedType || type === selectedType;
    const matchSchool = !selectedSchool || school === selectedSchool;
    // ★ 追加：名前の部分一致判定
    const matchKeyword = !keyword || name.includes(keyword);

    if (matchType && matchSchool && matchKeyword) {
      item.classList.remove('hidden');
    } else {
      item.classList.add('hidden');
    }
  });
}

function toggleSelectVisible(selectState) {
  document.querySelectorAll('.touken-item:not(.hidden) input[type="checkbox"]').forEach(chk => chk.checked = selectState);
  updateSelectedCount();
}

function updateSelectedCount() {
  const count = document.querySelectorAll('.touken-item input[type="checkbox"]:checked').length;
  document.getElementById('selectedCount').textContent = count;
}

function generateGroups() {
  const checkedBoxes = document.querySelectorAll('.touken-item input[type="checkbox"]:checked');
  const selectedIds = Array.from(checkedBoxes).map(cb => String(cb.value));

  if (selectedIds.length === 0) return alert("刀剣男士を1人以上選択してください。");

  const shuffled = selectedIds.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const groupSize = parseInt(document.getElementById('groupSize').value) || 6;
  const resultContainer = document.getElementById('resultContainer');
  resultContainer.innerHTML = '';
  currentGroups = [];

  let groupIndex = 1;
  for (let i = 0; i < shuffled.length; i += groupSize) {
    const chunkIds = shuffled.slice(i, i + groupSize);
    const members = chunkIds.map(id => toukenData.find(d => String(d.id) === String(id))).filter(Boolean);

    currentGroups.push({ id: groupIndex, members: members });

    const card = document.createElement('div');
    card.className = 'group-card';
    card.id = `group-card-${groupIndex}`;

    const targetIdx = groupIndex;
    card.addEventListener('click', () => { selectGroup(targetIdx); });

    const memberNames = members.map(m => m.name).join('、');
    card.innerHTML = `
      <div class="group-title">
        <span>部隊 ${groupIndex} (${members.length}名)</span>
        <small style="color:#2b5797;">クリックで詳細表示 ▸</small>
      </div>
      <div class="group-members">${memberNames}</div>
    `;
    resultContainer.appendChild(card);
    groupIndex++;
  }

  if (currentGroups.length > 0) selectGroup(1);
}

function selectGroup(groupIndex) {
  saveCurrentChartOrder();

  currentSelectedGroupId = groupIndex;
  document.querySelectorAll('.group-card').forEach(card => card.classList.remove('active'));
  const activeCard = document.getElementById(`group-card-${groupIndex}`);
  if (activeCard) activeCard.classList.add('active');

  const targetGroup = currentGroups.find(g => Number(g.id) === Number(groupIndex));
  if (!targetGroup) return;

  document.getElementById('detailTitle').textContent = `3. 部隊 ${groupIndex} の詳細プロフィール`;

  // ★ 変更：プロフィールテーブル用には「刀帳番号（id）」の昇順でソートした配列を作る
  const sortedMembers = [...targetGroup.members].sort((a, b) => {
    return (Number(a.id) || 0) - (Number(b.id) || 0);
  });

  let tableHtml = `
    <table>
      <thead>
        <tr>
          <th>刀帳番号</th>
          <th>刀剣男士名</th>
          <th>身長</th>
          <th>刀種</th>
          <th>刀派</th>
        </tr>
      </thead>
      <tbody>
  `;
  // ★ ここでソート済みの配列（sortedMembers）を使用する
  sortedMembers.forEach(m => {
    // 刀帳番号が 0 の場合もきちんと表示されるように修正
    const displayId = (m.id !== undefined && m.id !== null && m.id !== '') ? m.id : '-';

    tableHtml += `
      <tr>
        <td>${displayId}</td>
        <td><strong>${m.name || '-'}</strong></td>
        <td>${m.height && m.height !== '-' ? m.height + ' cm' : '-'}</td>
        <td>${m.type || '-'}</td>
        <td>${m.school || '-'}</td>
      </tr>
    `;
  });
  tableHtml += `</tbody></table>`;
  document.getElementById('profileContainer').innerHTML = tableHtml;

  const chartContainer = document.getElementById('chartContainer');
  chartContainer.innerHTML = '';
  renderGridLines();

  // グラフ側の描画は、ユーザーが並び替えた順番（targetGroup.members）をそのまま維持
  targetGroup.members.forEach(m => {
    const numHeight = m.height ? parseFloat(String(m.height).replace(/[^0-9.]/g, '')) : NaN;
    const barHeight = !isNaN(numHeight) ? numHeight * HEIGHT_SCALE : 60;

    const chartItem = document.createElement('div');
    chartItem.className = 'chart-item';
    chartItem.dataset.id = m.id;
    chartItem.innerHTML = `
      <div class="height-bar" style="height: ${barHeight}px;" title="${m.name}: ${m.height || '?'}cm">
        ${!isNaN(numHeight) ? numHeight : '?'}
      </div>
      <div class="chart-label" title="${m.name}">${m.name}</div>
    `;

    addDragEvents(chartItem);
    chartContainer.appendChild(chartItem);
  });

  // スクロールバーの初期化・更新
  initCustomScrollbar();
}

function saveCurrentChartOrder() {
  if (!currentSelectedGroupId) return;
  const targetGroup = currentGroups.find(g => Number(g.id) === Number(currentSelectedGroupId));
  if (!targetGroup) return;

  const chartItems = document.querySelectorAll('#chartContainer .chart-item');
  if (chartItems.length === 0) return;

  const newOrderMembers = [];
  chartItems.forEach(item => {
    const memberId = item.dataset.id;
    const member = targetGroup.members.find(m => String(m.id) === String(memberId));
    if (member) newOrderMembers.push(member);
  });

  if (newOrderMembers.length > 0) targetGroup.members = newOrderMembers;
}

let draggedItem = null;

// --- ポインター位置とのズレを防ぐ自由並び替え処理 ---
function addDragEvents(item) {
  let isPointerDragging = false;
  let startX = 0;
  let ghostEl = null;
  let initialLeft = 0;

  item.onpointerdown = (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;

    isPointerDragging = true;
    startX = e.clientX;

    const container = document.getElementById('chartContainer');
    const containerRect = container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();

    // 元の位置を保持するためのゴースト（空きスペース）を作成
    ghostEl = document.createElement('div');
    ghostEl.style.width = `${item.offsetWidth}px`;
    ghostEl.style.height = `${item.offsetHeight}px`;
    ghostEl.style.flexShrink = '0';
    ghostEl.style.visibility = 'hidden';
    container.insertBefore(ghostEl, item);

    // アイテムを絶対配置にしてコンテナ基準の初期位置を保存
    initialLeft = itemRect.left - containerRect.left;
    const initialTop = itemRect.top - containerRect.top;

    item.style.position = 'absolute';
    item.style.left = `${initialLeft}px`;
    item.style.top = `${initialTop}px`;
    item.style.zIndex = '1000';
    item.style.pointerEvents = 'none'; // 判定の邪魔をさせない

    item.setPointerCapture(e.pointerId);
    item.classList.add('dragging');

    e.preventDefault();
  };

  item.onpointermove = (e) => {
    if (!isPointerDragging) return;

    const container = document.getElementById('chartContainer');
    
    // カーソルの移動量（dx）を、そのまま初期位置に足すことでズレを完全になくす
    const dx = e.clientX - startX;
    item.style.left = `${initialLeft + dx}px`;

    // 挿入位置（ゴーストの位置）の判定
    const items = Array.from(container.querySelectorAll('.chart-item:not(.dragging)'));
    let targetItem = null;

    for (const other of items) {
      const box = other.getBoundingClientRect();
      // カーソルのX座標が、他のアイテムの中心より左にあるか
      if (e.clientX < box.left + box.width / 2) {
        targetItem = other;
        break;
      }
    }

    if (targetItem) {
      container.insertBefore(ghostEl, targetItem);
    } else {
      container.appendChild(ghostEl);
    }
  };

  item.onpointerup = (e) => {
    if (!isPointerDragging) return;
    isPointerDragging = false;

    const container = document.getElementById('chartContainer');

    // スタイルをリセット
    item.style.position = '';
    item.style.left = '';
    item.style.top = '';
    item.style.zIndex = '';
    item.style.pointerEvents = '';
    item.classList.remove('dragging');

    // ゴーストの位置にアイテムを定着させる
    if (ghostEl && ghostEl.parentNode) {
      container.insertBefore(item, ghostEl);
      ghostEl.remove();
      ghostEl = null;
    }

    try { item.releasePointerCapture(e.pointerId); } catch (err) {}

    saveCurrentChartOrder();
  };

  item.onpointercancel = (e) => {
    if (!isPointerDragging) return;
    isPointerDragging = false;

    const container = document.getElementById('chartContainer');
    item.style.position = '';
    item.style.left = '';
    item.style.top = '';
    item.style.zIndex = '';
    item.style.pointerEvents = '';
    item.classList.remove('dragging');

    if (ghostEl && ghostEl.parentNode) {
      container.insertBefore(item, ghostEl);
      ghostEl.remove();
      ghostEl = null;
    }

    try { item.releasePointerCapture(e.pointerId); } catch (err) {}
  };
}

// --- 横スクロールバー連動制御 ---
function initCustomScrollbar() {
  const wrapper = document.getElementById('chartWrapper');
  const chart = document.getElementById('chartContainer');
  const container = document.getElementById('scrollbarContainer');
  const thumb = document.getElementById('scrollbarThumb');

  if (!wrapper || !chart || !container || !thumb) return;

  const contentWidth = chart.scrollWidth;
  const visibleWidth = wrapper.clientWidth;

  if (contentWidth <= visibleWidth) {
    container.style.display = 'none';
    chart.style.transform = 'translateX(0px)';
    return;
  }

  container.style.display = 'block';
  let scrollX = 0;
  const maxScroll = contentWidth - visibleWidth;
  
  const thumbWidth = Math.max(40, (visibleWidth / contentWidth) * visibleWidth);
  thumb.style.width = `${thumbWidth}px`;
  const maxThumbMove = visibleWidth - thumbWidth;

  function updateScrollPosition(newScrollX) {
    scrollX = Math.max(0, Math.min(newScrollX, maxScroll));
    const thumbX = (scrollX / maxScroll) * maxThumbMove;
    
    thumb.style.left = `${thumbX}px`;
    chart.style.transform = `translateX(-${scrollX}px)`;
  }

  updateScrollPosition(0);

  let isDraggingThumb = false;
  let startX = 0;
  let startThumbX = 0;

  thumb.onpointerdown = (e) => {
    isDraggingThumb = true;
    startX = e.clientX;
    startThumbX = thumb.offsetLeft;
    thumb.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  thumb.onpointermove = (e) => {
    if (!isDraggingThumb) return;
    const dx = e.clientX - startX;
    const newThumbX = Math.max(0, Math.min(startThumbX + dx, maxThumbMove));
    const newScrollX = (newThumbX / maxThumbMove) * maxScroll;
    updateScrollPosition(newScrollX);
  };

  thumb.onpointerup = (e) => {
    isDraggingThumb = false;
    try { thumb.releasePointerCapture(e.pointerId); } catch(err) {}
  };

  container.onclick = (e) => {
    if (e.target === thumb) return;
    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left - (thumbWidth / 2);
    const newThumbX = Math.max(0, Math.min(clickX, maxThumbMove));
    const newScrollX = (newThumbX / maxThumbMove) * maxScroll;
    updateScrollPosition(newScrollX);
  };

  wrapper.onwheel = (e) => {
    if (contentWidth > visibleWidth) {
      e.preventDefault();
      updateScrollPosition(scrollX + e.deltaY);
    }
  };
}

function renderGridLines() {
  const gridContainer = document.getElementById('gridLines');
  if (!gridContainer) return;
  gridContainer.innerHTML = '';

  for (let heightCm = 0; heightCm <= 220; heightCm += 20) {
    const linePixel = heightCm * HEIGHT_SCALE;
    const line = document.createElement('div');
    line.className = 'grid-line';
    line.style.bottom = `${linePixel}px`;
    line.innerHTML = `
      <span class="grid-label-left">${heightCm}cm</span>
      <span class="grid-label-right">${heightCm}cm</span>
    `;
    gridContainer.appendChild(line);
  }
}

async function exportDetailImage() {
  if (!currentSelectedGroupId) {
    alert("グループが選択されていません。");
    return;
  }

  const imgBtn = document.getElementById('imgBtn');
  const originalText = imgBtn.textContent;
  imgBtn.disabled = true;
  imgBtn.textContent = '⌛ 画像作成中...';

  saveCurrentChartOrder();
  const detailArea = document.querySelector('#exportAreaDetail .panel');

  try {
    imgBtn.style.visibility = 'hidden';
    const canvas = await html2canvas(detailArea, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true
    });
    imgBtn.style.visibility = 'visible';

    const imageURI = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = imageURI;
    downloadLink.download = `部隊${currentSelectedGroupId}_詳細プロフィール.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  } catch (err) {
    console.error(err);
    alert("画像保存エラー: " + err.message);
    imgBtn.style.visibility = 'visible';
  } finally {
    imgBtn.disabled = false;
    imgBtn.textContent = originalText;
  }
}

async function exportNativePDF() {
  if (currentGroups.length === 0) {
    alert("チームが生成されていません。");
    return;
  }

  const pdfBtn = document.getElementById('pdfBtn');
  pdfBtn.disabled = true;
  pdfBtn.textContent = '⌛ PDF生成中...';

  saveCurrentChartOrder();

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'fixed';
    tempContainer.style.top = '-9999px';
    tempContainer.style.left = '0';
    tempContainer.style.width = '750px';
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.padding = '20px';
    document.body.appendChild(tempContainer);

    const titleEl = document.createElement('div');
    titleEl.innerHTML = `
      <h1 style="font-size:20px; color:#2b5797; border-bottom:2px solid #2b5797; padding-bottom:8px; margin-bottom:15px; font-family:sans-serif;">
        ⚔️ 刀剣男士 チーム編成・全グループ詳細＆身長比較レポート
      </h1>
    `;
    tempContainer.appendChild(titleEl);

    for (let i = 0; i < currentGroups.length; i++) {
      const group = currentGroups[i];
      const memberCount = group.members.length;
      const containerWidth = 710;
      const maxBarWidth = 30;
      let barWidth = Math.min(maxBarWidth, Math.floor((containerWidth - 40) / memberCount) - 10);
      barWidth = Math.max(12, barWidth);

      const nameFontSize = memberCount > 6 ? 9 : 11;
      const valFontSize = memberCount > 6 ? 9 : 10;

      const groupEl = document.createElement('div');
      groupEl.style.marginBottom = '30px';
      groupEl.style.fontFamily = 'sans-serif';

      const sortedMembers = [...group.members];
      let tableRows = sortedMembers.map(m => `
        <tr>
          <td style="border:1px solid #ccc; padding:6px;">${m.id || '-'}</td>
          <td style="border:1px solid #ccc; padding:6px;"><strong>${m.name || '-'}</strong></td>
          <td style="border:1px solid #ccc; padding:6px;">${m.height && m.height !== '-' ? m.height + ' cm' : '-'}</td>
          <td style="border:1px solid #ccc; padding:6px;">${m.type || '-'}</td>
          <td style="border:1px solid #ccc; padding:6px;">${m.school || '-'}</td>
        </tr>
      `).join('');

      const maxGraphHeight = 160;
      const heightScale = maxGraphHeight / 220;

      let barsHtml = group.members.map(m => {
        const numHeight = m.height ? parseFloat(String(m.height).replace(/[^0-9.]/g, '')) : 0;
        const barH = Math.round(numHeight * heightScale);
        return `
          <div style="display:flex; flex-direction:column; align-items:center; width:${barWidth}px; flex-shrink:0;">
            <div style="height:${barH}px; width:100%; background:#2b5797; color:#fff; font-size:${valFontSize}px; font-weight:bold; display:flex; justify-content:center; align-items:flex-start; padding-top:2px; border-radius:3px 3px 0 0; box-sizing:border-box;">
              ${numHeight || '?'}
            </div>
            <div style="font-size:${nameFontSize}px; margin-top:6px; font-weight:bold; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; color:#333;">
              ${m.name}
            </div>
          </div>
        `;
      }).join('');

      groupEl.innerHTML = `
        <h2 style="font-size:16px; color:#2b5797; margin-bottom:8px;">部隊 ${group.id} 詳細プロフィール</h2>
        <table style="width:100%; border-collapse:collapse; font-size:12px; margin-bottom:15px;">
          <thead>
            <tr style="background:#f8f9fa; color:#2b5797;">
              <th style="border:1px solid #ccc; padding:6px; text-align:left;">刀帳番号</th>
              <th style="border:1px solid #ccc; padding:6px; text-align:left;">刀剣男士名</th>
              <th style="border:1px solid #ccc; padding:6px; text-align:left;">身長</th>
              <th style="border:1px solid #ccc; padding:6px; text-align:left;">刀種</th>
              <th style="border:1px solid #ccc; padding:6px; text-align:left;">刀派</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        
        <h3 style="font-size:14px; color:#2b5797; margin-bottom:8px;">📊 身長比較図</h3>
        <div style="background:#fafafa; border:1px solid #ccc; height:220px; display:flex; align-items:flex-end; justify-content:space-around; padding:15px 15px 10px 15px; box-sizing:border-box; overflow:hidden;">
          ${barsHtml}
        </div>
      `;

      tempContainer.appendChild(groupEl);
      const canvas = await html2canvas(groupEl, { scale: 2, logging: false });
      const imgData = canvas.toDataURL('image/png');

      if (i > 0) doc.addPage();
      const imgWidth = 182;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const startY = (i === 0) ? 25 : 15;

      doc.addImage(imgData, 'PNG', 14, startY, imgWidth, imgHeight);
      groupEl.remove();
    }

    tempContainer.remove();
    doc.save('刀剣男士_全チームレポート.pdf');
  } catch (err) {
    console.error(err);
    alert("PDF生成エラー: " + err.message);
  } finally {
    pdfBtn.disabled = false;
    pdfBtn.textContent = '📄 全チームPDF保存';
  }
}