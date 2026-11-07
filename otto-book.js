// A new Chinese telling inspired by StoryComet's publicly described premise.
// Not a transcription or translation of the original ten pages.
export const ottoBook = {
  id:'demo-otto', revision:3, title:'奥托和害羞的月亮',
  subtitle:'OTTO AND THE SHY MOON', author:'参考 StoryComet 故事设定 · 中文重新讲述',
  kind:'demo', theme:'otto', cover:'assets/otto-reference/cover.webp', lang:'zh-CN',
  description:'跟着一只红气球，去云朵后面，陪一陪害羞的月亮。',
  pages:[
    {scene:'window',title:'今晚，少了一点亮光',text:'晚安的钟声响了，小镇的窗户一扇扇亮起来。\n小熊奥托抬头看天空。星星都在，月亮却不见了。\n“月亮，你藏到哪里去了？”',caption:'点亮小窗，看看是谁还没有睡。'},
    {scene:'balloon',title:'一只红气球',text:'奥托把红围巾系好，握住一只红气球。\n风轻轻吹来，气球把他带离屋顶。\n小镇越来越小，他的勇气却一点点变大。',caption:'轻点气球，看风把奥托托高一点。'},
    {scene:'rooftops',title:'屋顶上的小猫',text:'奥托飘过一排排屋顶。暖暖的窗光，像小镇给夜晚写的信。\n烟囱边的小猫竖起耳朵。\n“喵，抬头看看吧。月亮也许在更高的地方。”',caption:'碰一下小猫，和它打个招呼。'},
    {scene:'clouds',title:'云朵的软软阶梯',text:'奥托飘进云海。云朵像软软的枕头，轻轻擦过他的脚。\n“借过一下，我想找月亮。”\n风把云推开，露出一条银蓝色的小路。',caption:'轻点云朵，让它为小熊让一让路。'},
    {scene:'owl',title:'树上的猫头鹰',text:'一棵高高的树旁，猫头鹰轻轻转过头。\n“别着急，奥托。有时候，安静的朋友也需要一句问候。”\n奥托点点头，把准备好的晚安，放在了心里。',caption:'轻点猫头鹰，听听夜晚的小秘密。'},
    {scene:'stars',title:'跟着星星走',text:'一颗小星星眨眨眼，落在奥托身旁。\n奥托朝它挥手，继续向更高的云飘去。\n一路闪烁的小星星，像一串小小的路灯，陪着他往前走。',caption:'碰一下星星，让夜空回应你的问候。'},
    {scene:'shy',title:'躲在云后的月亮',text:'奥托停在云边，看见一弯藏起来的金光。\n“没关系，我陪你。你可以先露出一点点。”\n月亮听见了。云朵后面，慢慢探出一个小小的微笑。',caption:'拨开云朵，送给月亮一个温柔的招呼。'},
    {scene:'glow',title:'把笑容借给夜晚',text:'月亮慢慢走出云朵。金光落在奥托的围巾上，也落进小镇的窗。\n奥托笑了，月亮也笑了。\n有人陪着的时候，试一试就没有那么难。',caption:'点一下月亮，让她的光温柔地散开。'},
    {scene:'homeward',title:'顺着月光回家',text:'红气球顺着晚风，轻轻往下落。\n屋顶、小路和小花园，都披上了月光。\n奥托回头挥手：“明天见，我会记得向你说晚安。”',caption:'点亮小镇的窗，给奥托留一盏回家的灯。'},
    {scene:'goodnight',title:'晚安，月亮。晚安，你',text:'奥托躺进被窝，红气球靠在床边。\n月亮安静地守在窗外，星星也慢慢眨着眼。\n晚安，奥托。晚安，月亮。也晚安，正在听故事的你。',caption:'轻触月亮，把最后一点星光放进梦里。'}
  ].map(p=>({...p,image:'assets/otto.svg',illustration:true})),page:0,favorite:false,added:0
};
