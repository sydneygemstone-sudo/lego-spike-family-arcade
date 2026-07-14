const PAGE_COUNT = 26;
const PAGE_PATH = 'assets/pdf-pages';
const pageStack = document.querySelector('#pdf-pages');
const printButton = document.querySelector('#print-pages');
const status = document.querySelector('#print-kit-status');

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle('is-error', isError);
}

function renderPages() {
  const fragment = document.createDocumentFragment();
  for (let page = 1; page <= PAGE_COUNT; page += 1) {
    const number = String(page).padStart(2, '0');
    const figure = document.createElement('figure');
    figure.className = 'print-page';
    figure.dataset.page = String(page);

    const image = document.createElement('img');
    image.src = `${PAGE_PATH}/page-${number}.jpg`;
    image.alt = `SPIKE Prime 打印任务包第 ${page} 页`;
    image.loading = page <= 2 ? 'eager' : 'lazy';
    image.decoding = 'async';

    const caption = document.createElement('figcaption');
    caption.textContent = `${page} / ${PAGE_COUNT}`;
    figure.append(image, caption);
    fragment.append(figure);
  }
  pageStack.append(fragment);
}

function waitForImage(image) {
  image.loading = 'eager';
  if (image.complete && image.naturalWidth > 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    image.addEventListener('load', resolve, { once: true });
    image.addEventListener('error', () => reject(new Error(image.src)), { once: true });
  });
}

async function prepareAllPages() {
  for (let index = 0; index < pageImages.length; index += 1) {
    setStatus(`正在准备打印内容 ${index + 1} / ${PAGE_COUNT}…`);
    await waitForImage(pageImages[index]);
  }
}

renderPages();
const pageImages = [...pageStack.querySelectorAll('img')];
Promise.all(pageImages.slice(0, 2).map(waitForImage))
  .then(() => setStatus('26 页已放在本页，向下滚动即可查看。'))
  .catch(() => setStatus('页面图片载入失败，请返回后重新打开。', true));

printButton.addEventListener('click', async () => {
  printButton.disabled = true;
  setStatus('正在准备 26 页打印内容…');
  try {
    /* iPad Web App 不应同时强制请求 26 张大图；逐页准备可避免 Safari
     * 或简单静态服务器因并发连接过多而丢页。 */
    await prepareAllPages();
    setStatus('打印内容已准备好。');
    window.print();
  } catch {
    setStatus('有页面尚未载入，暂时不能打印，请稍后再试。', true);
  } finally {
    printButton.disabled = false;
  }
});
