/* ============================================================
   CleanRead — paylaşılan mantık
   Tüm ekranlar (index / ders / oku) bu dosyayı kullanır.
   ============================================================ */

const CR = (() => {

  // İçerik tek, sabit bir uç noktadan alınır; kullanıcıya hiçbir teknik ayrıntı gösterilmez.
  const SOURCE_ENDPOINT = 'https://bold-haze-8d0d.hasanberatkaylan.workers.dev';

  const DEFAULT_ICON = 'menu_book';

  // ---------- Ders/kitap verisi ----------
  async function loadKitaplar() {
    const res = await fetch('kitaplar.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('kitaplar.json okunamadı');
    return res.json();
  }

  // ---------- URL üretimi ----------
  function buildTargetUrl(template, pageNo) {
    if (!template || !pageNo) return null;
    return template.includes('{sayfa}')
      ? template.replace('{sayfa}', pageNo)
      : template.replace(/\/?$/, '') + `-sayfa-${pageNo}/`;
  }

  // ---------- İçeriği getirme ----------
  async function fetchContent(targetUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`${SOURCE_ENDPOINT}/?url=${encodeURIComponent(targetUrl)}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error();
      const html = await res.text();
      if (!html || html.length < 200) throw new Error();
      return html;
    } catch {
      throw new Error('İçerik şu anda alınamadı. Lütfen birkaç saniye sonra tekrar dene.');
    }
  }

  // ---------- HTML ayrıştırma ----------
  const SUBJECT_ICON_FILES = /\/(fen|sosyal|turkce|türkçe|matematik|ingilizce|din|edebiyat|cografya|coğrafya|tarih|fizik|kimya|biyoloji)\.(webp|png|jpe?g|svg)(\?.*)?$/i;

  function isJunkImageSrc(src) {
    if (!src) return true;
    if (/\.gif(\?.*)?$/i.test(src)) return true;
    if (SUBJECT_ICON_FILES.test(src)) return true;
    if (/\/cdn-minio\/uploads\/library\//i.test(src)) return true;
    if (/logo|avatar|banner|icon|pixel|emoji|quick|share|gravatar/i.test(src)) return true;
    return false;
  }

  function resolveImgSrc(img, originForRelative) {
    let src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('src');
    if (!src) return null;
    if (src.startsWith('//')) src = 'https:' + src;
    else if (src.startsWith('/') && originForRelative) src = originForRelative + src;
    return src;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // html: ham HTML kaynağı. originForRelative: göreceli görsel yolları için origin.
  // Dönen değer: { answers: [{text, inlineImage}], images: [src, ...] }
  function extractAnswers(html, originForRelative) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const content = doc.querySelector('.entry-content, article, .post-content, main') || doc.body;

    const junkSelectors = [
      'script', 'style', 'noscript', 'iframe',
      '.adsbygoogle', '.ad', '.reklam', '.advertisement',
      '.yararli-linkler', '.reactions', '.emoji-picker',
      '.post-share', 'nav', 'header', 'footer', '.comments', '#comments'
    ];
    junkSelectors.forEach(sel => content.querySelectorAll(sel).forEach(el => el.remove()));

    const seen = new Set();
    const answerNodes = [];
    content.querySelectorAll('p, li, div').forEach(node => {
      if (node.querySelector('p, li, div')) return;
      const text = node.innerText?.trim();
      if (!text || text.length < 3) return;
      if (text.includes('ulaşabilmek ve dersinizi') || text.includes('aşağıdaki yayınımızı')) return;
      if (!/\b(Cevap|Soru)\s*:/i.test(text)) return;
      if (text.length > 12) {
        if (seen.has(text)) return;
        seen.add(text);
      }
      answerNodes.push({ node, text });
    });

    const consumedImgSrcs = new Set();
    function findAnswerImage(node) {
      const localImg = node.querySelector('img');
      if (localImg) {
        const src = resolveImgSrc(localImg, originForRelative);
        if (src && !isJunkImageSrc(src)) return src;
      }
      let sib = node.nextElementSibling;
      let hops = 0;
      while (sib && hops < 6) {
        const sibText = sib.innerText ? sib.innerText.trim() : '';
        if (/\b(Cevap|Soru)\s*:/i.test(sibText)) break;
        const foundImg = sib.tagName === 'IMG' ? sib : sib.querySelector('img');
        if (foundImg) {
          const src = resolveImgSrc(foundImg, originForRelative);
          if (src && !isJunkImageSrc(src)) return src;
        }
        sib = sib.nextElementSibling;
        hops++;
      }
      return null;
    }

    const answers = answerNodes.map(({ node, text }) => {
      const isEmptyCevap = /Cevap\s*:\s*$/i.test(text);
      let inlineImage = null;
      if (isEmptyCevap) {
        inlineImage = findAnswerImage(node);
        if (inlineImage) consumedImgSrcs.add(inlineImage);
      }
      return { text, inlineImage };
    });

    const imgSeen = new Set();
    const images = [];
    content.querySelectorAll('img').forEach(img => {
      const src = resolveImgSrc(img, originForRelative);
      if (!src) return;
      if (isJunkImageSrc(src)) return;
      if (consumedImgSrcs.has(src)) return;
      if (imgSeen.has(src)) return;
      imgSeen.add(src);
      images.push(src);
    });

    return { answers, images };
  }

  // ---------- Lightbox (tüm ekranlarda aynı davranış) ----------
  function initLightbox() {
    const lb = document.getElementById('lightbox');
    const lbImg = document.getElementById('lightboxImg');
    if (!lb || !lbImg) return { open() {}, close() {} };
    lb.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    function open(src) { lbImg.src = src; lb.classList.add('open'); }
    function close() { lb.classList.remove('open'); lbImg.src = ''; }
    return { open, close };
  }

  // ---------- URL parametre yardımcıları ----------
  function qs(name) {
    return new URLSearchParams(location.search).get(name);
  }

  // ---------- Metin/görsel seçimini ve sağ tık menüsünü kapat ----------
  document.addEventListener('contextmenu', e => {
    if (e.target.tagName === 'IMG') e.preventDefault();
  });
  document.addEventListener('dragstart', e => {
    if (e.target.tagName === 'IMG') e.preventDefault();
  });

  return {
    loadKitaplar,
    buildTargetUrl, fetchContent, extractAnswers, escapeHtml,
    isJunkImageSrc, resolveImgSrc, initLightbox, qs, DEFAULT_ICON,
  };
})();
