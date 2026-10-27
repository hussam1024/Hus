// قطاع الحماية – حصاد 10 سنوات (صفحات 54–61 من التقرير)
// لا توجد قصة نجاح لهذا القطاع في التقرير؛ لذلك يعرض اللسان معرض صور "من الميدان".
const A = 'assets/protection/';
module.exports = {
  id: 'protection', name: 'الحماية', file: 'CRB-Protection',
  icon: 's-prot', en: 'PROTECTION',
  projects: 24, benef: 48810,
  cover: { photo: A + 'cover.jpg', pos: '50% 0%', h1: 'الحماية', h1Size: '44pt', h2: 'دعم الأطفال والأسر الضعيفة', h2Size: '15pt' },
  back: {
    text: 'نعمل ضمن منظومة التنسيق الإنساني لقطاع الحماية، وبالشراكة مع جهات مانحة ومنظمات محلية وإقليمية ودولية.',
    roles: [
      { ab: 'OCHA<br>Clusters', title: 'مكتب تنسيق الشؤون الإنسانية والكتل', desc: 'مشاركة فاعلة في الكلسترات واللجان الفنية' },
      { ab: 'YHF', g: 1, title: 'صندوق التمويل الإنساني اليمني', desc: 'شريك منفذ رسمي ضمن شركاء YHF' },
    ],
  },
  gallery: {
    title: 'من الميدان', sub: 'لقطات من مشاريع الحماية',
    text: 'تدخلات مجتمعية متعددة ومستهدفة، تضع الأطفال والأسر الضعيفة في صميم الاستجابة.',
    grid: { cls: 'wide g5', items: [
      { src: A + 'kids-play.jpg', pos: '50% 35%', cap: 'أنشطة ترفيهية للأطفال' },
      { src: A + 'women-session.jpg', cap: 'جلسات توعية' },
      { src: A + 'psych-session.jpg', cap: 'دعم نفسي جماعي' },
      { src: A + 'voucher.jpg', cap: 'مساعدات نقدية' },
      { src: A + 'tents-dates.jpg', pos: '50% 40%', cap: 'توزيع الخيام والتمور' },
    ] },
  },
  overview: {
    title: 'قطاع الحماية', kicker: 'عقد من حماية الفئات الأضعف 2016 – 2025',
    intro: 'سعى منتدى الإغاثة والبناء (CRB) إلى الإسهام في حماية الفئات الأكثر ضعفاً والمجتمعات المتضررة من الأزمات، من خلال تدخلات مجتمعية متعددة ومستهدفة، مع التركيز على دعم الأطفال والأسر الضعيفة.',
    stats: [{ icon: 'i-heart-hands', n: 1200, label: 'يتيماً مكفولاً' }, { icon: 'i-cal', n: 10, label: 'سنوات من العطاء' }],
    photo: { src: A + 'orphans.jpg', pos: '50% 50%', cap: 'مشروع كفالة الأيتام' },
  },
  programs: [
    { name: 'الاستجابة الطارئة', projects: 13, benef: 44567, color: '#00A54F' },
    { name: 'الدعم النفسي والاجتماعي', projects: 5, benef: 1220, color: '#F1701F' },
    { name: 'رعاية فاقدي المعيل', projects: 6, benef: 3023, color: '#F6A31B' },
  ],
  middle: {
    blocks: [
      {
        icon: 'i-cash', title: 'الاستجابة الطارئة', sub: 'والحماية النقدية', projects: 13, benef: 44567, kpis: false,
        text: 'مساعدات نقدية طارئة للأسر الأكثر ضعفاً، وتوفير مواد علاجية وإيوائية في حالات الطوارئ، إلى جانب دعم محدود للحالات الصحية الحرجة لضمان استقرار الأسر المتضررة.',
        items: [
          { icon: 'i-house', name: 'تدخلات إيوائية وغذائية', note: 'لحالات الضعف', projects: 6, benef: 26829 },
          { icon: 'i-cash', name: 'مساعدات نقدية عاجلة', note: 'للأسر الأكثر ضعفاً', projects: 5, benef: 17686 },
          { icon: 'i-pills', name: 'دعم الحالات المرضية الطارئة', projects: 2, benef: 52 },
        ],
      },
      {
        icon: 'i-heart-hands', color: 'o', title: 'الدعم النفسي والاجتماعي', sub: 'الحماية المجتمعية – GBV', projects: 5, benef: 1220, kpis: false,
        text: 'برامج دعم نفسي واجتماعي وأنشطة حماية وتمكين مجتمعي داخل المخيمات، تسهم في تعزيز الصمود والتعافي، خاصة للنساء والأطفال.',
        items: [
          { icon: 'i-park', name: 'مساحات لعب وحدائق للأطفال', projects: 3, benef: 700 },
          { icon: 'i-kids', name: 'أنشطة ترفيهية وتعليمية للأطفال', projects: 1, benef: 300 },
          { icon: 'i-heart-hands', name: 'جلسات دعم نفسي واجتماعي', note: 'للأطفال والنساء في المخيمات', projects: 1, benef: 220 },
        ],
      },
    ],
    grid: { cls: '', min: '24mm', items: [
      { src: A + 'child-meds.jpg', pos: '50% 45%', cap: 'دعم الحالات المرضية' },
      { src: A + 'playground.jpg', pos: '50% 60%', cap: 'حديقة ومساحة لعب' },
    ] },
  },
  left: {
    topbar: true,
    blocks: [{
      icon: 'i-heart-hands', color: 'o', title: 'رعاية الأطفال فاقدي المعيل', sub: 'كفالة ورعاية بكرامة واستدامة', projects: 6, benef: 3023, kpiBox: true,
      text: 'برامج إنسانية مستمرة في مجال كفالة الأيتام والأسر الفاقدة للمعيل، تضمن تلبية احتياجاتهم من الغذاء والتعليم، مثل توزيع الخبز اليومي المجاني للأسر الأشد احتياجاً، بما يضمن حصولهم على احتياجاتهم الأساسية بكرامة واستدامة.',
      items: [
        { icon: 'i-heart-hands', name: 'مشروع كفالة يتيم', projects: 3, benef: 1200, label: 'يتيم' },
        { icon: 'i-shirt', name: 'مشروع كسوة', projects: 1, benef: 1150 },
        { icon: 'i-book', name: 'رعاية تعليمية وصحية', projects: 2, benef: 673 },
      ],
    }],
    grid: { cls: 'one r2', items: [
      { src: A + 'clothes.jpg', pos: '50% 40%', cap: 'مشروع الكسوة' },
      { src: A + 'food-line.jpg', pos: '50% 50%', cap: 'الدعم الغذائي للأسر' },
    ] },
  },
};
