// Su, Sanitasyon ve Hijyen broşürünün Türkçe metni (../wash.js üzerine birleştirilir).
module.exports = {
  name: 'Su, Sanitasyon ve Hijyen', file: 'CRB-WASH-TR',
  en: 'المياه والصرف الصحي والنظافة الصحية',
  cover: { h1: 'Su, Sanitasyon', h1Size: '23pt', h2: 've Hijyen (WASH)', h2Size: '19pt' },
  back: {
    text: 'Su, sanitasyon ve hijyen alanında insani koordinasyon sistemi içinde; yerel, bölgesel ve uluslararası bağışçılar ve kuruluşlarla ortaklık hâlinde çalışıyoruz.',
    roles: [
      { title: 'BM OCHA ve İnsani Yardım Kümeleri', desc: 'Kümelerde ve teknik komitelerde aktif katılım' },
      { title: 'Yemen İnsani Yardım Fonu', desc: 'YHF’nin resmî uygulayıcı ortağı' },
    ],
  },
  story: {
    headline: 'Al-Qawz Al-Rumaila Kampı’na Umut – Marib',
    paras: [
      'Yerinden edilmiş kişilerin yaşadığı Al-Qawz Al-Rumaila kampında su, sakinler için büyük bir sorundu. Ali Sharqi ve ailesi 2017 yılının sonunda kampa geldiğinden beri, çocuklarını yolun tehlikelerine rağmen uzaktan su taşımaya göndermek zorunda kalıyordu.',
      'CARE, Coalition of Relief and Building (CRB) ile iş birliği içinde kampta su kuyusu açma projesi başlattı; ardından entegre bir su deposu kurularak su, kamp içindeki dağıtım noktalarına ulaştırıldı. Bu, kamp sakinlerinin hayatını köklü biçimde değiştirdi.',
    ],
    quotes: [
      { text: 'Projeden önce su getirmek için uzun mesafeler yürümek zorundaydık; bulduğumuz su temiz değildi ve bizi çok hasta ediyordu.', size: null },
      { text: 'Proje sayesinde artık doğrudan evlerimize ulaşan temiz bir su şebekemiz var. Ayrıca suyu temiz tutmayı ve hastalıklardan korunmayı öğreten hijyen bilinçlendirme kampanyalarından da yararlandık.', size: null, cite: 'Ali Sharqi, Al-Qawz Al-Rumaila Kampı – Marib' },
    ],
  },
  overview: {
    title: 'Su, Sanitasyon ve<br>Hijyen (WASH)', titleSize: '15.5pt', kicker: 'Su Güvenliğini Güçlendirmede 10 Yıl',
    intro: 'Coalition of Relief and Building (CRB), son on yılda hedef topluluklarda su ve sağlık güvenliğini güçlendirmek için çalıştı. Güvenli ve temiz suya erişimi sağlayan, hijyen ve halk sağlığı hizmetlerini iyileştiren acil ve kalkınma programlarında, yerinden edilme ve afetlerden etkilenen bölgelerdeki en kırılgan kesimlere özel önem verildi.',
    stats: [{ label: 'Kuyu Açma ve Rehabilitasyon Projesi' }, { label: 'Yıllık Hizmet' }],
    photo: { cap: 'Kule tipi su deposunun açılışı' },
  },
  programs: [{ name: 'Acil Su' }, { name: 'Sürdürülebilir Su' }],
  middle: {
    blocks: [{
      title: 'Acil Su Projeleri', sub: 'Hayat kurtaran, hastalıkları önleyen güvenli su',
      text: 'CRB; yerinden edilme bölgelerinde ve kamplarda temiz ve güvenli su dağıtarak, acil dağıtım noktaları kurarak hayat kurtarmaya ve salgın hastalıkların yayılmasını önlemeye katkı sağlayan acil müdahaleler gerçekleştirdi. Bunlara hijyen bilinçlendirme kampanyaları, hijyen kiti dağıtımı, suyun klorlanması ve toplum komitelerinin eğitimi eşlik etti.',
      items: [
        { name: 'Tankerle su temini' },
        { name: 'Sabit dağıtım noktaları', note: 'Güvenli içme suyu' },
        { name: 'Hijyen kiti dağıtımı' },
        { name: 'Su depoları ve tuvaletler' },
      ],
    }],
    grid: { items: [{ cap: 'Su temini projesi' }, { cap: 'Dağıtım noktalarının kurulması' }, { cap: 'Hijyen kiti dağıtımı' }] },
  },
  left: {
    blocks: [{
      title: 'Sürdürülebilir Su Projeleri', sub: 'Su ve sanitasyonda uzun vadeli çözümler',
      text: 'Ev sahibi topluluklar ve yerinden edilmiş kişiler için su kaynaklarının ve altyapının inşası ve rehabilitasyonu; toplumsal dayanıklılığı ve su kaynaklarının sürdürülebilirliğini güçlendiriyor.',
      items: [
        { name: 'Artezyen kuyusu açma ve rehabilitasyonu' },
        { name: 'Sığ (el kazması) kuyu açma' },
        { name: 'Kule tipi su deposu inşası' },
        { name: 'Su şebekesi bağlantıları' },
        { name: 'Kanalizasyon şebekeleri' },
      ],
    }],
    grid: { items: [{ cap: 'Artezyen kuyusu sondajı' }, { cap: 'Güneş enerjili su sistemi' }] },
    sdg: { text: 'Ev sahibi ve yerinden edilmiş topluluklar için güvenli ve sürdürülebilir su.' },
  },
};
