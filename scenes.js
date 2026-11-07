const SVG = 'http://www.w3.org/2000/svg';

const layer = (name, content) => `<svg class="scene-layer ${name}" viewBox="0 0 800 700" aria-hidden="true" xmlns="${SVG}">${content}</svg>`;
const clouds = `<path d="M-80 209c25-53 92-60 125-17 14-72 105-97 156-45 41-28 104-3 109 43 59-5 84 33 82 57H-80z" fill="#fff6dc"/><path d="M518 109c11-34 60-53 91-22 16-45 80-47 99-7 42-4 71 28 66 61H518z" fill="#fff8e9"/>`;
const stars = Array.from({length:22},(_,i)=>`<path class="little-star" style="animation-delay:${(i*.31).toFixed(2)}s" d="m${30+(i*137)%745} ${30+(i*83)%390} 3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#ffedb1" opacity="${.35+(i%4)*.16}"/>`).join('');
const hills = `<path d="M-30 490Q130 355 290 460T850 400v340H-30z" fill="#819888"/><path d="M-30 555Q160 438 350 532T850 490v250H-30z" fill="#4f7a70"/><path d="M-40 640Q100 548 330 610T850 559v181H-40z" fill="#315e59"/>`;
const trees = `<g fill="#527269"><path d="m82 578 0-194h5v194z"/><ellipse cx="75" cy="401" rx="30" ry="67" transform="rotate(-26 75 401)"/><ellipse cx="99" cy="352" rx="29" ry="68" transform="rotate(11 99 352)"/><ellipse cx="119" cy="453" rx="29" ry="61" transform="rotate(32 119 453)"/></g><g fill="#264d4c"><path d="m700 616 0-201h6v201z"/><ellipse cx="686" cy="430" rx="27" ry="63" transform="rotate(-25 686 430)"/><ellipse cx="723" cy="379" rx="28" ry="68" transform="rotate(16 723 379)"/><ellipse cx="738" cy="503" rx="25" ry="58" transform="rotate(35 738 503)"/></g>`;
const moon = `<defs><radialGradient id="puppetMoon"><stop stop-color="#fff4bd"/><stop offset="1" stop-color="#e9c97f"/></radialGradient></defs><circle cx="563" cy="205" r="115" fill="#fae5a5" opacity=".08"/><path d="M598 113a99 99 0 1 0 72 153 97 97 0 0 1-72-153" fill="url(#puppetMoon)"/><path d="M558 213q9 13 20 0m18-1q9 12 20-1" stroke="#b28c53" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M577 240q8 8 17 0" stroke="#b28c53" stroke-width="2" fill="none"/><ellipse cx="563" cy="232" rx="10" ry="5" fill="#dda584" opacity=".55"/>`;
const kite = `<g transform="translate(500 190) rotate(12)"><path d="m0-88 64 79L0 60-61-9z" fill="#e6b773"/><path d="m0-88 0 148-61-69z" fill="#f1d39a"/><path d="m0-88 64 79-64 0z" fill="#cf8060"/><path d="M0-88V60m-61-69 125 0" stroke="#fff1c8" stroke-width="2"/><path class="kite-tail" d="M0 60q-28 25 0 55t-12 57" fill="none" stroke="#f3d9a6" stroke-width="3"/><path d="m-9 91-16-4 5 17 14-2 12 15 6-17-16-5m0 44-15-4 4 16 13-2 11 13 6-16-15-4" fill="#d68160"/></g><path d="M498 248Q477 415 388 568" stroke="#f5e5bb" stroke-width="1.5" opacity=".7" fill="none"/>`;
const fish = `<g fill="#e1d69a"><path d="M555 390q26-19 50 0-24 23-50 0l-17 15v-30z"/><circle cx="596" cy="388" r="2" fill="#335c62"/><path d="M498 311q20-16 40 0-20 19-40 0l-14 12v-24z"/><path d="M633 290q17-12 33 0-16 14-33 0l-12 10v-20z"/></g>`;

export function mountScene(container, theme, pageIndex) {
  container.replaceChildren();
  container.className = 'pop-scene theme-' + theme;
  container.dataset.phase = String(pageIndex);
  const world = document.createElement('div');
  world.className = 'scene-world';
  const ground = layer('layer-hills', hills);
  const cloudLayer = layer('layer-clouds', clouds);
  const starLayer = layer('layer-stars', stars);
  const foreground = layer('layer-trees', trees);
  let content;
  if (theme === 'ocean') {
    content = `${starLayer}<div class="sea-rays"></div>${layer('layer-seabed', '<path d="M-30 605q100-80 300-10t550-18v160H-30z" fill="#2a6a6a"/><path d="M55 700q-6-95 30-145m-18 80-32-45m47 14 30-39m589 135q18-93-12-163m12 82 32-44m-41 1-25-33" stroke="#81a99a" stroke-width="9" stroke-linecap="round" fill="none"/>')}${layer('layer-fish',fish)}<img class="scene-whale scene-puppet" src="assets/whale-puppet.svg" alt="在海里游动的小鲸鱼"><div class="scene-jellyfish"><span></span><i></i><i></i><i></i></div><div class="scene-bubbles">${Array.from({length:11},(_,i)=>`<i style="left:${7+(i*29)%88}%;--delay:${-i*1.3}s;--duration:${7+i%5}s;--size:${4+i%4*3}px"></i>`).join('')}</div>`;
  } else if (theme === 'kite') {
    content = `${cloudLayer}<div class="scene-sun"></div>${ground}${layer('layer-kite',kite)}${foreground}<img class="scene-fox scene-puppet" src="assets/fox-puppet.svg" alt="草地上的小狐狸"><div class="scene-petals">${Array.from({length:9},(_,i)=>`<i style="left:${10+i*10}%;--delay:${-i*2.3}s">✿</i>`).join('')}</div>`;
  } else {
    content = `${starLayer}${layer('layer-moon',moon)}${cloudLayer}${ground}${foreground}<div class="scene-window"><i></i><i></i></div><img class="scene-rabbit scene-puppet" src="assets/rabbit-puppet.svg" alt="月夜里会轻轻摇动的小兔子"><div class="scene-fireflies">${Array.from({length:9},(_,i)=>`<i style="left:${15+(i*17)%70}%;top:${54+(i*13)%34}%;--delay:${-i*.9}s"></i>`).join('')}</div>`;
  }
  world.innerHTML = content;
  container.append(world);
  const puppet = container.querySelector('.scene-puppet');
  if (puppet) {
    puppet.tabIndex = 0;
    puppet.setAttribute('role','button');
    puppet.setAttribute('aria-label', theme==='ocean'?'点一点小鲸鱼':theme==='kite'?'点一点小狐狸':'点一点小兔子');
    const tap = () => {puppet.classList.remove('puppet-tapped');void puppet.offsetWidth;puppet.classList.add('puppet-tapped');};
    puppet.addEventListener('click',tap);
    puppet.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();tap();}});
  }
  container.onpointermove = event => {
    if (event.pointerType==='touch') return;
    const rect = container.getBoundingClientRect();
    world.style.setProperty('--look-x', ((event.clientX-rect.left)/rect.width-.5)*7+'deg');
    world.style.setProperty('--look-y', -((event.clientY-rect.top)/rect.height-.5)*5+'deg');
  };
  container.onpointerleave = () => {world.style.setProperty('--look-x','0deg');world.style.setProperty('--look-y','0deg');};
}
