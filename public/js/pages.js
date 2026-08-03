/* pages.js — Full-view pages: 404, overview, contact, and projects. */

// ORCID is the canonical index of the published work, so anything without its
// own public landing page links there rather than to a profile page.
const ORCID_URL = 'https://orcid.org/0009-0007-9651-9681';

const RESEARCH_PROJECTS = [
  {
    title: 'Living Machines: Algae-Based Biohybrid Microrobots for Precision Oncology',
    desc: 'Targeted cancer therapy combining microalgae with synthetic drug-delivery systems to navigate hypoxic tumor environments. Awarded the Inflection Grant.',
    tags: ['Precision Oncology', 'Bioengineering', 'Figshare'],
    type: 'research',
    url: 'https://www.authorea.com/users/955969/articles/1376990-living-machines-the-potential-of-abbms-for-precision-oncology'
  },
  {
    title: 'Blastic Plasmacytoid Dendritic Cell Neoplasm with Systemic Mastocytosis',
    desc: 'Case report on a novel presentation of BPDCN arising alongside systemic mastocytosis and an associated hematologic neoplasm. USC Norris.',
    tags: ['Hematology', 'Oncology', 'Case Report'],
    type: 'research',
    url: ORCID_URL
  },
  {
    title: 'A Comprehensive Review of Zinc Deficiency-Associated Anemia',
    desc: 'Review of zinc deficiency as a driver of anemia, covering mechanism, diagnostic pitfalls, and repletion strategy. Preprints.org, 2026.',
    tags: ['Hematology', 'Review', 'Published'],
    type: 'research',
    url: ORCID_URL
  },
  {
    title: 'More than a Trace: Manganese Deficiency and Chronic Anemia',
    desc: 'Case report on manganese deficiency as an under-recognized cause of chronic anemia.',
    tags: ['Hematology', 'Case Report', 'Published'],
    type: 'research',
    url: ORCID_URL
  },
  {
    title: 'Fluoxetine and Behavioral Neuropharmacology',
    desc: 'Meta-analysis synthesizing work on serotonin, testosterone, and neuroanatomy to assess the neuropharmacological effects of SSRIs.',
    tags: ['Neuropharmacology', 'Meta-Analysis', 'SSRI'],
    type: 'research',
    url: ORCID_URL
  }
];

// Things I've built, as distinct from things I've published.
const BUILD_PROJECTS = [
  {
    title: 'Homa',
    desc: 'AI-personalized nootropics platform generating custom compound "stacks" from 2,900+ compounds and 130,000+ interaction entries, behind a safety-gated API.',
    tags: ['Next.js', 'Supabase', 'Three.js'],
    type: 'build',
    url: 'https://homa.bio'
  },
  {
    title: 'Avely',
    desc: 'An AI "health memory" system for daily symptom check-ins, with generated trends and caregiver alerts, paired with a custom ESP8266 check-in device.',
    tags: ['React Native', 'Supabase', 'Arduino'],
    type: 'build',
    url: ''
  },
  {
    title: 'Fara',
    desc: 'A mobile-first AI companion helping neurodiverse adults navigate digital life, money, and social situations, with a privacy-preserving caregiver dashboard.',
    tags: ['React Native', 'Claude API', 'Stripe'],
    type: 'build',
    url: ''
  }
];

function getContactAvailabilityLabel() {
  const status = lastDiscordPresenceData?.status || 'offline';
  if (status === 'offline') return 'Offline';
  return 'Online';
}

function getContactLocalTime() {
  try {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const time = fmt.format(now);
    const offset = (() => {
      const jan = new Date(now.getFullYear(), 0, 1);
      const jul = new Date(now.getFullYear(), 6, 1);
      const stdOff = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
      const laJan = new Date(jan.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
      const laJul = new Date(jul.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
      const isDST = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })).getTimezoneOffset !== undefined;
      // Simple: check if PDT or PST
      const janStr = jan.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', timeZoneName: 'short' });
      return janStr.includes('PST') ? (now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', timeZoneName: 'short' }).includes('PDT') ? 'UTC -7:00' : 'UTC -8:00') : 'UTC -8:00';
    })();
    return { time, offset };
  } catch {
    return { time: '--:--', offset: 'UTC -8:00' };
  }
}

