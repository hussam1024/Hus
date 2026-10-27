// Gıda Güvenliği ve Geçim Kaynakları broşürünün Türkçe metni.
// ../food.js üzerine sırayla birleştirilir – rakamlar, fotoğraflar ve ikonlar Arapça dosyadan gelir.
module.exports = {
  name: 'Gıda Güvenliği ve Geçim Kaynakları', file: 'CRB-FSL-TR',
  en: 'الأمن الغذائي وسبل العيش',
  cover: { h1: 'Gıda Güvenliği', h1Size: '24pt', h2: 've Geçim Kaynakları', h2Size: '17pt' },
  back: {
    text: 'Gıda güvenliği alanında insani koordinasyon sistemi içinde; yerel, bölgesel ve uluslararası bağışçılar ve kuruluşlarla ortaklık hâlinde çalışıyoruz.',
    roles: [
      { title: 'Gıda Güvenliği ve Tarım Kümesi – Marib Bölgesi Eş Başkanı', desc: 'Marib bölgesinde kümenin eş liderliği' },
      { title: 'Entegre Gıda Güvenliği Aşama Sınıflandırması', desc: '2025 IPC analizine teknik katılım' },
    ],
  },
  story: {
    headline: 'Küçük Destek, Büyük Etki:<br>Amina’nın CRB ve YHF ile Hikâyesi',
    paras: [
      'Elli yedi yaşında dul ve beş çocuk annesi Amina Ahmed, çatışmalar köyüne yaklaşınca Raymah ilindeki evini terk etmek zorunda kaldı. Çocuklarıyla birlikte Marib’deki Jaw Al-Naseem Kampı’nda bir çadıra yerleşti; ardından seller, ellerinde kalan son umudu da alıp götürdü.',
      'Daha sonra, Yemen İnsani Yardım Fonu (YHF) tarafından finanse edilen ve Coalition of Relief and Building (CRB) tarafından uygulanan acil gıda yardımı projesinden nakdi destek aldı. Bu destekle un ve küçük bir tandır satın aldı; çocukları için yeniden kendi elleriyle ekmek pişirmeye başladı.',
      'Amina bugün aynı destekle yiyecek, su ve çocuklarının bazı ihtiyaçlarını karşılıyor. Onun hikâyesi, basit bir insani yardımın bir kadına onurunu geri kazandırabileceğinin ve ona yeniden başlama fırsatı verebileceğinin canlı bir kanıtı.',
    ],
    quotes: [
      { text: 'Kendimi yeniden anne gibi hissettim… Var olduğumu, kendi ayaklarım üzerinde durabildiğimi hissettim.', cite: 'Amina Ahmed, Jaw Al-Naseem Kampı – Marib' },
      { text: 'Artık kimseden yardım istemek zorunda değilim… Başım dik, çocuklarım da karınları tok uyuyor.', size: null },
    ],
  },
  overview: {
    title: 'Gıda Güvenliği ve<br>Geçim Kaynakları (FSL)', titleSize: '15.5pt', kicker: 'Gıda Müdahalesinde 10 Yıl 2016 – 2025',
    intro: 'Coalition of Relief and Building (CRB), son on yılda gıda güvenliği ve geçim kaynakları alanında bir dizi insani yardım ve kalkınma projesi hayata geçirdi. Acil, mevsimsel ve sürdürülebilir müdahalelerle Yemen’in 19 ilindeki en kırılgan kesimlere ulaştı.',
    stats: [{ label: 'İlde Faaliyet' }, { label: 'Yıllık Hizmet' }],
    photo: { cap: 'Gıda kolisi dağıtımı' },
  },
  programs: [{ name: 'Acil Gıda' }, { name: 'Mevsimsel Gıda' }, { name: 'Ekonomik Güçlendirme' }],
  middle: {
    blocks: [
      {
        title: 'Acil Gıda Projeleri', sub: 'Hayat kurtaran nakdi ve ayni yardımlar',
        text: 'En kırılgan ailelerin gıda ihtiyaçlarına, özellikle yerinden edilme, sel ve ani kriz durumlarında hızlı müdahaleye odaklanan bu projeler; hayat kurtarmaya ve gıda güvensizliğinin etkilerini hafifletmeye katkı sağladı.',
        photos: [{ cap: 'Nakdi yardım dağıtımı' }, { cap: 'Hazır yemek dağıtımı' }],
      },
      {
        title: 'Mevsimsel Gıda Projeleri', sub: 'Ramazan ve Kurban Bayramı dönemleri',
        text: 'Ramazan ayında ve Kurban Bayramı’nda yerinden edilmiş ve kırılgan ailelere gıda malzemesi ve kurban eti dağıtımı.',
        cards: [{ name: 'Ramazan gıda kolisi' }, { name: 'Kurban eti dağıtımı' }],
      },
    ],
  },
  left: {
    blocks: [{
      title: 'Ekonomik Güçlendirme Projeleri', sub: 'Mesleki eğitim ve geçim kaynakları',
      text: 'Son üç yılda CRB, faaliyetlerini kademeli olarak geçim kaynaklarını destekleyen programlara yöneltti. Bu programlar ailelere, genç erkeklere ve genç kadınlara yardıma bağımlılıktan kendi kendine yetebilmeye geçme ve istikrarlı gelir sağlayan küçük işletmeler kurma fırsatı sunuyor.',
      checks: ['Mesleki ve girişimcilik eğitimi', 'Küçük üretim ekipmanı temini', 'Küçük aile işletmelerine destek', 'Çiftçilere, kadınlara ve gençlere destek'],
    }],
    grid: { items: [{ cap: 'Çiftçilere destek' }, { cap: 'Mesleki eğitim' }, { cap: 'Ekonomik güçlendirme kitleri' }, { cap: 'Gençlere beceri eğitimi' }] },
    sdg: { text: 'Acil yardımdan kendi kendine yetebilen ve dirençli toplumlara.' },
  },
};
