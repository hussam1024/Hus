// Koruma broşürünün Türkçe metni (../protection.js üzerine birleştirilir).
module.exports = {
  name: 'Koruma', file: 'CRB-Protection-TR',
  en: 'الحماية',
  cover: { h1: 'Koruma', h1Size: '40pt', h2: 'Çocuklara ve Kırılgan<br>Ailelere Destek', h2Size: '13pt' },
  back: {
    text: 'Koruma alanında insani koordinasyon sistemi içinde; yerel, bölgesel ve uluslararası bağışçılar ve kuruluşlarla ortaklık hâlinde çalışıyoruz.',
    roles: [
      { title: 'BM OCHA ve İnsani Yardım Kümeleri', desc: 'Kümelerde ve teknik komitelerde aktif katılım' },
      { title: 'Yemen İnsani Yardım Fonu', desc: 'YHF’nin resmî uygulayıcı ortağı' },
    ],
  },
  gallery: {
    title: 'Sahadan', sub: 'Koruma projelerimizden kareler',
    text: 'Çocukları ve kırılgan aileleri müdahalenin merkezine koyan, çeşitli ve hedefli toplumsal müdahaleler.',
    grid: { items: [
      { cap: 'Çocuklar için eğlence etkinlikleri' },
      { cap: 'Farkındalık oturumları' },
      { cap: 'Grup psikososyal destek' },
      { cap: 'Nakdi yardım' },
      { cap: 'Çadır ve hurma dağıtımı' },
    ] },
  },
  overview: {
    title: 'Koruma Sektörü', kicker: 'En Kırılganları Korumada 10 Yıl',
    intro: 'Coalition of Relief and Building (CRB), çocuklara ve kırılgan ailelere destek vermeye odaklanarak çeşitli ve hedefli toplumsal müdahalelerle en kırılgan kesimleri ve krizden etkilenen toplulukları korumaya katkı sağladı.',
    stats: [{ label: 'Hamiliği Üstlenilen Yetim' }, { label: 'Yıllık Hizmet' }],
    photo: { cap: 'Yetim hamiliği projesi' },
  },
  programs: [{ name: 'Acil Müdahale' }, { name: 'Psikososyal Destek' }, { name: 'Yetim Çocuklara Bakım' }],
  middle: {
    blocks: [
      {
        title: 'Acil Müdahale', sub: 've Nakdi Koruma',
        text: 'En kırılgan ailelere acil nakdi yardım, acil durumlarda tıbbi ve barınma malzemesi temini ve etkilenen ailelerin istikrarını sağlamak için kritik sağlık vakalarına sınırlı destek.',
        items: [
          { name: 'Barınma ve gıda müdahaleleri', note: 'Kırılgan vakalar için' },
          { name: 'Acil nakdi yardım', note: 'En kırılgan aileler için' },
          { name: 'Acil tıbbi vakalara destek' },
        ],
      },
      {
        title: 'Psikososyal Destek', sub: 'Toplum Temelli Koruma – TCDŞ',
        text: 'Kamplarda özellikle kadınlar ve çocuklar için dayanıklılığı ve iyileşmeyi güçlendiren psikososyal destek programları ile toplumsal koruma ve güçlendirme faaliyetleri.',
        items: [
          { name: 'Çocuklar için oyun alanları ve parklar' },
          { name: 'Çocuklar için eğlence ve eğitim etkinlikleri' },
          { name: 'Psikososyal destek oturumları', note: 'Kamplardaki kadın ve çocuklar için' },
        ],
      },
    ],
    grid: { items: [{ cap: 'Tıbbi vakalara destek' }, { cap: 'Park ve oyun alanı' }] },
  },
  left: {
    blocks: [{
      title: 'Yetim Çocuklara Bakım Projeleri', sub: 'Onurlu ve sürdürülebilir hamilik ve bakım',
      text: 'Yetimlere ve geçimini sağlayan kişiyi kaybetmiş ailelere yönelik sürekli insani programlar; ihtiyaç sahibi ailelere her gün ücretsiz ekmek dağıtımı gibi uygulamalarla gıda ve eğitim ihtiyaçlarını karşılayarak temel ihtiyaçlarına onurlu ve sürdürülebilir şekilde erişmelerini sağlıyor.',
      items: [
        { name: 'Yetim hamiliği', label: 'Yetim' },
        { name: 'Kıyafet (Kisve) projesi' },
        { name: 'Eğitim ve sağlık desteği' },
      ],
    }],
    grid: { items: [{ cap: 'Kıyafet projesi' }, { cap: 'Ailelere gıda desteği' }] },
  },
};