let contactBuilt = false;
let overviewBuilt = false;

function show404() {
  if (window.snowShader) {
    window.snowShader.play();
    return;
  }
  const holder = document.getElementById('snow');
  if (!holder) return;

  const snowflake = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAGAGlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDAgNzkuMTYwNDUxLCAyMDE3LzA1LzA2LTAxOjA4OjIxICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOCAoTWFjaW50b3NoKSIgeG1wOkNyZWF0ZURhdGU9IjIwMTUtMDctMDNUMTg6NTk6MjIrMDI6MDAiIHhtcDpNb2RpZnlEYXRlPSIyMDE5LTAxLTEyVDE1OjE0OjQwKzAxOjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDE5LTAxLTEyVDE1OjE0OjQwKzAxOjAwIiBkYzpmb3JtYXQ9ImltYWdlL3BuZyIgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMyIgcGhvdG9zaG9wOklDQ1Byb2ZpbGU9InNSR0IgSUVDNjE5NjYtMi4xIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOmIzMzBlMWI0LTk5ZDctNGU2NS05MGQ2LTNmYjFiYmE2ZTE0MCIgeG1wTU06RG9jdW1lbnRJRD0iYWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOjAyNThjNzMxLTQ4ZjQtYTA0MS1hNGFkLTQ4MTA2MTVjY2FlYSIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOjJjY2VkMTUyLTRjNzAtNDFlZC1hMzcyLWRlOWY4NjgyZTcwMSI+IDx4bXBNTTpIaXN0b3J5PiA8cmRmOlNlcT4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImNyZWF0ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6MmNjZWQxNTItNGM3MC00MWVkLWEzNzItZGU5Zjg2ODJlNzAxIiBzdEV2dDp3aGVuPSIyMDE1LTA3LTAzVDE4OjU5OjIyKzAyOjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOCAoTWFjaW50b3NoKSIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6YjMzMGUxYjQtOTlkNy00ZTY1LTkwZDYtM2ZiMWJiYTZlMTQwIiBzdEV2dDp3aGVuPSIyMDE5LTAxLTEyVDE1OjE0OjQwKzAxOjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOCAoTWFjaW50b3NoKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9yeT4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz50mbqsAAAToElEQVR4nOVbW49dR5X+VlXtc2v3Ne52N6bTTnAc0u02GRJQwEhYQkJ5QhmhPPOUl0iBB/4AP4JfMA95IEIaJEYiQhlesCZMEE1iGxJHIjK21XbSwX1xd5+zd9Va87BrVdfefWwI4xEaUVJpn7PPPnVqfbUu31pVh0QE/8zN/KMn8I9uTl+8+uqrAAARgYgghIBer4dnnnkGAPDFL34RANDr9eiJJ55AVVUgIhhjwMwYDAbY3Nyk8+fPP/DHdnd3ZWtr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'
  const count = 7000;
  let wind = {
    current: 0,
    force: 0.1,
    target: 0.1,
    min: 0.1,
    max: 0.25,
    easing: 0.005
  };

  if (typeof ShaderProgram === 'undefined') {
    console.error('ShaderProgram not loaded');
    return;
  }

  window.snowShader = new ShaderProgram(holder, {
    depthTest: false,
    texture: snowflake,
    uniforms: {
      worldSize: { type: 'vec3', value: [0, 0, 0] },
      gravity: { type: 'float', value: 100 },
      wind: { type: 'float', value: 0 },
    },
    buffers: {
      size: { size: 1, data: [] },
      rotation: { size: 3, data: [] },
      speed: { size: 3, data: [] },
    },
    vertex: `
      precision highp float;

      attribute vec4 a_position;
      attribute vec4 a_color;
      attribute vec3 a_rotation;
      attribute vec3 a_speed;
      attribute float a_size;

      uniform float u_time;
      uniform vec2 u_mousemove;
      uniform vec2 u_resolution;
      uniform mat4 u_projection;
      uniform vec3 u_worldSize;
      uniform float u_gravity;
      uniform float u_wind;

      varying vec4 v_color;
      varying float v_rotation;

      void main() {
        v_color = a_color;
        v_rotation = a_rotation.x + u_time * a_rotation.y;

        vec3 pos = a_position.xyz;
        pos.x = mod(pos.x + u_time + u_wind * a_speed.x, u_worldSize.x * 2.0) - u_worldSize.x;
        pos.y = mod(pos.y - u_time * a_speed.y * u_gravity, u_worldSize.y * 2.0) - u_worldSize.y;
        pos.x += sin(u_time * a_speed.z) * a_rotation.z;
        pos.z += cos(u_time * a_speed.z) * a_rotation.z;

        gl_Position = u_projection * vec4( pos.xyz, a_position.w );
        gl_PointSize = ( a_size / gl_Position.w ) * 100.0;
      }
    `,
    fragment: `
      precision highp float;
      uniform sampler2D u_texture;
      varying vec4 v_color;
      varying float v_rotation;

      void main() {
        vec2 rotated = vec2(
          cos(v_rotation) * (gl_PointCoord.x - 0.5) + sin(v_rotation) * (gl_PointCoord.y - 0.5) + 0.5,
          cos(v_rotation) * (gl_PointCoord.y - 0.5) - sin(v_rotation) * (gl_PointCoord.x - 0.5) + 0.5
        );
        vec4 snowflake = texture2D(u_texture, rotated);
        gl_FragColor = vec4(snowflake.rgb, snowflake.a * v_color.a);
      }
    `,
    onResize(w, h, dpi) {
      const position = [], color = [], size = [], rotation = [], speed = [];
      const height = 110;
      const width = (w / h) * height;
      const depth = 80;

      Array.from({ length: (w / h) * count }, () => {
        position.push(
          -width + Math.random() * width * 2,
          -height + Math.random() * height * 2,
          Math.random() * depth * 2
        );

        speed.push(
          1 + Math.random(),
          1 + Math.random(),
          Math.random() * 10
        );

        rotation.push(
          Math.random() * 2 * Math.PI,
          Math.random() * 20,
          Math.random() * 10
        );

        color.push(1, 1, 1, 0.1 + Math.random() * 0.2);
        size.push(5 * Math.random() * 5 * ((h * dpi) / 1000));
      });

      this.uniforms.worldSize = [width, height, depth];
      this.buffers.position = position;
      this.buffers.color = color;
      this.buffers.rotation = rotation;
      this.buffers.size = size;
      this.buffers.speed = speed;
    },
    onUpdate(delta) {
      wind.force += (wind.target - wind.force) * wind.easing;
      wind.current += wind.force * (delta * 0.2);
      this.uniforms.wind = wind.current;

      if (Math.random() > 0.995) {
        wind.target = (wind.min + Math.random() * (wind.max - wind.min)) * (Math.random() > 0.5 ? -1 : 1);
      }
    }
  });
}

