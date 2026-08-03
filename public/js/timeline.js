/* timeline.js — Experience data and the horizontal timeline widget. */

// Roles and education, newest first in the resume but rendered oldest-first by
// buildHorizontalTimeline(). Only `date`, `title`, `meta`, and `body` are read.
const WORK_TIMELINE_DATA = [
  {
    id: 'cbsc_intern',
    date: 'Jun 2026 - Present',
    title: 'Research Intern',
    meta: 'Cancer and Blood Specialty Clinic · Jun 2026 - Present · Long Beach, CA',
    body: [
      'Support hematology/oncology research in an outpatient clinical setting.',
      'Contribute to clinical case reports and manuscript preparation.'
    ]
  },
  {
    id: 'umich_bs',
    date: 'Aug 2026 - May 2030',
    title: 'B.S. Biology',
    meta: 'University of Michigan · Aug 2026 - May 2030 (expected) · Ann Arbor, MI',
    body: [
      'Incoming undergraduate on the pre-medical track.',
      'Bachelor of Science in Biology with a minor in Business.'
    ]
  },
  {
    id: 'loma_linda_researcher',
    date: 'Feb 2025 - Present',
    title: 'Researcher',
    meta: 'Loma Linda University Medical Center · Feb 2025 - Present · Hybrid, CA',
    body: [
      'Work under Dr. Mojtaba Akhtari on hematology and oncology research projects.',
      'Contribute to case reports and clinical papers on multiple myeloma and complex malignancies.',
      'Presented onstage at the MOASC 2026 Oncology Leadership & Research Summit, one of three high school students in attendance.'
    ]
  },
  {
    id: 'usc_assistant_researcher',
    date: 'Sep 2025 - Jun 2026',
    title: 'Assistant Researcher',
    meta: 'USC Norris Comprehensive Cancer Center · Sep 2025 - Jun 2026 · Los Angeles, CA',
    body: [
      'Researched under Dr. George Yaghmour, MD in hematology/oncology.',
      'Gained clinical exposure to AML regimens, stem cell transplantation, and multidisciplinary care coordination.',
      'Co-authored 4 published case reports, including a novel presentation of BPDCN arising with systemic mastocytosis.'
    ]
  },
  {
    id: 'southbay_board',
    date: 'Feb 2025 - May 2026',
    title: 'Board Member & Lead Web Developer',
    meta: 'South Bay STEM Association · Feb 2025 - May 2026 · Rancho Palos Verdes, CA',
    body: [
      'Oversaw STEM initiatives and mentored students.',
      'Built and maintained the web platforms supporting education and community outreach.'
    ]
  },
  {
    id: 'nyas_student',
    date: 'Aug 2025 - Mar 2026',
    title: 'Student, Junior Academy',
    meta: 'The New York Academy of Sciences · Aug 2025 - Mar 2026 · Remote',
    body: [
      'Selected for a global community of high-achieving students and STEM mentors.',
      'Collaborated on international innovation challenges across sustainability, energy, and global health.'
    ]
  },
  {
    id: 'ucla_intern',
    date: 'May 2025 - Feb 2026',
    title: 'Intern',
    meta: 'UCLA Computer Science · May 2025 - Feb 2026 · Los Angeles, CA',
    body: [
      'Contributed to "Hot Potato", a GPS-based multiplayer mobile game focused on real-world interaction.',
      'Worked across design, development, debugging, and gameplay logic.'
    ]
  },
  {
    id: 'smi_student',
    date: 'Jun 2025 - Oct 2025',
    title: 'Student',
    meta: 'Science Mentorship Institute · Jun 2025 - Oct 2025 · Remote',
    body: [
      'Accepted into the Biology Mentorship Program (10% acceptance rate).',
      'Conducted independent research and presented cancer research outcomes.'
    ]
  },
  {
    id: 'nontrivial_fellow',
    date: 'Feb 2025 - May 2025',
    title: 'Research Fellow',
    meta: 'Non-Trivial · Feb 2025 - May 2025 · Remote',
    body: [
      'Selected for a competitive research training program (<10% acceptance rate).',
      'Authored a proposal on algae-based biohybrid microrobots for precision tumor targeting, awarded the Inflection Grant.'
    ]
  },
  {
    id: 'laccd_dual',
    date: 'May 2025 - Jul 2025',
    title: 'Dual Enrollment',
    meta: 'Los Angeles Community College District · May 2025 - Jul 2025 · GPA 4.00/4.00',
    body: ['Coursework: STAT-001 (A).']
  },
  {
    id: 'elcamino_dual',
    date: 'Jun 2024 - Aug 2025',
    title: 'Dual Enrollment',
    meta: 'El Camino College · Jun 2024 - Aug 2025 · GPA 4.00/4.00',
    body: ['Coursework: HIST-102 (A), PSYC-101 (A), PHYS-2A.']
  },
  {
    id: 'hs_diploma',
    date: '2022 - 2026',
    title: 'High School Diploma',
    meta: 'Palos Verdes Peninsula High School · 2022 - 2026 · GPA 3.8 UW / 4.5 W · SAT 1530',
    body: [
      'Activities: Peninsula Debate (ranked top 50 nationally), Science NHS, TSA, Philosophy Club Treasurer, Aerospace Club Co-Founder, Science Olympiad, CSF, Tennis.',
      'Coursework: 11 APs including Biology, Chemistry, and Calculus AB.'
    ]
  },
  {
    id: 'instructor_tkd',
    date: 'Feb 2021 - Mar 2023',
    title: 'Instructor',
    meta: 'Rolling Hills Taekwondo · Feb 2021 - Mar 2023 · Rolling Hills Estates, CA',
    body: [
      'Taught taekwondo fundamentals, discipline, and self-defense.',
      'Managed classes in a structured, fast-paced environment.'
    ]
  }
];

