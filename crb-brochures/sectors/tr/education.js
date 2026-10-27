// Eğitim broşürünün Türkçe metni (../education.js üzerine birleştirilir).
module.exports = {
  name: 'Eğitim', file: 'CRB-Education-TR',
  en: 'التعليم',
  cover: { h1: 'Eğitim', h1Size: '40pt', h2: 'Çocuklar ve Gençler İçin<br>Öğrenme Fırsatları', h2Size: '13pt' },
  back: {
    text: 'Acil durumlarda eğitim alanında insani koordinasyon sistemi içinde; yerel, bölgesel ve uluslararası bağışçılar ve kuruluşlarla ortaklık hâlinde çalışıyoruz.',
    roles: [
      { title: 'Acil Durumlarda Eğitim Ulusal Ağı', desc: 'INEE’ye bağlı ulusal ağın aktif üyesi' },
      { title: 'BM OCHA ve İnsani Yardım Kümeleri', desc: 'Kümelerde ve teknik komitelerde aktif katılım' },
    ],
  },
  story: {
    headline: 'Çadırdan Sınıfa: Al-Zubairi Okulu, Al-Suwaida Kampındaki Çocuklara Umut Kapılarını Açıyor – Marib',
    paras: [
      'Marib ilindeki Al-Suwaida kampında yüzlerce çocuk, aşırı sıcak ve kum fırtınalarının hâkim olduğu zorlu koşullarda geçici çadırlarda eğitim görüyordu.',
      'Bu ihtiyaca yanıt olarak Coalition of Relief and Building (CRB), Türkiye Diyanet Vakfı’nın desteğiyle kamp içinde Al-Zubairi Örnek Okulu’nu inşa etti: Temel donanımlarla donatılmış 12 derslik, çocukların onurunu koruyan güvenli bir öğrenme ortamı sunuyor.',
    ],
    quotes: [
      { text: 'Eskiden çadırlarda ders görüyorduk, ama artık gerçek sınıflarımız, sıralarımız ve yazı tahtalarımız var… Derse odaklanabildiğimi ve daha iyi bir gelecek hayal edebildiğimi hissediyorum.', size: null },
      { text: 'Okulu asla aksatmayacağım; hayalimi gerçekleştirip doktor olacağım.', cite: 'Al-Anoud Othman, 11 yaşında' },
    ],
  },
  overview: {
    title: 'Eğitim Sektörü', kicker: 'Eğitime Destekte 10 Yıl 2016 – 2025',
    intro: 'Coalition of Relief and Building (CRB), son on yılda yerinden edilme ve afetlerden etkilenen bölgelere odaklanarak çocuklar ve gençler için öğrenme fırsatlarını artırmaya çalıştı. Acil ve sürdürülebilir projelerle öğrenme ortamı iyileştirildi, temel araç ve tesisler sağlandı.',
    stats: [{ label: 'Okul Çantası ve Forma Faydalanıcısı' }, { label: 'Yıllık Hizmet' }],
    photo: { cap: 'Okul çantası dağıtımı' },
  },
  programs: [{ name: 'Acil Eğitim' }, { name: 'Sürdürülebilir Eğitim' }],
  middle: {
    blocks: [{
      title: 'Acil Eğitim Projeleri', sub: 'Zor koşullarda eğitimin sürekliliği',
      text: 'CRB, en çok etkilenen bölgelerde çocukların eğitim ihtiyaçlarını karşılamak üzere alternatif ve geçici derslikler kurarak, okul çantası ve temel eğitim materyalleri sağlayarak eğitimin sürekliliğine katkıda bulundu.',
      items: [
        { name: 'Okul çantası ve forma' },
        { name: 'Geçici okullar', note: 'Alternatif derslikler' },
        { name: 'Eğitim amaçlı nakdi yardım' },
      ],
    }],
    grid: { items: [{ cap: 'Geçici derslikler' }, { cap: 'Okul çantası ve forma dağıtım etkinliği' }] },
  },
  left: {
    blocks: [{
      title: 'Sürdürülebilir Eğitim Projeleri', sub: 'Uygun ve kalıcı bir okul ortamı',
      text: 'CRB okullar inşa edip rehabilite ederek bunları mobilya ve eğitim malzemeleriyle donattı; böylece eğitimin kalitesini artırdı ve pek çok hedef bölgede çocuklar için uygun ve sürdürülebilir bir okul ortamı sağladı.',
      items: [
        { name: 'Okul inşası ve rehabilitasyonu' },
        { name: 'Okul mobilyası', note: 'Sıra ve yazı tahtası' },
        { name: 'Kızlar için eğitim merkezi' },
        { name: 'Gençler için Kod eğitim projesi' },
      ],
    }],
    grid: { items: [{ cap: 'Al-Zubairi Örnek Okulu' }, { cap: 'Okul projelerimizden' }] },
    sdg: { text: 'Etkilenen çocuklar için güvenli bir ortamda nitelikli ve kapsayıcı eğitim.' },
  },
};