function showOverview() {
  // Start particle background. three.js comes from a CDN, so treat it as
  // optional — the overview content matters more than its backdrop.
  if (!overviewScene && typeof THREE !== 'undefined') {
    const bgEl = document.getElementById('overview-bg');
    if (bgEl) overviewScene = new OverviewScene(bgEl);
  }
  if (overviewScene) overviewScene.start();

  const container = document.getElementById('overview-scroll-area');
  if (!container) return;
  if (overviewBuilt) return;

  const currentRoles = WORK_TIMELINE_DATA.filter(e => e.date.includes('Present')).slice(0, 4);
  const expRows = currentRoles.map(e =>
    `<div class="ov-exp-row">
      <div class="ov-exp-title">${escHtml(e.title)}</div>
      <div class="ov-exp-org">${escHtml(e.meta.split(' · ')[0])}</div>
      <div class="ov-exp-date">${escHtml(e.date)}</div>
    </div>`
  ).join('');

  // Projects without a public link render as plain rows rather than dead "#" anchors.
  const projectRow = (p) => {
    const inner = `
      <div class="ov-project-title">${escHtml(p.title)}</div>
      <div class="ov-project-desc">${escHtml(p.desc)}</div>
      <div class="ov-project-tags">${p.tags.map(t => `<span class="ov-tag">${escHtml(t)}</span>`).join('')}</div>`;
    return p.url
      ? `<a href="${escHtml(p.url)}" target="_blank" rel="noopener" class="ov-project-row">${inner}</a>`
      : `<div class="ov-project-row is-static">${inner}</div>`;
  };

  const projectRows = RESEARCH_PROJECTS.map(projectRow).join('');
  const buildRows = BUILD_PROJECTS.map(projectRow).join('');

  container.innerHTML = `
    <div class="ov-inner">
      <div class="ov-header">
        <img src="/photos/pfp.png" alt="Camron" class="ov-pfp" />
        <div class="ov-header-text">
          <div class="ov-name">Camron Farjami</div>
          <div class="ov-subtitle">Biology &amp; pre-medicine student. Hematology/oncology researcher. Builder.</div>
        </div>
      </div>

      <div class="ov-doc-row">
        <a href="/photos/Resume.pdf" target="_blank" rel="noopener" class="ov-resume-btn glassy">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          View Resume
        </a>
        <a href="/photos/CV.pdf" target="_blank" rel="noopener" class="ov-resume-btn glassy" title="Full academic CV">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="16" y2="7"/><line x1="9" y1="11" x2="16" y2="11"/></svg>
          View CV
        </a>
      </div>

      <div class="ov-section">
        <div class="ov-section-label">OVERVIEW</div>
        <p class="ov-body">Incoming biology undergraduate at the University of Michigan on the pre-medical track, currently researching hematology and oncology at the Cancer and Blood Specialty Clinic and Loma Linda University Medical Center. Co-author on several peer-reviewed case reports, with parallel work building AI-driven health technology. Outside of that, I ski, cook, and debate (ranked top 50 nationally).</p>
      </div>

      <div class="ov-section">
        <div class="ov-section-label">CURRENT ROLES</div>
        <div class="ov-exp-list">${expRows}</div>
      </div>

      <div class="ov-section">
        <div class="ov-section-label">RESEARCH &amp; PUBLICATIONS</div>
        <div class="ov-project-list">${projectRows}</div>
      </div>

      <div class="ov-section">
        <div class="ov-section-label">BUILDING</div>
        <div class="ov-project-list">${buildRows}</div>
      </div>

      <div class="ov-section">
        <div class="ov-section-label">AWARDS</div>
        <div class="ov-awards-list">
          <div class="ov-award-row">
            <div class="ov-award-title">Inflection Grant Recipient</div>
            <div class="ov-award-sub">1 of 5 from 350+ applicants — Edge City &amp; Long Journey Ventures, Jun 2025</div>
          </div>
          <div class="ov-award-row">
            <div class="ov-award-title">Silver Medalist</div>
            <div class="ov-award-sub">US Medicine &amp; Disease Olympiad — top 15% of 1,318, Aug 2025</div>
          </div>
          <div class="ov-award-row">
            <div class="ov-award-title">Certificate of Presentation</div>
            <div class="ov-award-sub">MOASC Oncology Leadership &amp; Research Summit, Mar 2026</div>
          </div>
          <div class="ov-award-row">
            <div class="ov-award-title">4th in California</div>
            <div class="ov-award-sub">Technology Student Association — 1st at PVPHS, Feb 2025</div>
          </div>
        </div>
      </div>

      <div class="ov-section">
        <div class="ov-section-label">CERTIFICATIONS</div>
        <div class="ov-certs-list">
          <div class="ov-cert-row">Certificate Member <span class="ov-cert-issuer">American Federation for Medical Research</span></div>
          <div class="ov-cert-row">Biology Program <span class="ov-cert-issuer">Science Mentorship Institute</span></div>
          <div class="ov-cert-row">Research Foundations <span class="ov-cert-issuer">Non-Trivial</span></div>
          <div class="ov-cert-row">Statistics and R <span class="ov-cert-issuer">HarvardX</span></div>
          <div class="ov-cert-row">First Aid / CPR / AED <span class="ov-cert-issuer">American Red Cross</span></div>
          <div class="ov-cert-row">1st Poom Black Belt <span class="ov-cert-issuer">Kukkiwon</span></div>
        </div>
      </div>

      <div class="ov-section ov-links-section">
        <div class="ov-section-label">LINKS</div>
        <div class="ov-links">
          <a href="/photos/Resume.pdf" target="_blank" rel="noopener">resume</a>
          <span class="ov-link-sep">|</span>
          <a href="/photos/CV.pdf" target="_blank" rel="noopener">cv</a>
          <span class="ov-link-sep">|</span>
          <a href="mailto:camron@camr.one">email</a>
          <span class="ov-link-sep">|</span>
          <a href="https://www.linkedin.com/in/camron-farjami-608822359/" target="_blank" rel="noopener">linkedin</a>
          <span class="ov-link-sep">|</span>
          <a href="https://github.com/LuxologyGG" target="_blank" rel="noopener">github</a>
          <span class="ov-link-sep">|</span>
          <a href="https://orcid.org/0009-0007-9651-9681" target="_blank" rel="noopener">orcid</a>
        </div>
      </div>
    </div>
  `;
}