function buildHorizontalTimeline() {
  if (htlBuilt) return;
  htlBuilt = true;
  const track = document.getElementById('htl-track');
  const detailEl = document.getElementById('htl-detail');
  if (!track || !detailEl) return;

  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  // Sort by the start of each entry. Matching on the year alone left everything
  // that began in the same year in whatever order the array happened to be in,
  // so parse the leading month too where one is given.
  function startsAt(date) {
    const m = date.match(/^\s*(?:([A-Za-z]{3})[a-z]*\s+)?(20\d{2})/);
    if (!m) return 0;
    const month = m[1] ? MONTHS.indexOf(m[1].toLowerCase()) : 0;
    return +m[2] * 12 + (month < 0 ? 0 : month);
  }

  const data = WORK_TIMELINE_DATA.slice().sort((a, b) => startsAt(a.date) - startsAt(b.date));

  let activeIdx = -1;

  // Build nodes
  data.forEach((item, i) => {
    const node = document.createElement('button');
    node.className = 'htl-node';
    node.dataset.idx = i;
    node.innerHTML = `
      <span class="htl-dot"></span>
      <span class="htl-label">${item.title}</span>
      <span class="htl-date">${item.date}</span>
    `;
    track.appendChild(node);
  });

  // Add "click here" hint to the left of the first dot
  const firstNode = track.querySelector('.htl-node');
  if (firstNode) {
    const hint = document.createElement('span');
    hint.className = 'htl-click-hint';
    hint.id = 'htl-hint';
    hint.innerHTML = '<span class="htl-click-hint-text">Click here to<br>learn more</span><svg class="htl-click-hint-arrow" viewBox="0 0 50 30"><path d="M2 22 Q18 24 28 16 Q38 8 48 12 L41 7 M48 12 L41 17"/></svg>';
    firstNode.appendChild(hint);
  }

  function closeDetail() {
    if (activeIdx === -1) return;
    const prev = track.querySelector('.htl-node.is-active');
    if (prev) prev.classList.remove('is-active');
    detailEl.classList.remove('is-open');
    detailEl.innerHTML = '';
    activeIdx = -1;
    const cs = document.querySelector('.exp-coding-section');
    if (cs) cs.classList.remove('is-hidden');
  }

  const codingSection = document.querySelector('.exp-coding-section');

  function wordReveal(el, text, baseDelay, wordDelay) {
    el.innerHTML = '';
    const words = text.split(' ');
    words.forEach((word, i) => {
      const span = document.createElement('span');
      span.className = 'htl-word';
      span.textContent = word;
      span.style.animationDelay = (baseDelay + i * wordDelay) + 'ms';
      el.appendChild(span);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  }

  function openDetail(idx) {
    const item = data[idx];
    if (!item) return;
    const wasOpen = activeIdx === idx;
    closeDetail();
    if (wasOpen) {
      if (codingSection) codingSection.classList.remove('is-hidden');
      return;
    }

    activeIdx = idx;
    const nodeEl = track.querySelectorAll('.htl-node')[idx];
    nodeEl.classList.add('is-active');

    if (codingSection) codingSection.classList.add('is-hidden');

    // Scroll node toward center
    const wrap = track.parentElement;
    const nodeRect = nodeEl.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const offset = nodeRect.left - wrapRect.left + track.parentElement.scrollLeft
                   - (wrapRect.width / 2) + (nodeRect.width / 2);
    wrap.scrollTo({ left: offset, behavior: 'smooth' });

    detailEl.innerHTML = `
      <div class="htl-detail-date"></div>
      <div class="htl-detail-title"></div>
      <div class="htl-detail-meta"></div>
      <ul class="htl-detail-body"></ul>
    `;

    requestAnimationFrame(() => {
      detailEl.classList.add('is-open');
      const dateEl = detailEl.querySelector('.htl-detail-date');
      const titleEl = detailEl.querySelector('.htl-detail-title');
      const metaEl = detailEl.querySelector('.htl-detail-meta');
      const bodyEl = detailEl.querySelector('.htl-detail-body');

      wordReveal(dateEl, item.date, 50, 60);
      wordReveal(titleEl, item.title, 150, 70);
      wordReveal(metaEl, item.meta, 300, 40);

      const metaWords = item.meta.split(' ').length;
      const bodyStart = 300 + metaWords * 40 + 100;
      item.body.forEach((line, i) => {
        const li = document.createElement('li');
        bodyEl.appendChild(li);
        wordReveal(li, line, bodyStart + i * 200, 30);
      });
    });
  }

  track.addEventListener('click', (e) => {
    const node = e.target.closest('.htl-node');
    if (!node) return;
    const hint = document.getElementById('htl-hint');
    if (hint) hint.classList.add('is-hidden');
    openDetail(+node.dataset.idx);
  });

  // Drag-to-scroll
  const wrap = track.parentElement;
  let isDragging = false, startX, scrollLeft;

  wrap.addEventListener('mousedown', (e) => {
    if (e.target.closest('.htl-detail')) return;
    isDragging = true;
    wrap.classList.add('is-dragging');
    startX = e.pageX - wrap.offsetLeft;
    scrollLeft = wrap.scrollLeft;
  });
  wrap.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - wrap.offsetLeft;
    wrap.scrollLeft = scrollLeft - (x - startX);
  });
  const stopDrag = () => { isDragging = false; wrap.classList.remove('is-dragging'); };
  wrap.addEventListener('mouseup', stopDrag);
  wrap.addEventListener('mouseleave', stopDrag);

  // Horizontal wheel support
  wrap.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault();
    wrap.scrollLeft += e.deltaY;
  }, { passive: false });
}
