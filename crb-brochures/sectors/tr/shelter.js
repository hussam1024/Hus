// Barınma ve Gıda Dışı Malzemeler broşürünün Türkçe metni (../shelter.js üzerine birleştirilir).
module.exports = {
  name: 'Barınma ve Gıda Dışı Malzemeler', file: 'CRB-Shelter-NFI-TR',
  en: 'المأوى والمواد غير الغذائية',
  cover: { h1: 'Barınma', h1Size: '32pt', h2: 've Gıda Dışı Malzemeler', h2Size: '16pt' },
  back: {
    text: 'Barınma alanında insani koordinasyon sistemi içinde; yerel, bölgesel ve uluslararası bağışçılar ve kuruluşlarla ortaklık hâlinde çalışıyoruz.',
    roles: [
      { title: 'Teknik Çalışma Grubu – Barınma Kümesi', desc: 'Ortak çalışma araçlarının geliştirilmesine teknik katkı' },
      { title: 'BM OCHA ve İnsani Yardım Kümeleri', desc: 'Kümelerde ve teknik komitelerde aktif katılım' },
    ],
  },
  story: {
    headline: 'Sürdürülebilir Bir Konut, Marib Kamplarında Ali ve Ailesine İstikrar Getirdi',
    paras: [
      'Marib ilindeki bir kampta yaşayan bedensel engelli Ali, altı kişilik ailesiyle birlikte sert kış soğuğuna ve kavurucu yaz sıcağına karşı neredeyse hiç koruma sağlamayan yıpranmış bir çadırda kalıyordu.',
      'Coalition of Relief and Building (CRB), Ali’nin ve benzer durumdaki ailelerin ihtiyacına yanıt olarak; tuğla ve betonarmeden inşa edilen, iki oda, banyo ve mutfaktan oluşan, engelli bireylerin ihtiyaçlarına uygun sürdürülebilir bir konut sağladı. Proje, Dünya Müslüman Gençlik Asamblesi (WAMY) tarafından finanse edildi.',
    ],
    quotes: [
      { text: 'Çok zor günler geçirdim. Kışın dondurucu soğuğu iliklerime işliyordu; uyumadan önce bütün kalın kıyafetlerimi giymek zorunda kalıyordum.', size: null },
      { text: 'Bu eve taşındıktan sonra hayatım tamamen değişti. Sanki hiç uyanmak istemediğim bir rüyadayım. Artık ne soğuktan ne de kavurucu sıcaktan şikâyetçiyim; bugün ailemle birlikte kendimi güvende ve huzurlu hissediyorum.', size: null, cite: 'Ali, faydalanıcı – Marib' },
    ],
  },
  overview: {
    title: 'Barınma ve Gıda Dışı<br>Malzemeler (S/NFI)', titleSize: '15.5pt', kicker: 'Acil ve Sürdürülebilir Barınmada 10 Yıl',
    intro: 'Coalition of Relief and Building (CRB), son on yılda insani krizlerden etkilenen en kırılgan kesimlere barınma desteği sağladı. Aileleri korumayı ve istikrarlarını güçlendirmeyi amaçlayan acil ve sürdürülebilir barınma projelerinde özel ihtiyaçları olan bireylere ve kırılgan topluluklara öncelik verildi.',
    stats: [{ label: 'Kalıcı Konut Birimi' }, { label: 'Yıllık Hizmet' }],
    photo: { cap: 'Özel ihtiyaçları olan bireyler için konutlar' },
  },
  programs: [{ name: 'Acil Barınma' }, { name: 'Sürdürülebilir Barınma' }],
  middle: {
    blocks: [{
      title: 'Acil Barınma Projeleri', sub: 'Korumayı ve onuru gözeten acil çözümler',
      text: 'Acil insani müdahale kapsamında CRB, kırılgan ve yerinden edilmiş ailelere kriz dönemlerinde koruma ve onurlu bir yaşam sağlayan geçici çözümler sunan çok sayıda müdahale gerçekleştirdi. Bu müdahaleler, yerinden edilme alanlarında ve en çok etkilenen bölgelerde acil barınma malzemesi dağıtımını ve temel barınma ekipmanı teminini kapsıyor.',
      items: [
        { name: 'Acil barınma malzemesi dağıtımı', note: 'Etkilenen ailelere barınma kitleri' },
        { name: 'Geçici kamp kurulumu' },
      ],
    }],
    grid: { items: [{ cap: 'Acil kamp kurulumu' }, { cap: 'Barınma kiti dağıtımı' }, { cap: 'Acil barınma' }] },
  },
  left: {
    blocks: [{
      title: 'Sürdürülebilir Barınma Projeleri', sub: 'Acil yardımdan sürdürülebilir kalkınmaya',
      text: 'CRB; en kırılgan aileler ve özel ihtiyaçları olan bireyler için kalıcı konut birimleri ve tüm hizmetleri bulunan köyleri kapsayan sürdürülebilir konut projeleri uyguladı. Amaç, geçim istikrarını güçlendirmek ve ailenin geçimini sağlayanları ekonomik olarak güçlendirmekti.',
      items: [
        { name: '79 konut birimi', note: 'Özel ihtiyaçları olan bireyler için' },
        { name: 'Örnek yerleşim köyleri', note: '254 konut birimi' },
      ],
    }],
    grid: { items: [{ cap: 'Konut kompleksinin havadan görünümü' }, { cap: 'Yerleşim köyleri' }, { cap: 'Özel ihtiyaçları olan bireyler için evler' }] },
    sdg: { text: 'En kırılgan ailelerin istikrarını güçlendiren kalıcı konutlar.' },
  },
};