function showContact() {
  const container = document.getElementById('contact-scroll-area');
  if (!container) return;

  if (contactBuilt) {
    // Just update dynamic bits
    updateContactDynamic();
    return;
  }
  contactBuilt = true;

  const localTime = getContactLocalTime();
  const availability = getContactAvailabilityLabel();
  const availClass = availability === 'Online' ? 'contact-available' : 'contact-unavailable';
  const dotClass = availability === 'Online' ? 'status-online' : 'status-offline';

  container.innerHTML = `
    <div class="contact-top-row" style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px;">
      <div class="contact-info-bar">
        <div class="contact-locale" id="contact-locale">Los Angeles, CA · ${localTime.time} (${localTime.offset})</div>
        <div class="contact-availability-wrap">
          <span class="contact-availability ${availClass}" id="contact-avail">
            <span class="contact-avail-dot ${dotClass}" id="contact-avail-dot"></span>
            <span id="contact-avail-text">${availability}</span>
          </span>
          <div class="contact-avail-tooltip">Typically available between 3:00 PM and 9:00 PM</div>
        </div>
      </div>
      <div class="contact-actions">
        <a href="tel:+13109740174" class="contact-action-btn glassy" title="Call me">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          <span>Phone</span>
        </a>
        <a href="mailto:camron@camr.one" class="contact-action-btn glassy" title="Email me">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          <span>Email</span>
        </a>
      </div>
    </div>
    <div class="contact-cal-section glassy">
      <div style="width:100%;height:100%;overflow:scroll" id="my-cal-inline-quick-chat"></div>
    </div>
  `;

  // Load Cal.com embed
  (function (C, A, L) {
    let p = function (a, ar) { a.q.push(ar); };
    let d = C.document;
    C.Cal = C.Cal || function () {
      let cal = C.Cal;
      let ar = arguments;
      if (!cal.loaded) {
        cal.ns = {};
        cal.q = cal.q || [];
        d.head.appendChild(d.createElement("script")).src = A;
        cal.loaded = true;
      }
      if (ar[0] === L) {
        const api = function () { p(api, arguments); };
        const namespace = ar[1];
        api.q = api.q || [];
        if (typeof namespace === "string") {
          cal.ns[namespace] = cal.ns[namespace] || api;
          p(cal.ns[namespace], ar);
          p(cal, ["initNamespace", namespace]);
        } else p(cal, ar);
        return;
      }
      p(cal, ar);
    };
  })(window, "https://app.cal.com/embed/embed.js", "init");

  Cal("init", "quick-chat", { origin: "https://app.cal.com" });

  Cal.ns["quick-chat"]("inline", {
    elementOrSelector: "#my-cal-inline-quick-chat",
    config: { "layout": "month_view", "useSlotsViewOnSmallScreen": "true" },
    calLink: "camronf/quick-chat",
  });

  Cal.ns["quick-chat"]("ui", { "hideEventTypeDetails": false, "layout": "month_view" });
}

