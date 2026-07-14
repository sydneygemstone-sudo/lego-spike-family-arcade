const PDF_PATH = 'assets/pdf/Lego_Spike_Prime_Flashcards_And_Games.pdf';
const PDF_NAME = 'SPIKE-Prime-26页打印任务包.pdf';
const pdfUrl = new URL(PDF_PATH, window.location.href);

const shareButton = document.querySelector('#share-pdf');
const openButton = document.querySelector('#open-pdf');
const status = document.querySelector('#print-kit-status');

let pdfFilePromise;

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle('is-error', isError);
}

async function loadPdfFile() {
  if (!pdfFilePromise) {
    pdfFilePromise = fetch(pdfUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`PDF HTTP ${response.status}`);
        return response.blob();
      })
      .then((blob) => new File([blob], PDF_NAME, { type: 'application/pdf' }));
  }
  return pdfFilePromise;
}

shareButton.addEventListener('click', async () => {
  shareButton.disabled = true;
  setStatus('正在准备 PDF…');
  try {
    const file = await loadPdfFile();
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({
        files: [file],
        title: 'SPIKE Prime 26 页打印任务包',
        text: '可在系统分享面板中选择“打印”或“存储到文件”。',
      });
      setStatus('系统分享面板已打开：可选择“打印”或“存储到文件”。');
      return;
    }
    if (navigator.share) {
      await navigator.share({
        title: 'SPIKE Prime 26 页打印任务包',
        text: '打开 PDF 后可打印或存储到文件。',
        url: pdfUrl.href,
      });
      setStatus('已分享 PDF 链接。');
      return;
    }
    setStatus('当前浏览器不支持系统分享，请使用“下载 PDF”或“在新窗口打开”。', true);
  } catch (error) {
    if (error?.name === 'AbortError') setStatus('已取消分享，仍可继续在本页预览。');
    else setStatus('PDF 分享未完成，请改用“下载 PDF”。', true);
  } finally {
    shareButton.disabled = false;
  }
});

openButton.addEventListener('click', () => {
  const opened = window.open(pdfUrl.href, '_blank', 'noopener,noreferrer');
  if (opened) setStatus('PDF 已在新窗口打开；本页仍保留，可随时返回游戏首页。');
  else setStatus('新窗口被系统拦截，请使用“分享 / 打印 PDF”或“下载 PDF”。', true);
});