function updateContactDynamic() {
  const localeEl = document.getElementById('contact-locale');
  const availEl = document.getElementById('contact-avail');
  const availDotEl = document.getElementById('contact-avail-dot');
  const availTextEl = document.getElementById('contact-avail-text');
  if (!localeEl) return;
  const localTime = getContactLocalTime();
  localeEl.textContent = `Los Angeles, CA · ${localTime.time} (${localTime.offset})`;
  const availability = getContactAvailabilityLabel();
  if (availEl) {
    availEl.className = `contact-availability ${availability === 'Online' ? 'contact-available' : 'contact-unavailable'}`;
  }
  if (availDotEl) {
    availDotEl.className = `contact-avail-dot ${availability === 'Online' ? 'status-online' : 'status-offline'}`;
  }
  if (availTextEl) availTextEl.textContent = availability;
}

function showProjects() {
  exploreSubView = 'projects';
  searchResultsEl.innerHTML = '';

  // GitHub Activity card with contribution graph
  const ghCard = document.createElement('div');
  ghCard.className = 'ip-info-card glassy';
  ghCard.innerHTML = `
    <div class="github-header">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
      <span>GitHub Activity</span>
      <a class="github-profile-link" href="https://github.com/LuxologyGG" target="_blank" rel="noreferrer">@LuxologyGG</a>
    </div>
    <div class="contrib-graph">
      <div class="github-loading">Loading contributions...</div>
    </div>
  `;
  searchResultsEl.appendChild(ghCard);

  // Projects list card
  const projCard = document.createElement('div');
  projCard.className = 'ip-info-card glassy';
  projCard.style.marginTop = '12px';
  projCard.innerHTML = `
    <div class="projects-header">Projects</div>
    <div class="projects-grid">
      <div class="github-loading">Loading...</div>
    </div>
  `;
  searchResultsEl.appendChild(projCard);

  const username = 'LuxologyGG';

  // Fetch contribution graph from our worker proxy
  fetch('/api/github-contributions')
    .then(r => r.json())
    .then(data => {
      buildContribGraph(ghCard.querySelector('.contrib-graph'), data);
    })
    .catch(() => {
      ghCard.querySelector('.contrib-graph').innerHTML = '<div class="github-loading">Could not load contributions</div>';
    });

  // Fetch repos for project cards
  fetch('https://api.github.com/users/' + username + '/repos?sort=updated&per_page=30')
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(repos => {
      buildProjectCards(projCard.querySelector('.projects-grid'), repos);
    })
    .catch(() => {
      buildProjectCards(projCard.querySelector('.projects-grid'), []);
    });
}

function buildContribGraph(container, data) {
  const { total, contributions } = data;

  const dateMap = {};
  contributions.forEach(c => {
    dateMap[c.date] = { level: c.level, count: c.count || 0 };
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();

  // Start from Sunday, ~52 weeks ago
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 52 * 7 - dayOfWeek);

  // Build day-by-day array
  const days = [];
  const d = new Date(startDate);
  while (d <= today) {
    const ds = d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
    const entry = dateMap[ds] || { level: 0, count: 0 };
    days.push({ date: ds, level: entry.level, count: entry.count });
    d.setDate(d.getDate() + 1);
  }

  // Pad remaining days in last week
  while (days.length % 7 !== 0) {
    days.push(null);
  }

  const numWeeks = days.length / 7;

  // Month labels
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let monthLabels = '';
  let lastMonth = -1;
  for (let w = 0; w < numWeeks; w++) {
    for (let di = 0; di < 7; di++) {
      const day = days[w * 7 + di];
      if (day) {
        const m = parseInt(day.date.slice(5, 7)) - 1;
        if (m !== lastMonth) {
          monthLabels += `<span class="contrib-month-label" style="left:${w * 13}px">${monthNames[m]}</span>`;
          lastMonth = m;
        }
        break;
      }
    }
  }

  // Build grid cells (column-first: each column = 1 week)
  let cells = '';
  for (let w = 0; w < numWeeks; w++) {
    for (let di = 0; di < 7; di++) {
      const day = days[w * 7 + di];
      if (!day) {
        cells += '<div class="contrib-cell contrib-empty"></div>';
      } else {
        const dateObj = new Date(day.date + 'T12:00:00');
        const formatted = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        const countText = day.count === 0 ? 'No' : day.count;
        const plural = day.count === 1 ? 'contribution' : 'contributions';
        cells += `<div class="contrib-cell" data-level="${day.level}" data-tooltip="${countText} ${plural} on ${formatted}"></div>`;
      }
    }
  }

  const gridWidth = numWeeks * 13 - 3;

  container.innerHTML = `
    <div class="contrib-count">${total} contributions in the last year</div>
    <div class="contrib-scroll">
      <div class="contrib-grid-wrap">
        <div class="contrib-days">
          <span></span><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span>
        </div>
        <div class="contrib-col">
          <div class="contrib-months" style="width:${gridWidth}px">${monthLabels}</div>
          <div class="contrib-grid">${cells}</div>
        </div>
      </div>
    </div>
    <div class="contrib-footer">
      <span class="contrib-hint">Hover a day to inspect activity.</span>
      <div class="contrib-legend">
        <span>Less</span>
        <div class="contrib-cell" data-level="0"></div>
        <div class="contrib-cell" data-level="1"></div>
        <div class="contrib-cell" data-level="2"></div>
        <div class="contrib-cell" data-level="3"></div>
        <div class="contrib-cell" data-level="4"></div>
        <span>More</span>
      </div>
    </div>
  `;

  // Tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'contrib-tooltip';
  container.style.position = 'relative';
  container.appendChild(tooltip);

  container.addEventListener('mouseover', e => {
    const cell = e.target.closest('.contrib-cell[data-tooltip]');
    if (cell) {
      tooltip.textContent = cell.dataset.tooltip;
      tooltip.style.display = 'block';
      const rect = cell.getBoundingClientRect();
      const cRect = container.getBoundingClientRect();
      tooltip.style.left = (rect.left - cRect.left + rect.width / 2) + 'px';
      tooltip.style.top = (rect.top - cRect.top - 28) + 'px';
    }
  });

  container.addEventListener('mouseout', e => {
    if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest('.contrib-tooltip')) {
      tooltip.style.display = 'none';
    }
  });

  // Scroll to the right (most recent) end
  const scrollEl = container.querySelector('.contrib-scroll');
  if (scrollEl) requestAnimationFrame(() => { scrollEl.scrollLeft = scrollEl.scrollWidth; });
}

function buildProjectCards(gridEl, repos) {
  const repoCards = repos
    .filter(r => !r.fork)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 6)
    .map((r, i) => {
      const tags = [r.language, ...(r.topics || [])].filter(Boolean).slice(0, 3);
      return `<a class="project-card" href="${r.html_url}" target="_blank" rel="noreferrer" style="animation-delay:${i * 60 + 40}ms">
        <div class="project-card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
        <div class="project-card-body">
          <div class="project-card-title">${escHtml(r.name)}</div>
          <div class="project-card-desc">${escHtml(r.description || 'No description')}</div>
          ${tags.length ? `<div class="project-card-tags">${tags.map(t => `<span class="project-tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
        </div>
        <span class="project-type-badge repo">repo</span>
        <svg class="project-card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </a>`;
    });

  const BUILD_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>';
  const RESEARCH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>';

  // A project without a public link still deserves a card — it just renders as
  // a plain div rather than a dead anchor.
  const renderCard = (p, delay, icon) => {
    const inner = `
      <div class="project-card-icon">${icon}</div>
      <div class="project-card-body">
        <div class="project-card-title">${escHtml(p.title)}</div>
        <div class="project-card-desc">${escHtml(p.desc)}</div>
        <div class="project-card-tags">${p.tags.map(t => `<span class="project-tag">${escHtml(t)}</span>`).join('')}</div>
      </div>
      <span class="project-type-badge ${p.type}">${p.type}</span>`;
    return p.url
      ? `<a class="project-card" href="${escHtml(p.url)}" target="_blank" rel="noreferrer" style="animation-delay:${delay}ms">${inner}
        <svg class="project-card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </a>`
      : `<div class="project-card is-static" style="animation-delay:${delay}ms">${inner}</div>`;
  };

  let offset = repoCards.length;
  const buildCards = BUILD_PROJECTS.map((p, i) => renderCard(p, (offset + i) * 60 + 40, BUILD_ICON));

  offset += BUILD_PROJECTS.length;
  const researchCards = RESEARCH_PROJECTS.map((p, i) => renderCard(p, (offset + i) * 60 + 40, RESEARCH_ICON));

  gridEl.innerHTML = repoCards.join('') + buildCards.join('') + researchCards.join('');
}
